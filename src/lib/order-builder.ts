import {
  useAddressStore,
  useBtcJsStore,
  useDummiesStore,
  useNetworkStore,
} from '@/store'
import { calculatePsbtFee } from './helpers'
import {
  DUMMY_UTXO_VALUE,
  DUST_UTXO_VALUE,
  SERVICE_LIVENET_ADDRESS,
  SERVICE_TESTNET_ADDRESS,
} from '@/data/constants'
import {
  getBidCandidateInfo,
  getOneBrc20,
  getOneOrder,
} from '@/queries/orders-api'
import {
  getUtxos2,
  type SimpleUtxoFromMempool,
  getTxHex,
} from '@/queries/proxy'
import { type TradingPair } from '@/data/trading-pairs'

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
  const address = useAddressStore().get!

  // 获取地址
  // Step 1: Get the ordinal utxo as input
  // if testnet, we use a cardinal utxo as a fake one
  let ordinalUtxo: SimpleUtxoFromMempool
  if (networkStore.network === 'testnet') {
    const cardinalUtxo = await getUtxos2(address).then((result) => {
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
    value: total,
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
    toValue: total,
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
  const address = useAddressStore().get!
  const isPool = !!selectedPair.hasPool

  // Step 1. prepare bid from exchange
  const candidateInfo = await getBidCandidateInfo({
    network: orderNetwork,
    tick: selectedPair.fromSymbol,
    inscriptionId,
    inscriptionNumber,
    coinAmount,
    total,
    isPool,
    poolOrderId,
  })

  const exchange = btcjs.Psbt.fromHex(candidateInfo.psbtRaw, {
    network: btcjs.networks[btcNetwork],
  })

  const bid = new btcjs.Psbt({ network: btcjs.networks[btcNetwork] })
  let totalInput = 0

  const dummyUtxos = useDummiesStore().get!
  for (const dummyUtxo of dummyUtxos) {
    const dummyTx = btcjs.Transaction.fromHex(dummyUtxo.txHex)
    const dummyInput = {
      hash: dummyUtxo.txId,
      index: dummyUtxo.outputIndex,
      witnessUtxo: dummyTx.outs[dummyUtxo.outputIndex],
      sighashType:
        btcjs.Transaction.SIGHASH_ALL | btcjs.Transaction.SIGHASH_ANYONECANPAY,
    }
    bid.addInput(dummyInput)
    totalInput += dummyUtxo.satoshis
  }

  // Step 3: add placeholder 0-indexed output
  bid.addOutput({
    address,
    value: DUMMY_UTXO_VALUE * 2,
  })

  // Step 4: add ordinal output
  const ordValue = exchange.data.inputs[0].witnessUtxo!.value
  const ordOutput = {
    address,
    value: ordValue,
  }
  bid.addOutput(ordOutput)

  // Step 5: add exchange input and output
  const exchangeInput = {
    hash: exchange.txInputs[0].hash,
    index: exchange.txInputs[0].index,
    witnessUtxo: exchange.data.inputs[0].witnessUtxo,
    finalScriptWitness: exchange.data.inputs[0].finalScriptWitness,
  }
  bid.addInput(exchangeInput)
  totalInput += exchangeInput.witnessUtxo!.value
  console.log({ exchange })

  const exchangeOutput = exchange.txOutputs[0]
  bid.addOutput(exchangeOutput)

  // Step 6: service fee
  const serviceAddress =
    btcNetwork === 'bitcoin' ? SERVICE_LIVENET_ADDRESS : SERVICE_TESTNET_ADDRESS
  const serviceFee = Math.max(2000, exchangeOutput.value * 0.01)
  bid.addOutput({
    address: serviceAddress,
    value: serviceFee,
  })

  // Step 7: add 2 dummies output for future use
  bid.addOutput({
    address,
    value: DUMMY_UTXO_VALUE,
  })
  bid.addOutput({
    address,
    value: DUMMY_UTXO_VALUE,
  })

  // Step 8: add payment input
  const paymentUtxo = await getUtxos2(address).then((result) => {
    // choose the largest utxo
    const utxo = result.reduce((prev, curr) => {
      if (prev.satoshis > curr.satoshis) {
        return prev
      } else {
        return curr
      }
    })
    return utxo
  })

  if (!paymentUtxo) {
    throw new Error('no utxo')
  }

  // query rawTx of the utxo
  const rawTx = await getTxHex(paymentUtxo.txId)
  // decode rawTx
  const tx = btcjs.Transaction.fromHex(rawTx)

  // construct input
  const paymentInput = {
    hash: paymentUtxo.txId,
    index: paymentUtxo.outputIndex,
    witnessUtxo: tx.outs[paymentUtxo.outputIndex],
    sighashType:
      btcjs.Transaction.SIGHASH_ALL | btcjs.Transaction.SIGHASH_ANYONECANPAY,
  }

  bid.addInput(paymentInput)
  totalInput += paymentInput.witnessUtxo.value

  // Step 9: add change output
  const feeb = btcNetwork === 'bitcoin' ? 12 : 1
  const fee = calculatePsbtFee(feeb, bid)

  const totalOutput = bid.txOutputs.reduce(
    (partialSum, a) => partialSum + a.value,
    0
  )
  // postponer should be integer
  const spent = total + fee + serviceFee + DUMMY_UTXO_VALUE * 2
  const using = paymentInput.witnessUtxo.value
  const changeValue = using - spent
  if (changeValue < 0) {
    throw new Error('Insufficient balance')
  }
  // const changeValue = totalInput - totalOutput - fee

  const totalSpent = total + serviceFee + fee - ordValue

  bid.addOutput({
    address,
    value: changeValue,
  })

  return {
    order: bid,
    orderId: candidateInfo.orderId,
    type: 'bid',
    feeb,
    networkFee: fee,
    total,
    using,
    fromSymbol: selectedPair.toSymbol, // reversed
    toSymbol: selectedPair.fromSymbol,
    fromValue: total,
    toValue: coinAmount,
    serviceFee,
    totalPrice: total,
    totalSpent,
  }
}

export async function buildBuyTake({
  order,
  feeb,
  selectedPair,
}: {
  order: {
    coinRatePrice: number
    amount: number
    coinAmount: number
    orderId: string
    freeState?: number
  }
  feeb: number
  selectedPair: TradingPair
}) {
  const address = useAddressStore().get!
  const btcjs = useBtcJsStore().get!
  const btcNetwork = useNetworkStore().btcNetwork
  const dummiesStore = useDummiesStore()

  const isFree = order.freeState === 1

  // get sell psbt from order detail api
  const sellPsbtRaw = await getOneOrder({
    orderId: order.orderId,
  }).then((order) => order.psbtRaw)

  const sellPsbt = btcjs.Psbt.fromHex(sellPsbtRaw, {
    network: btcjs.networks[btcNetwork],
  })

  const buyPsbt = new btcjs.Psbt({
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
    buyPsbt.addInput(dummyInput)
    totalInput += dummyUtxo.satoshis
  }

  // Step 2: add placeholder 0-indexed output
  buyPsbt.addOutput({
    address,
    value: DUMMY_UTXO_VALUE * 2,
  })

  // Step 3: add ordinal output
  const ordValue = sellPsbt.data.inputs[0].witnessUtxo!.value
  const ordOutput = {
    address,
    value: ordValue,
  }
  buyPsbt.addOutput(ordOutput)

  // Step 4: sellerInput, in
  const sellerInput = {
    hash: sellPsbt.txInputs[0].hash,
    index: sellPsbt.txInputs[0].index,
    witnessUtxo: sellPsbt.data.inputs[0].witnessUtxo,
    finalScriptWitness: sellPsbt.data.inputs[0].finalScriptWitness,
  }

  buyPsbt.addInput(sellerInput)
  totalInput += sellerInput.witnessUtxo!.value

  // Step 5: sellerOutput, in
  const sellerOutput = sellPsbt.txOutputs[0]
  buyPsbt.addOutput(sellerOutput)

  // Step 6: service fee
  let serviceFee = 0
  if (isFree) {
    serviceFee = 0
  } else {
    const serviceAddress =
      btcNetwork === 'bitcoin'
        ? SERVICE_LIVENET_ADDRESS
        : SERVICE_TESTNET_ADDRESS
    serviceFee = Math.max(2000, sellPsbt.txOutputs[0].value * 0.01)
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

  // Step 8: add payment input
  const paymentUtxo = await getUtxos2(address).then((result) => {
    // choose the largest utxo
    const utxo = result.reduce((prev, curr) => {
      if (prev.satoshis > curr.satoshis) {
        return prev
      } else {
        return curr
      }
    })
    return utxo
  })

  if (!paymentUtxo) {
    throw new Error('no utxo')
  }

  // query rawTx of the utxo
  const rawTx = await getTxHex(paymentUtxo.txId)
  // decode rawTx
  const tx = btcjs.Transaction.fromHex(rawTx)

  // construct input
  const paymentInput = {
    hash: paymentUtxo.txId,
    index: paymentUtxo.outputIndex,
    witnessUtxo: tx.outs[paymentUtxo.outputIndex],
    sighashType: btcjs.Transaction.SIGHASH_ALL,
  }

  buyPsbt.addInput(paymentInput)
  totalInput += paymentInput.witnessUtxo.value

  // Step 9: add change output
  let fee = calculatePsbtFee(feeb, buyPsbt)

  const totalOutput = buyPsbt.txOutputs.reduce(
    (partialSum, a) => partialSum + a.value,
    0
  )
  const changeValue = totalInput - totalOutput - fee
  if (changeValue < 0) {
    throw new Error('Insufficient balance')
  }
  // if change is too small, we discard it instead of sending it back to the seller
  if (changeValue >= DUST_UTXO_VALUE) {
    buyPsbt.addOutput({
      address,
      value: changeValue,
    })
  } else {
    fee += changeValue
  }
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
    observing: {
      txId: paymentUtxo.txId,
      outputIndex: paymentUtxo.outputIndex,
    },
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
  const address = useAddressStore().get!
  const btcjs = useBtcJsStore().get!

  // Step 1: Get the ordinal utxo as input
  // if testnet, we use a cardinal utxo as a fake one
  let ordinalUtxo: SimpleUtxoFromMempool
  if (networkStore.network === 'testnet') {
    const cardinalUtxo = await getUtxos2(address).then((result) => {
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
    sighashType:
      btcjs.Transaction.SIGHASH_SINGLE | btcjs.Transaction.SIGHASH_ANYONECANPAY,
  })

  // Step 2: Build output as what the seller want (BTC)
  sell.addOutput({
    address,
    value: total,
  })

  return {
    order: sell,
    type: 'sell',
    value: ordinalValue,
    totalPrice: 0,
    networkFee: 0,
    serviceFee: 0,
    totalSpent: 0,
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
  const address = useAddressStore().get!
  const btcjs = useBtcJsStore().get!
  const btcNetwork = useNetworkStore().btcNetwork
  const dummiesStore = useDummiesStore()

  // check if dummies is ready
  if (!dummiesStore.has) {
    console.log({ d: dummiesStore.get })
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

  // Step 8: add payment input
  const paymentUtxo = await getUtxos2(address).then((result) => {
    // choose the largest utxo
    const utxo = result.reduce((prev, curr) => {
      if (prev.satoshis > curr.satoshis) {
        return prev
      } else {
        return curr
      }
    })
    return utxo
  })

  if (!paymentUtxo) {
    throw new Error('no utxo')
  }

  // query rawTx of the utxo
  const rawTx = await getTxHex(paymentUtxo.txId)
  // decode rawTx
  const tx = btcjs.Transaction.fromHex(rawTx)

  // construct input
  const paymentInput = {
    hash: paymentUtxo.txId,
    index: paymentUtxo.outputIndex,
    witnessUtxo: tx.outs[paymentUtxo.outputIndex],
    sighashType: btcjs.Transaction.SIGHASH_ALL,
  }

  takePsbt.addInput(paymentInput)
  totalInput += paymentInput.witnessUtxo.value

  // Step 9: add change output
  let fee = calculatePsbtFee(15, takePsbt)

  const totalOutput = takePsbt.txOutputs.reduce(
    (partialSum, a) => partialSum + a.value,
    0
  )
  const changeValue = totalInput - totalOutput - fee
  if (changeValue < 0) {
    throw new Error('Insufficient balance')
  }
  // if change is too small, we discard it instead of sending it back to the seller
  if (changeValue >= DUST_UTXO_VALUE) {
    takePsbt.addOutput({
      address,
      value: changeValue,
    })
  } else {
    fee += changeValue
  }

  console.log({ takePsbt })

  return {
    order: takePsbt,
  }
}
