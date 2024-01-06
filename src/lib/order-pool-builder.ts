import { Buffer } from 'buffer'
import Decimal from 'decimal.js'

import { useBtcJsStore } from '@/stores/btcjs'
import { useConnectionStore } from '@/stores/connection'
import { useCredentialsStore } from '@/stores/credentials'
import { useNetworkStore } from '@/stores/network'
import { getOneBrc20 } from '@/queries/orders-api'
import { type SimpleUtxoFromMempool, getTxHex, getUtxos } from '@/queries/proxy'
import {
  getEventClaimFees,
  getPoolCredential,
  getRewardClaimFees,
} from '@/queries/pool'
import { type TradingPair } from '@/data/trading-pairs'
import { raise } from './helpers'
import { exclusiveChange, safeOutputValue } from './build-helpers'
import {
  BTC_POOL_MODE,
  MS_BRC20_UTXO_VALUE,
  RELEASE_TX_SIZE,
  SIGHASH_SINGLE_ANYONECANPAY,
  USE_UTXO_COUNT_LIMIT,
} from '@/data/constants'
import { toXOnly } from '@/lib/btc-helpers'

async function getBothPubKeys(type: 'btc' | 'brc20' = 'brc20') {
  const selfAddress = useConnectionStore().getAddress
  const credential = useCredentialsStore().getByAddress(selfAddress)
  const selfPubKey =
    credential?.publicKey ??
    raise(
      'No credential. Please try again or contact customer service for assistance.'
    )

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
  const address = useConnectionStore().getAddress

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
    throw new Error(
      'No suitable BRC20 tokens. Please ensure that you have enough of the inscribed BRC20 tokens.'
    )
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
    tapInternalKey: toXOnly(Buffer.from(useConnectionStore().getPubKey)),
  })

  // Step 2: Build BTC output for the pool
  const msPayment = await generateP2wshPayment()
  const multisigAddress =
    msPayment.address ??
    raise(
      'No multisig address. Please try again or contact customer service for assistance.'
    )
  addLiquidity.addOutput({
    address,
    value: safeOutputValue(total),
  })

  return {
    order: addLiquidity,
    type: 'add-liquidity',
    value: ordinalValue,
    amount,
    fromSymbol: selectedPair.fromSymbol,
    toSymbol: selectedPair.toSymbol,
    fromValue: amount,
    toValue: new Decimal(safeOutputValue(total)),
    fromAddress: address,
    toAddress: address,
  }
}

export async function buildAddBtcLiquidity({ total }: { total: Decimal }) {
  // There are 2 ways to add BTC liquidity
  // 1. PSBT mode: Create a transaction to separate the needed amount BTC Utxo from the wallet
  // then create the PSBT with the Utxo (first output of the previous separate tx) as input and MS address as BRC20 output
  // 2. Custody mode: Send the BTC to the exchange's service address

  const networkStore = useNetworkStore()
  const btcjs = useBtcJsStore().get!

  switch (BTC_POOL_MODE) {
    case 1:
      return await buildInPsbtMode(total)
    case 2:
      return await buildInCustodyMode(total)
    case 3:
      return await buildInCascadeMode(total)
    default:
      throw new Error('Invalid BTC_POOL_MODE')
  }
}

  // PSBT mode
  const address = useConnectionStore().getAddress

  let input
  let separatePsbt
  // 0. find out if there is an Utxo with exactly the right amount
  // if so, use it directly instead of separating
  const utxos = await getUtxos(address)
  const exactUtxo = utxos.find((utxo) => utxo.satoshis === Number(total))
  if (exactUtxo) {
    // fetch preTx
    const rawTx = await getTxHex(exactUtxo.txId)
    // decode rawTx
    const preTx = btcjs.Transaction.fromHex(rawTx)
    const detail = preTx.outs[exactUtxo.outputIndex]

    input = {
      hash: exactUtxo.txId,
      index: exactUtxo.outputIndex,
      witnessUtxo: detail,
      sighashType: SIGHASH_SINGLE_ANYONECANPAY,
    }
  } else {
    // 1. build the transaction to separate the needed amount BTC Utxo from the wallet
    separatePsbt = new btcjs.Psbt({
      network: btcjs.networks[btcNetwork],
    }).addOutput({
      address,
      value: safeOutputValue(total),
    })

    await exclusiveChange({
      psbt: separatePsbt,
      maxUtxosCount: USE_UTXO_COUNT_LIMIT,
    })

    // 2. create the PSBT with the Utxo (first output of the previous separate tx) as input and MS address as BRC20 output
    // get separate psbt's tx hash
    const separateTx = (separatePsbt.data.globalMap.unsignedTx as any).tx
    const txHash: string = (separateTx as any).getId()
    input = {
      hash: txHash,
      index: 0,
      witnessUtxo: separatePsbt.txOutputs[0],
      sighashType: SIGHASH_SINGLE_ANYONECANPAY,
      tapInternalKey: toXOnly(Buffer.from(useConnectionStore().getPubKey)),
    }
  }

  const msPayment = await generateP2wshPayment('btc')
  const multisigAddress =
    msPayment.address ??
    raise(
      'No multisig address. Please try again or contact customer service for assistance.'
    )
  const addBtcLiquidity = new btcjs.Psbt({
    network: btcjs.networks[btcNetwork],
  })
    .addInput(input)
    .addOutput({
      address: multisigAddress,
      value: MS_BRC20_UTXO_VALUE,
    })

  return {
    order: addBtcLiquidity,
    type: 'add-liquidity (BTC -> BRC20)',
    amount: new Decimal(safeOutputValue(total)),
    toAddress: multisigAddress,
    separatePsbt,
  }
}

