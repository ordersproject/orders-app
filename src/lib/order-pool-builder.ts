import { Buffer } from 'buffer'
import Decimal from 'decimal.js'

import {
  useAddressStore,
  useBtcJsStore,
  useCredentialsStore,
  useNetworkStore,
} from '@/store'
import { getOneBrc20 } from '@/queries/orders-api'
import { type SimpleUtxoFromMempool, getTxHex } from '@/queries/proxy'
import { getPoolCredential } from '@/queries/pool'
import { type TradingPair } from '@/data/trading-pairs'
import { raise } from './helpers'
import { change } from './build-helpers'
import {
  BTC_POOL_MODE,
  MS_BRC20_UTXO_VALUE,
  SIGHASH_SINGLE_ANYONECANPAY,
} from '@/data/constants'

async function getBothPubKeys(type: 'btc' | 'brc20' = 'brc20') {
  const selfAddress = useAddressStore().get!
  const credential = useCredentialsStore().getByAddress(selfAddress)
  const selfPubKey = credential?.publicKey ?? raise('no credential')

  const exchangePubKey =
    type === 'brc20'
      ? (await getPoolCredential()).publicKey
      : (await getPoolCredential()).btcPublicKey

  return {
    selfPubKey,
    exchangePubKey,
  }
}

export async function generateP2wshPayment(type: 'btc' | 'brc20' = 'brc20') {
  const btcjs = useBtcJsStore().get!

  const { selfPubKey, exchangePubKey } = await getBothPubKeys(type)
  const pubkeys = [selfPubKey, exchangePubKey].map((hex) =>
    Buffer.from(hex, 'hex')
  )
  const redeem = btcjs.payments.p2ms({ m: 2, pubkeys })
  return btcjs.payments.p2wsh({ redeem })
}

export async function buildAddBrcLiquidity({
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

export async function buildAddBtcLiquidity({ total }: { total: Decimal }) {
  // There are 2 ways to add BTC liquidity
  // 1. PSBT mode: Create a transaction to separate the needed amount BTC Utxo from the wallet
  // then create the PSBT with the Utxo (first output of the previous separate tx) as input and MS address as BRC20 output
  // 2. Custody mode: Send the BTC to the exchange's service address

  const networkStore = useNetworkStore()
  const btcjs = useBtcJsStore().get!

  // Custody mode
  if (BTC_POOL_MODE === 2) {
    const serviceAddress = await getPoolCredential().then((credential) => {
      return credential.btcReceiveAddress
    })

    // build psbt
    const addBtcLiquidity = new btcjs.Psbt({
      network: btcjs.networks[networkStore.btcNetwork],
    }).addOutput({
      address: serviceAddress,
      value: Number(total),
    })

    const { fee } = await change({
      psbt: addBtcLiquidity,
    })

    return {
      order: addBtcLiquidity,
      type: 'add-liquidity (BTC -> BRC20)',
      amount: total,
      toAddress: serviceAddress,
    }
  }

  // PSBT mode
  const address = useAddressStore().get!
  // 1. build the transaction to separate the needed amount BTC Utxo from the wallet
  const separatePsbt = new btcjs.Psbt({
    network: btcjs.networks[networkStore.btcNetwork],
  }).addOutput({
    address,
    value: Number(total),
  })

  const { fee } = await change({
    psbt: separatePsbt,
  })

  const msPayment = await generateP2wshPayment('btc')
  const multisigAddress = msPayment.address ?? raise('no multisig address')

  // 2. create the PSBT with the Utxo (first output of the previous separate tx) as input and MS address as BRC20 output
  // get separate psbt's tx hash
  const separateTx = (separatePsbt.data.globalMap.unsignedTx as any).tx
  console.log({ separateTx })
  const txHash: string = (separateTx as any).getId()
  console.log({
    1: separateTx.getId(),
    2: separateTx.getHash().toString('hex'),
    3: separateTx.getHash(true).toString('hex'),
  })
  const addBtcLiquidity = new btcjs.Psbt({
    network: btcjs.networks[networkStore.btcNetwork],
  })
    .addInput({
      hash: txHash,
      index: 0,
      witnessUtxo: separatePsbt.txOutputs[0],
      sighashType: SIGHASH_SINGLE_ANYONECANPAY,
    })
    .addOutput({
      address: multisigAddress,
      value: MS_BRC20_UTXO_VALUE,
    })

  return {
    order: addBtcLiquidity,
    type: 'add-liquidity (BTC -> BRC20)',
    amount: total,
    toAddress: multisigAddress,
    separatePsbt,
  }
}

export async function buildReleasePsbt({
  btcMsPsbtRaw,
  ordinalMsPsbtRaw,
  ordinalReleasePsbtRaw,
}: {
  btcMsPsbtRaw: string
  ordinalMsPsbtRaw: string
  ordinalReleasePsbtRaw: string
}) {
  const btcjs = useBtcJsStore().get!

  const claim = btcjs.Psbt.fromHex(ordinalMsPsbtRaw)
  const btcPsbt = btcjs.Psbt.fromHex(btcMsPsbtRaw)
  const releasePsbt = btcjs.Psbt.fromHex(ordinalReleasePsbtRaw)

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

  // Add change output
  await change({ psbt: claim })

  return claim
}
