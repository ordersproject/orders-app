import {
  useAddressStore,
  useBtcJsStore,
  useDummiesStore,
  useNetworkStore,
} from '@/store'
import { calculateFee, getTxHex } from './helpers'
import {
  DUMMY_UTXO_VALUE,
  SERVICE_LIVENET_ADDRESS,
  SERVICE_TESTNET_ADDRESS,
} from './constants'
import {
  SimpleUtxoFromMempool,
  getBidCandidateInfo,
  getBrc20s,
  getUtxos2,
} from '@/queries'
import utils from '@/utils/index'
import { debugBidLimit } from './debugger'

export async function buildAskLimit({
  total,
  amount,
}: {
  total: number
  amount: number
}) {
  console.log({ total, amount })
  const networkStore = useNetworkStore()
  const btcjs = useBtcJsStore().get!
  const address = useAddressStore().get!
  const network = networkStore.network
  const btcNetwork = networkStore.btcNetwork

  // 获取地址
  const tick = 'orxc'

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
    console.log({ cardinalUtxo })

    if (!cardinalUtxo) {
      throw new Error('no utxo')
    }

    ordinalUtxo = cardinalUtxo
  } else {
    let transferable = await getBrc20s({
      tick: 'orxc',
      address,
    }).then((brc20s) => {
      // choose a real ordinal with the right amount, not the white amount (Heil Uncle Roger!)
      return brc20s.find((brc20) => Number(brc20.amount) === amount)
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
  }
}

export async function buildBidLimit({
  total,
  coinAmount,
  inscriptionId,
  inscriptionNumber,
}: {
  total: number
  coinAmount: number
  inscriptionId: string
  inscriptionNumber: string
}) {
  const networkStore = useNetworkStore()
  const orderNetwork = networkStore.network
  const btcNetwork = networkStore.btcNetwork
  console.log({ coinAmount, total })
  const btcjs = window.bitcoin
  const address = useAddressStore().get!

  // Step 1. prepare bid from exchange
  const candidateInfo = await getBidCandidateInfo({
    network: orderNetwork,
    tick: 'orxc',
    inscriptionId,
    inscriptionNumber,
    coinAmount,
    total,
  })

  const exchange = btcjs.Psbt.fromHex(candidateInfo.psbtRaw, {
    network: btcjs.networks[btcNetwork],
  })
  console.log({ exchange })

  const bid = new btcjs.Psbt({ network: btcjs.networks[btcNetwork] })
  let totalInput = 0

  // Step 2. build the bid part: add 2 dummy inputs
  await utils.checkAndSelectDummies()

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
  console.log({ paymentUtxo })

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
  // return await debugBidLimit({
  //   exchange,
  //   paymentInput,
  // })

  bid.addInput(paymentInput)
  totalInput += paymentInput.witnessUtxo.value

  // Step 9: add change output
  const feeb = btcNetwork === 'bitcoin' ? 10 : 1
  const fee = calculateFee(
    feeb,
    bid.txInputs.length + 1,
    bid.txOutputs.length // already taken care of the exchange output bytes calculation
  )

  const totalOutput = bid.txOutputs.reduce(
    (partialSum, a) => partialSum + a.value,
    0
  )
  // postponer should be integer
  const spent = total + fee + serviceFee + DUMMY_UTXO_VALUE * 2
  const using = paymentInput.witnessUtxo.value
  const changeValue = using - spent
  // const changeValue = totalInput - totalOutput - fee

  console.log({ changeValue, totalInput, totalOutput, fee, spent })

  bid.addOutput({
    address,
    value: changeValue,
  })

  return {
    order: bid,
    orderId: candidateInfo.orderId,
    type: 'bid',
    feeb,
    fee,
    total,
    using,
  }
}

export async function buildBuyTake({
  order,
  feeb,
}: {
  order: {
    psbtRaw: string
    coinRatePrice: number
    amount: number
    coinAmount: number
    orderId: string
  }
  feeb: number
}) {
  const address = useAddressStore().get!
  const btcjs = useBtcJsStore().get!
  const btcNetwork = useNetworkStore().btcNetwork
  const dummiesStore = useDummiesStore()

  const sellPsbt = btcjs.Psbt.fromHex(order.psbtRaw, {
    network: btcjs.networks[btcNetwork],
  })

  console.log({ sellPsbt })

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
  const serviceAddress =
    btcNetwork === 'bitcoin' ? SERVICE_LIVENET_ADDRESS : SERVICE_TESTNET_ADDRESS
  const serviceFee = Math.max(2000, sellPsbt.txOutputs[0].value * 0.01)
  buyPsbt.addOutput({
    address: serviceAddress,
    value: serviceFee,
  })

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
  const fee = calculateFee(
    feeb,
    buyPsbt.txInputs.length,
    buyPsbt.txOutputs.length // already taken care of the exchange output bytes calculation
  )

  const totalOutput = buyPsbt.txOutputs.reduce(
    (partialSum, a) => partialSum + a.value,
    0
  )
  const changeValue = totalInput - totalOutput - fee

  console.log({ changeValue, totalInput, totalOutput, fee })

  buyPsbt.addOutput({
    address,
    value: changeValue,
  })

  return {
    order: buyPsbt,
    type: 'buy',
    orderId: order.orderId,
  }
}

export async function buildSellTake({
  total,
  amount,
}: {
  total: number
  amount: number
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
    console.log({ cardinalUtxo })

    if (!cardinalUtxo) {
      throw new Error('no utxo')
    }

    ordinalUtxo = cardinalUtxo
  } else {
    let transferable = await getBrc20s({
      tick: 'orxc',
      address,
    }).then((brc20s) => {
      // choose a real ordinal with the right amount, not the white amount (Heil Uncle Roger!)
      return brc20s.find((brc20) => Number(brc20.amount) === amount)
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
  }
}