async function buildInCustodyMode(total: Decimal) {
  const btcNetwork = useNetworkStore().btcNetwork
  const btcjs = useBtcJsStore().get!

  const serviceAddress = await getPoolCredential().then((credential) => {
    return credential.btcReceiveAddress
  })

  // build psbt
  const addBtcLiquidity = new btcjs.Psbt({
    network: btcjs.networks[btcNetwork],
  }).addOutput({
    address: serviceAddress,
    value: safeOutputValue(total),
  })

  await exclusiveChange({
    psbt: addBtcLiquidity,
  })

  return {
    order: addBtcLiquidity,
    type: 'add-liquidity (BTC -> BRC20)',
    amount: new Decimal(safeOutputValue(total)),
    toAddress: serviceAddress,
  }
}

async function buildInCascadeMode(total: Decimal) {
  const btcjs = useBtcJsStore().get!
  const btcNetwork = useNetworkStore().btcNetwork
  const address = useAddressStore().get!

  // Cascade mode is a combination of custody mode and psbt mode
  // We create the second tx first
  const serviceAddress = await getPoolCredential().then((credential) => {
    return credential.btcReceiveAddress
  })
  const child = new btcjs.Psbt({
    network: btcjs.networks[btcNetwork],
  })

  child.addOutput({
    address: serviceAddress,
    value: safeOutputValue(total),
  })

  // estimate miner fee
  const { fee } = await exclusiveChange({
    psbt: child,
    estimate: true,
    extraSize: 0,
  })
  console.log({ fee })

  const childNeededAmount = new Decimal(safeOutputValue(total)).plus(fee)
  // construct the parent tx to generate the needed amount utxo
  const parent = new btcjs.Psbt({
    network: btcjs.networks[btcNetwork],
  })
  parent.addOutput({
    address,
    value: safeOutputValue(childNeededAmount),
  })
  // change it
  await exclusiveChange({
    psbt: parent,
    sighashType: SIGHASH_ALL,
    maxUtxosCount: USE_UTXO_COUNT_LIMIT,
  })
  console.log({ parent })

  // get the needed utxo and add it to the child
  const neededUtxo = parent.txOutputs[0]
  // get parents' tx hash
  const parentTx = (parent.data.globalMap.unsignedTx as any).tx
  const parentTxHash: string = (parentTx as any).getId()
  console.log('est tx id', parentTxHash)

  child.addInput({
    hash: parentTxHash,
    index: 0,
    witnessUtxo: neededUtxo,
    sighashType: SIGHASH_ALL_ANYONECANPAY,
  })

  return {
    order: child,
    type: 'add-liquidity (BTC)',
    amount: new Decimal(safeOutputValue(total)),
    totalAmount: childNeededAmount,
    toAddress: serviceAddress,
    toSymbol: 'BTC',
    fromAddress: address,
    separatePsbt: parent,
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
    sighashType: SIGHASH_SINGLE_ANYONECANPAY,
    tapInternalKey: toXOnly(Buffer.from(useConnectionStore().getPubKey)),
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
    sighashType: SIGHASH_SINGLE_ANYONECANPAY,
    tapInternalKey: toXOnly(Buffer.from(useConnectionStore().getPubKey)),
  })

  // Add release output
  claim.addOutput(releasePsbt.txOutputs[0])

  // Add change output
  await exclusiveChange({
    psbt: claim,
    sighashType: SIGHASH_SINGLE_ANYONECANPAY,
    useSize: RELEASE_TX_SIZE,
  })

  return claim
}

