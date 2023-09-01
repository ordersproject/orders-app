import { Buffer } from 'buffer'
import Decimal from 'decimal.js'

import {
  useAddressStore,
  useBtcJsStore,
  useCredentialsStore,
  useNetworkStore,
} from '@/store'
import { getOneBrc20 } from '@/queries/orders-api'
import { type SimpleUtxoFromMempool, getTxHex, getUtxos } from '@/queries/proxy'
import { type TradingPair } from '@/data/trading-pairs'
import { raise } from './helpers'
import { change } from './build-helpers'
import { getPoolPubKey } from '@/queries/pool'

async function getBothPubKeys() {
  const selfAddress = useAddressStore().get!
  const credential = useCredentialsStore().getByAddress(selfAddress)
  const selfPubKey = credential?.publicKey ?? raise('no credential')

  const exchangePubKey = await getPoolPubKey()

  return {
    selfPubKey,
    exchangePubKey,
  }
}

export async function generateP2wshPayment() {
  const btcjs = useBtcJsStore().get!

  const { selfPubKey, exchangePubKey } = await getBothPubKeys()
  const pubkeys = [selfPubKey, exchangePubKey].map((hex) =>
    Buffer.from(hex, 'hex')
  )
  const redeem = btcjs.payments.p2ms({ m: 2, pubkeys })
  return btcjs.payments.p2wsh({ redeem })
}

export async function buildAddLiquidity({
  total,
  amount,
  selectedPair,
}: {
  total: Decimal
  amount: Decimal
  selectedPair: TradingPair
}) {
  const networkStore = useNetworkStore()
  const btcjs = useBtcJsStore().get!
  const address = useAddressStore().get!

  // Step 1: Get the ordinal utxo as input
  // if testnet, we use a cardinal utxo as a fake one
  let ordinalUtxo: SimpleUtxoFromMempool

  let transferable = await getOneBrc20({
    tick: selectedPair.fromSymbol,
    address,
  }).then((brc20Info) => {
    // choose a real ordinal with the right amount, not the white amount (Heil Uncle Roger!)
    return brc20Info.transferBalanceList.find(
      (brc20) => brc20.amount === amount.toString()
    )
  })
  if (!transferable) {
    throw new Error('No suitable BRC20 tokens')
  }

  // find out the ordinal utxo
  const ordinalTxId = transferable.inscriptionId.slice(0, -2)
  ordinalUtxo = {
    txId: ordinalTxId,
    satoshis: 546,
    outputIndex: 0,
    addressType: 2,
  }

  // fetch and decode rawTx of the utxo
  const rawTx = await getTxHex(ordinalUtxo.txId)
  // decode rawTx
  const ordinalPreTx = btcjs.Transaction.fromHex(rawTx)
  const ordinalDetail = ordinalPreTx.outs[ordinalUtxo.outputIndex]
  const ordinalValue = ordinalDetail.value

  // build psbt
  const addLiquidity = new btcjs.Psbt({
    network: btcjs.networks[networkStore.btcNetwork],
  })

  for (const output in ordinalPreTx.outs) {
    try {
      ordinalPreTx.setWitness(parseInt(output), [])
    } catch (e: any) {}
  }

  addLiquidity.addInput({
    hash: ordinalUtxo.txId,
    index: ordinalUtxo.outputIndex,
    witnessUtxo: ordinalPreTx.outs[ordinalUtxo.outputIndex],
    sighashType:
      btcjs.Transaction.SIGHASH_SINGLE | btcjs.Transaction.SIGHASH_ANYONECANPAY,
  })

  // Step 2: Build BTC output for the pool
  const msPayment = await generateP2wshPayment()
  const multisigAddress = msPayment.address ?? raise('no multisig address')
  console.log({ multisigAddress })
  addLiquidity.addOutput({
    address: multisigAddress,
    value: Number(total),
  })

  return {
    order: addLiquidity,
    type: 'add-liquidity',
    value: ordinalValue,
    amount,
    fromSymbol: selectedPair.fromSymbol,
    toSymbol: selectedPair.toSymbol,
    fromValue: amount,
    toValue: total,
    fromAddress: address,
    toAddress: multisigAddress,
  }
}

export async function buildClaimPsbt({
  btcMsPsbtRaw,
  ordinalMsPsbtRaw,
  ordinalReleasePsbtRaw,
  rewardPsbtRaw,
}: {
  btcMsPsbtRaw: string
  ordinalMsPsbtRaw: string
  ordinalReleasePsbtRaw: string
  rewardPsbtRaw: string
}) {
  const btcjs = useBtcJsStore().get!

  const claim = btcjs.Psbt.fromHex(ordinalMsPsbtRaw)
  const btcPsbt = btcjs.Psbt.fromHex(btcMsPsbtRaw)
  const releasePsbt = btcjs.Psbt.fromHex(ordinalReleasePsbtRaw)
  const rewardPsbt = btcjs.Psbt.fromHex(rewardPsbtRaw)

  // Add BTC input
  claim.addInput({
    hash: btcPsbt.txInputs[0].hash,
    index: btcPsbt.txInputs[0].index,
    witnessUtxo: btcPsbt.data.inputs[0].witnessUtxo,
    witnessScript: btcPsbt.data.inputs[0].witnessScript,
    partialSig: btcPsbt.data.inputs[0].partialSig,
    sighashType:
      btcjs.Transaction.SIGHASH_SINGLE | btcjs.Transaction.SIGHASH_ANYONECANPAY,
  })

  // Add BTC output
  claim.addOutput(btcPsbt.txOutputs[0])

  // Add release input
  claim.addInput({
    hash: releasePsbt.txInputs[0].hash,
    index: releasePsbt.txInputs[0].index,
    witnessUtxo: releasePsbt.data.inputs[0].witnessUtxo,
    partialSig: releasePsbt.data.inputs[0].partialSig,
    witnessScript: releasePsbt.data.inputs[0].witnessScript,
    sighashType:
      btcjs.Transaction.SIGHASH_SINGLE | btcjs.Transaction.SIGHASH_ANYONECANPAY,
  })

  // Add release output
  claim.addOutput(releasePsbt.txOutputs[0])

  console.log({ rewardPsbt })
  // Add reward input (already fully signed)
  claim.addInput({
    hash: rewardPsbt.txInputs[0].hash,
    index: rewardPsbt.txInputs[0].index,
    witnessUtxo: rewardPsbt.data.inputs[0].witnessUtxo,
    finalScriptWitness: rewardPsbt.data.inputs[0].finalScriptWitness,
    // partialSig: releasePsbt.data.inputs[0].partialSig,
    // sighashType:
    //   btcjs.Transaction.SIGHASH_SINGLE | btcjs.Transaction.SIGHASH_ANYONECANPAY,
  })

  // build reward output
  claim.addOutput(rewardPsbt.txOutputs[0])

  // Add change output
  await change({ psbt: claim })

  return claim
}
