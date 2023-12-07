import {
  useBtcJsStore,
  useConnectionStore,
  useDummiesStore,
  useNetworkStore,
} from '@/store'
import { exclusiveChange, safeOutputValue } from './build-helpers'
import {
  DEBUG,
  DUMMY_UTXO_VALUE,
  DUST_UTXO_VALUE,
  EXTRA_INPUT_MIN_VALUE,
  ONE_SERVICE_FEE,
  SELL_SERVICE_FEE,
  SERVICE_LIVENET_ADDRESS,
  SERVICE_LIVENET_RDEX_ADDRESS,
  SERVICE_TESTNET_ADDRESS,
  SIGHASH_ALL_ANYONECANPAY,
  SIGHASH_SINGLE_ANYONECANPAY,
  USE_UTXO_COUNT_LIMIT,
} from '@/data/constants'
import {
  constructBidPsbt,
  getListingUtxos,
  getOneBrc20,
  getOneOrder,
  getSellFees,
} from '@/queries/orders-api'
import { getUtxos, type SimpleUtxoFromMempool, getTxHex } from '@/queries/proxy'
import { type TradingPair } from '@/data/trading-pairs'
import { SIGHASH_NONE_ANYONECANPAY } from '../data/constants'

export async function buildAskLimit({
  total,
  amount,
  selectedPair,
}: {
  total: number
  amount: number
  selectedPair: TradingPair
}) {
  const networkStore = useNetworkStore()
  const btcjs = useBtcJsStore().get!
  const address = useConnectionStore().getAddress

  // Get address
  // Step 1: Get the ordinal utxo as input
  // if testnet, we use a cardinal utxo as a fake one
  let ordinalUtxo: SimpleUtxoFromMempool
  if (networkStore.network === 'testnet') {
    const cardinalUtxo = await getUtxos(address).then((result) => {
      // choose the smallest utxo, but bigger than 600
      const smallOne = result.reduce((prev, curr) => {
        if (
          (curr.satoshis < prev.satoshis && curr.satoshis > 600) ||
          (prev && prev.satoshis <= 600)
        ) {
          return curr
        } else {
          return prev
        }
      }, result[0])

      return smallOne
    })

    if (!cardinalUtxo) {
      throw new Error('no utxo')
    }

    ordinalUtxo = cardinalUtxo
  } else {
    let transferable = await getOneBrc20({
      tick: selectedPair.fromSymbol,
      address,
    }).then((brc20Info) => {
      // choose a real ordinal with the right amount, not the white amount (Heil Uncle Roger!)
      return brc20Info.transferBalanceList.find(
        (brc20) => Number(brc20.amount) === amount
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
  }

  // fetch and decode rawTx of the utxo
  const rawTx = await getTxHex(ordinalUtxo.txId)
  // decode rawTx
  const ordinalPreTx = btcjs.Transaction.fromHex(rawTx)
  const ordinalDetail = ordinalPreTx.outs[ordinalUtxo.outputIndex]
  const ordinalValue = ordinalDetail.value

  // build psbt
  const ask = new btcjs.Psbt({
    network: btcjs.networks[networkStore.btcNetwork],
  })

  for (const output in ordinalPreTx.outs) {
    try {
      ordinalPreTx.setWitness(parseInt(output), [])
    } catch (e: any) {}
  }

  ask.addInput({
    hash: ordinalUtxo.txId,
    index: ordinalUtxo.outputIndex,
    witnessUtxo: ordinalPreTx.outs[ordinalUtxo.outputIndex],
    sighashType:
      btcjs.Transaction.SIGHASH_SINGLE | btcjs.Transaction.SIGHASH_ANYONECANPAY,
  })

  // Step 2: Build output as what the seller want (BTC)
  ask.addOutput({
    address,
    value: safeOutputValue(total),
  })

  return {
    order: ask,
    type: 'ask',
    value: ordinalValue,
    amount,
    totalPrice: 0,
    networkFee: 0,
    serviceFee: 0,
    totalSpent: 0,
    fromSymbol: selectedPair.fromSymbol,
    toSymbol: selectedPair.toSymbol,
    fromValue: amount,
    toValue: safeOutputValue(total),
    observing: {
      txId: ordinalUtxo.txId,
      outputIndex: ordinalUtxo.outputIndex,
    },
  }
}

export async function buildBidLimit({
  total,
  coinAmount,
  inscriptionId,
  inscriptionNumber,
  selectedPair,
  poolOrderId,
}: {
  total: number
  coinAmount: number
  inscriptionId: string
  inscriptionNumber: string
  selectedPair: TradingPair
  poolOrderId?: string
}) {
  const networkStore = useNetworkStore()
  const orderNetwork = networkStore.network
  const btcNetwork = networkStore.btcNetwork
  const btcjs = window.bitcoin
  const address = useConnectionStore().getAddress
  const isPool = !!selectedPair.hasPool

  // new version of building bid
  // 1. we define a bid schema, ask api to build the psbt for us
  const bidSchema: {
    inputs: {
      type: 'dummy' | 'brc' | 'brc'
      value: number
      tick?: string
      address?: string
    }[]
    outputs: {
      type: 'dummy' | 'brc' | 'brc' | 'change'
      value: number
      tick?: string
      address?: string
    }[]
  } = {
    inputs: [],
    outputs: [],
  }
  // bidSchema.outputs.push({
  //   type: 'change',
  //   value: changeValue,
  //   address,
  // })

  // 2. build the transaction with the schema
  const constructInfo = await constructBidPsbt({
    network: orderNetwork,
    tick: selectedPair.fromSymbol,
    inscriptionId,
    inscriptionNumber,
    coinAmount,
    total,
    poolOrderId: poolOrderId as string,
    bidSchema,
  })

  const bid = btcjs.Psbt.fromHex(constructInfo.psbtRaw, {
    network: btcjs.networks[btcNetwork],
  })

  // 3. estimate how much we have to pay
  const extraInputValue = bid.txOutputs[2].value - total
  const { difference, fee: bidFee } = await exclusiveChange({
    psbt: bid,
    estimate: true,
    extraInputValue,
  })
  if (!difference) {
    throw new Error(
      'Change calculation failed, please contact customer service.'
    )
  }

  // 4. construct a tx to split such a utxo with the value of difference
  const payPsbt = new btcjs.Psbt()
  payPsbt.addOutput({
    address,
    value: safeOutputValue(difference),
  })
  const {
    feeb,
    fee: payFee,
    changeValue,
  } = await exclusiveChange({
    maxUtxosCount: USE_UTXO_COUNT_LIMIT,
    psbt: payPsbt,
  })

  const uploadFee = bidFee - (EXTRA_INPUT_MIN_VALUE - extraInputValue)

  return {
    order: bid,
    secondaryOrder: payPsbt,
    orderId: constructInfo.orderId,
    type: 'bid',
    feeb,
    networkFee: payFee + bidFee,
    mainFee: bidFee,
    secondaryFee: payFee,
    uploadFee,
    total,
    using: difference,
    fromSymbol: selectedPair.toSymbol, // reversed
    toSymbol: selectedPair.fromSymbol,
    fromValue: total,
    toValue: coinAmount,
    serviceFee: ONE_SERVICE_FEE * 2,
    totalPrice: total,
    totalSpent: difference + payFee,
    changeValue,
  }
}

export async function buildBuyTake({
  order,
  selectedPair,
}: {
  order: {
    coinRatePrice: number
    amount: number
    coinAmount: number
    orderId: string
    freeState?: number
  }
  selectedPair: TradingPair
}) {
  const address = useConnectionStore().getAddress
  const btcjs = useBtcJsStore().get!
  const btcNetwork = useNetworkStore().btcNetwork
  const dummiesStore = useDummiesStore()

  const isFree = order.freeState === 1

  // get sell psbt from order detail api
  const askPsbtRaw = await getOneOrder({
    orderId: order.orderId,
  }).then((order) => order.psbtRaw)

  const askPsbt = btcjs.Psbt.fromHex(askPsbtRaw, {
    network: btcjs.networks[btcNetwork],
  })

  const buyPsbt = new btcjs.Psbt({
    network: btcjs.networks[btcNetwork],
  })
  let totalInput = 0

  // Step 1: add 2 dummy inputs
  const dummyUtxos = dummiesStore.get!
  if (!dummyUtxos) {
    throw new Error(
      'Your account does not have 2 dummy UTXOs to proceed the transaction. Please click the top-right shield button to do the preparation.'
    )
  }
  for (const dummyUtxo of dummyUtxos) {
    const dummyTx = btcjs.Transaction.fromHex(dummyUtxo.txHex)
    const dummyInput = {
      hash: dummyUtxo.txId,
      index: dummyUtxo.outputIndex,
      witnessUtxo: dummyTx.outs[dummyUtxo.outputIndex],
      sighashType: btcjs.Transaction.SIGHASH_ALL,
    }
    buyPsbt.addInput(dummyInput)
    totalInput += dummyUtxo.satoshis
  }

  // Step 2: add placeholder 0-indexed output
  buyPsbt.addOutput({
    address,
    value: DUMMY_UTXO_VALUE * 2,
  })

  // Step 3: add ordinal output
  const ordValue = askPsbt.data.inputs[0].witnessUtxo!.value
  const ordOutput = {
    address,
    value: ordValue,
  }
  buyPsbt.addOutput(ordOutput)

  // Step 4: sellerInput, in
  const sellerInput = {
    hash: askPsbt.txInputs[0].hash,
    index: askPsbt.txInputs[0].index,
    witnessUtxo: askPsbt.data.inputs[0].witnessUtxo,
    finalScriptWitness: askPsbt.data.inputs[0].finalScriptWitness,
  }

  buyPsbt.addInput(sellerInput)
  totalInput += sellerInput.witnessUtxo!.value

  // Step 5: sellerOutput, in
  const sellerOutput = askPsbt.txOutputs[0]
  buyPsbt.addOutput(sellerOutput)

  // Step 6: service fee
  let serviceFee = 0
  if (isFree) {
    serviceFee = 0
  } else {
    const serviceAddress =
      btcNetwork === 'bitcoin'
        ? selectedPair.fromSymbol === 'rdex'
          ? SERVICE_LIVENET_RDEX_ADDRESS
          : SERVICE_LIVENET_ADDRESS
        : SERVICE_TESTNET_ADDRESS
    serviceFee = safeOutputValue(
      Math.max(2000, askPsbt.txOutputs[0].value * 0.01)
    )
    buyPsbt.addOutput({
      address: serviceAddress,
      value: serviceFee,
    })
  }

  // Step 7: add 2 dummies output for future use
  buyPsbt.addOutput({
    address,
    value: DUMMY_UTXO_VALUE,
  })
  buyPsbt.addOutput({
    address,
    value: DUMMY_UTXO_VALUE,
  })
  const newDummiesIndex = [
    buyPsbt.txOutputs.length - 2,
    buyPsbt.txOutputs.length - 1,
  ]
  const { fee } = await exclusiveChange({
    psbt: buyPsbt,
    maxUtxosCount: USE_UTXO_COUNT_LIMIT,
  })
  const totalSpent = sellerOutput.value + serviceFee + fee - ordValue

  return {
    order: buyPsbt,
    type: isFree ? 'free claim' : 'buy',
    orderId: order.orderId,
    totalPrice: sellerOutput.value,
    networkFee: fee,
    serviceFee,
    totalSpent,
    fromSymbol: selectedPair.toSymbol,
    toSymbol: selectedPair.fromSymbol,
    fromValue: sellerOutput.value,
    toValue: order.coinAmount,
    isFree,
    // observing: {
    //   txId: paymentUtxo.txId,
    //   outputIndex: paymentUtxo.outputIndex,
    // },
  }
}

export async function buildSellTake({
  total,
  amount,
  selectedPair,
}: {
  total: number
  amount: number
  selectedPair: TradingPair
}) {
  const networkStore = useNetworkStore()
  const address = useConnectionStore().getAddress
  const btcjs = useBtcJsStore().get!

  // Step 1: Get the ordinal utxo as input
  // if testnet, we use a cardinal utxo as a fake one
  let ordinalUtxo: SimpleUtxoFromMempool

  let transferable = await getOneBrc20({
    tick: selectedPair.fromSymbol,
    address,
  }).then((brc20Info) => {
    // if (DEBUG) {
    //   return brc20Info.transferBalanceList[0]
    // }
    // choose a real ordinal with the right amount, not the white amount (Heil Uncle Roger!)
    return brc20Info.transferBalanceList.find(
      (brc20) => Number(brc20.amount) === amount
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
  const sell = new btcjs.Psbt({
    network: btcjs.networks[networkStore.btcNetwork],
  })

  for (const output in ordinalPreTx.outs) {
    try {
      ordinalPreTx.setWitness(parseInt(output), [])
    } catch (e: any) {}
  }

  sell.addInput({
    hash: ordinalUtxo.txId,
    index: ordinalUtxo.outputIndex,
    witnessUtxo: ordinalPreTx.outs[ordinalUtxo.outputIndex],
    sighashType: SIGHASH_SINGLE_ANYONECANPAY,
  })

  // Step 2: Build output as what the seller want (BTC)
  sell.addOutput({
    address,
    value: safeOutputValue(total),
  })

  // Step 3: Add service fee
  let sellFees = await getSellFees()

  const { fee, feeb } = await exclusiveChange({
    psbt: sell,
    extraSize: 943,
    maxUtxosCount: USE_UTXO_COUNT_LIMIT,
    extraInputValue: -(sellFees.furtherFee + sellFees.platformFee),
    sighashType: SIGHASH_SINGLE_ANYONECANPAY,
    otherSighashType: SIGHASH_NONE_ANYONECANPAY,
    partialPay: true,
  })

  return {
    order: sell,
    type: 'sell',
    value: ordinalValue,
    totalPrice: 0,
    networkFee: fee + sellFees.furtherFee,
    selfFee: fee,
    networkFeeRate: feeb,
    serviceFee: sellFees.platformFee,
    totalSpent: fee + sellFees.platformFee,
    fromSymbol: selectedPair.fromSymbol,
    toSymbol: selectedPair.toSymbol,
    fromValue: amount,
    toValue: total,
    observing: {
      txId: ordinalUtxo.txId,
      outputIndex: ordinalUtxo.outputIndex,
    },
  }
}

// Claim whitelist reward, similar to buildBuyTake
export async function buildClaimTake({
  claimPsbtRaw,
}: {
  claimPsbtRaw: string
}) {
  const address = useConnectionStore().getAddress
  const btcjs = useBtcJsStore().get!
  const btcNetwork = useNetworkStore().btcNetwork
  const dummiesStore = useDummiesStore()

  // check if dummies is ready
  if (!dummiesStore.has) {
    throw new Error(
      'Your account does not have 2 dummy UTXOs to proceed the transaction. Please click the top-right shield button to do the preparation.'
    )
  }

  const claimPsbt = btcjs.Psbt.fromHex(claimPsbtRaw, {
    network: btcjs.networks[btcNetwork],
  })

  const takePsbt = new btcjs.Psbt({
    network: btcjs.networks[btcNetwork],
  })
  let totalInput = 0

  // Step 1: add 2 dummy inputs
  const dummyUtxos = dummiesStore.get!
  for (const dummyUtxo of dummyUtxos) {
    const dummyTx = btcjs.Transaction.fromHex(dummyUtxo.txHex)
    const dummyInput = {
      hash: dummyUtxo.txId,
      index: dummyUtxo.outputIndex,
      witnessUtxo: dummyTx.outs[dummyUtxo.outputIndex],
      sighashType: btcjs.Transaction.SIGHASH_ALL,
    }
    takePsbt.addInput(dummyInput)
    totalInput += dummyUtxo.satoshis
  }

  // Step 2: add placeholder 0-indexed output
  takePsbt.addOutput({
    address,
    value: DUMMY_UTXO_VALUE * 2,
  })

  // Step 3: add ordinal output
  const ordValue = claimPsbt.data.inputs[0].witnessUtxo!.value
  const ordOutput = {
    address,
    value: ordValue,
  }
  takePsbt.addOutput(ordOutput)

  // Step 4: sellerInput, in
  const sellerInput = {
    hash: claimPsbt.txInputs[0].hash,
    index: claimPsbt.txInputs[0].index,
    witnessUtxo: claimPsbt.data.inputs[0].witnessUtxo,
    finalScriptWitness: claimPsbt.data.inputs[0].finalScriptWitness,
  }

  takePsbt.addInput(sellerInput)
  totalInput += sellerInput.witnessUtxo!.value

  // Step 5: sellerOutput, in
  const sellerOutput = claimPsbt.txOutputs[0]
  takePsbt.addOutput(sellerOutput)

  // Step 6: service fee: skip

  // Step 7: add 2 dummies output for future use
  takePsbt.addOutput({
    address,
    value: DUMMY_UTXO_VALUE,
  })
  takePsbt.addOutput({
    address,
    value: DUMMY_UTXO_VALUE,
  })

  // Step 8: change
  await exclusiveChange({
    psbt: takePsbt,
  })

  return {
    order: takePsbt,
  }
}
