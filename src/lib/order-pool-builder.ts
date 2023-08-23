import { Buffer } from 'buffer'
import Decimal from 'decimal.js'

import {
  useAddressStore,
  useBtcJsStore,
  useCredentialsStore,
  useNetworkStore,
} from '@/store'
import { getOneBrc20 } from '@/queries/orders-api'
import {
  type SimpleUtxoFromMempool,
  getTxHex,
  getUtxos2,
} from '@/queries/proxy'
import { type TradingPair } from '@/data/trading-pairs'
import { change, raise } from './helpers'
import { getPoolPubKey } from '@/queries/pool'
import { calculatePsbtFee } from './helpers'

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

export async function buildClaimBtcPsbt({
  psbt,
  pubKey,
}: {
  psbt: string
  pubKey: Buffer
}) {
  const btcjs = window.bitcoin
  const address = useAddressStore().get!

  const claim = btcjs.Psbt.fromHex(psbt)

  // Add change output
  await change({ psbt: claim, pubKey })
  console.log({ claim })

  return claim
}

export async function buildClaimPsbt({
  btcMsPsbtRaw,
  ordinalMsPsbtRaw,
  pubKey,
}: {
  btcMsPsbtRaw: string
  ordinalMsPsbtRaw: string
  pubKey: Buffer
}) {
  const btcjs = useBtcJsStore().get ?? raise('Btc library not loaded.')

  const claim = btcjs.Psbt.fromHex(ordinalMsPsbtRaw)
  const btcPsbt = btcjs.Psbt.fromHex(btcMsPsbtRaw)

  // Add BTC input
  claim.addInput({
    hash: btcPsbt.txInputs[0].hash,
    index: btcPsbt.txInputs[0].index,
    witnessUtxo: btcPsbt.data.inputs[0].witnessUtxo,
  })

  // Add BTC output
  claim.addOutput(btcPsbt.txOutputs[0])

  console.log({
    size1: (claim.data.globalMap.unsignedTx as any).tx.virtualSize(),
  })
  // Add change output
  await change({ psbt: claim, pubKey })
  console.log({ claim })
  console.log({
    size2: (claim.data.globalMap.unsignedTx as any).tx.virtualSize(),
  })

  return claim
}