export async function buildRewardClaim() {
  const networkStore = useNetworkStore()
  const btcjs = useBtcJsStore().get!

  const { feeAddress, rewardInscriptionFee, rewardSendFee } =
    await getRewardClaimFees()
  const totalFees = new Decimal(rewardInscriptionFee).plus(rewardSendFee)

  // build psbt
  const rewardClaimPsbt = new btcjs.Psbt({
    network: btcjs.networks[networkStore.btcNetwork],
  })
    .addOutput({
      address: feeAddress,
      value: safeOutputValue(rewardInscriptionFee),
    })
    .addOutput({
      address: feeAddress,
      value: safeOutputValue(rewardSendFee),
    })

  const { fee, feeb } = await exclusiveChange({
    psbt: rewardClaimPsbt,
    maxUtxosCount: USE_UTXO_COUNT_LIMIT,
    sighashType: SIGHASH_ALL,
  })

  return {
    order: rewardClaimPsbt,
    type: 'pool reward claiming',
    amount: new Decimal(safeOutputValue(totalFees)),
    toAddress: feeAddress,
    feeb,
    feeSend: rewardSendFee,
    feeInscription: rewardInscriptionFee,
  }
}

export async function buildEventClaim() {
  const networkStore = useNetworkStore()
  const btcjs = useBtcJsStore().get!

  const { feeAddress, rewardInscriptionFee, rewardSendFee } =
    await getEventClaimFees()
  const totalFees = new Decimal(rewardInscriptionFee).plus(rewardSendFee)

  // build psbt
  const eventClaimPsbt = new btcjs.Psbt({
    network: btcjs.networks[networkStore.btcNetwork],
  })
    .addOutput({
      address: feeAddress,
      value: safeOutputValue(rewardInscriptionFee),
    })
    .addOutput({
      address: feeAddress,
      value: safeOutputValue(rewardSendFee),
    })

  const { fee, feeb } = await exclusiveChange({
    psbt: eventClaimPsbt,
    maxUtxosCount: USE_UTXO_COUNT_LIMIT,
    sighashType: SIGHASH_ALL,
  })

  return {
    order: eventClaimPsbt,
    type: 'event reward claiming',
    amount: new Decimal(safeOutputValue(totalFees)),
    toAddress: feeAddress,
    feeb,
    feeSend: rewardSendFee,
    feeInscription: rewardInscriptionFee,
  }
}

export async function buildStandbyClaim() {
  const networkStore = useNetworkStore()
  const btcjs = useBtcJsStore().get!

  const { feeAddress, rewardInscriptionFee, rewardSendFee } =
    await getEventClaimFees()
  const totalFees = new Decimal(rewardInscriptionFee).plus(rewardSendFee)

  // build psbt
  const standbyClaimPsbt = new btcjs.Psbt({
    network: btcjs.networks[networkStore.btcNetwork],
  })
    .addOutput({
      address: feeAddress,
      value: safeOutputValue(rewardInscriptionFee),
    })
    .addOutput({
      address: feeAddress,
      value: safeOutputValue(rewardSendFee),
    })

  const { fee, feeb } = await exclusiveChange({
    psbt: standbyClaimPsbt,
    maxUtxosCount: USE_UTXO_COUNT_LIMIT,
    sighashType: SIGHASH_ALL,
  })

  return {
    order: standbyClaimPsbt,
    type: 'standby reward claiming',
    amount: new Decimal(safeOutputValue(totalFees)),
    toAddress: feeAddress,
    feeb,
    feeSend: rewardSendFee,
    feeInscription: rewardInscriptionFee,
  }
}

export async function buildRecoverPsbt({
  ordinalMsPsbtRaw,
  ordinalRecoverPsbtRaw,
}: {
  ordinalMsPsbtRaw: string
  ordinalRecoverPsbtRaw: string
}) {
  const btcjs = useBtcJsStore().get!

  const recover = btcjs.Psbt.fromHex(ordinalMsPsbtRaw)
  const releasePsbt = btcjs.Psbt.fromHex(ordinalRecoverPsbtRaw)

  // Add recover input
  recover.addInput({
    hash: releasePsbt.txInputs[0].hash,
    index: releasePsbt.txInputs[0].index,
    witnessUtxo: releasePsbt.data.inputs[0].witnessUtxo,
    partialSig: releasePsbt.data.inputs[0].partialSig,
    witnessScript: releasePsbt.data.inputs[0].witnessScript,
    sighashType: SIGHASH_SINGLE_ANYONECANPAY,
    tapInternalKey: toXOnly(Buffer.from(useConnectionStore().getPubKey)),
  })

  // Add recover output
  recover.addOutput(releasePsbt.txOutputs[0])

  // Add change output
  await exclusiveChange({
    psbt: recover,
    sighashType: SIGHASH_SINGLE_ANYONECANPAY,
    useSize: RELEASE_TX_SIZE,
  })

  return recover
}
