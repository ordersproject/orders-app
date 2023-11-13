import {
  useAddressStore,
  useBtcJsStore,
  useDummiesStore,
  useNetworkStore,
} from '@/store'
import { change, exclusiveChange, safeOutputValue } from './build-helpers'
import {
  DUMMY_UTXO_VALUE,
  DUST_UTXO_VALUE,
  EXTRA_INPUT_MIN_VALUE,
  ONE_SERVICE_FEE,
  SERVICE_LIVENET_ADDRESS,
  SERVICE_LIVENET_BID_ADDRESS,
  SERVICE_LIVENET_RDEX_ADDRESS,
  SERVICE_TESTNET_ADDRESS,
  SIGHASH_SINGLE_ANYONECANPAY,
} from '@/data/constants'
import {
  constructBidPsbt,
  getBidCandidateInfo,
  getListingUtxos,
  getOneBrc20,
  getOneOrder,
} from '@/queries/orders-api'
import { getUtxos, type SimpleUtxoFromMempool, getTxHex } from '@/queries/proxy'
import { type TradingPair } from '@/data/trading-pairs'
import { getLowestFeeb } from './helpers'
import { toOutputScript } from 'bitcoinjs-lib/src/address'

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
  const address = useAddressStore().get!
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
    paymentValue,
    changeValue,
  } = await exclusiveChange({
    psbt: payPsbt,
  })

  // according to api, extra input should be no less than 600
  // so we minus the difference from the bidFee to make up upload fee for api
  const uploadFee = bidFee - (EXTRA_INPUT_MIN_VALUE - extraInputValue)

  // 5. ok, now we have a utxo to actually pay the bill
  // we add it to the bid
  // const payTxid = payPsbt
  // const paymentInput = {
  //   // hash: payPsbt,
  //   index: 0,
  //   witnessUtxo: payPsbt.txOutputs[0],
  //   sighashType: SIGHASH_ALL | SIGHASH_ANYONECANPAY,
  // }
  // bid.addInput(paymentInput)

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

  // const bid = new btcjs.Psbt({ network: btcjs.networks[btcNetwork] })
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

  const exchangeOutput = exchange.txOutputs[0]
  bid.addOutput(exchangeOutput)

  // Step 6: service fee again
  const serviceAddress =
    btcNetwork === 'bitcoin'
      ? SERVICE_LIVENET_BID_ADDRESS
      : SERVICE_TESTNET_ADDRESS
  // const serviceFee = Math.max(10_000, total * 0.01)
  const oneServiceFee = 10_000
  const serviceFee = oneServiceFee * 2
  // add 2 service fee output
  bid.addOutput({
    address: serviceAddress,
    value: oneServiceFee,
  })
  bid.addOutput({
    address: serviceAddress,
    value: oneServiceFee,
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

  // Step 8: change
  let useFeeb = await getLowestFeeb()
  // const extraInputValue = exchangeOutput.value - total
  // const { fee, paymentValue, feeb, changeValue } = await change({
  //   psbt: bid,
  //   feeb: useFeeb,
  //   extraSize: 68, // baseInput + segwit
  //   extraInputValue,
  //   estimate: true,
  // })

  // const totalSpent = total + serviceFee + fee! - ordValue + extraInputValue

  // console.log({ psbt })

  // return {
  //   order: bid,
  //   orderId: candidateInfo.orderId,
  //   type: 'bid',
  //   feeb,
  //   networkFee: fee + extraInputValue,
  //   total,
  //   using: paymentValue,
  //   fromSymbol: selectedPair.toSymbol, // reversed
  //   toSymbol: selectedPair.fromSymbol,
  //   fromValue: total,
  //   toValue: coinAmount,
  //   serviceFee,
  //   totalPrice: total,
  //   totalSpent,
  //   changeValue,
  // }
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
    feeb,
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
  const address = useAddressStore().get!
  const btcjs = useBtcJsStore().get!

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
    value: safeOutputValue(total),
  })

  // Step 3: Add service fee
  // This is a little bit different
  // Instead of adding a service fee output, we add a service fee input, and a change output
  // This way, we imply that the service fee payed by the seller is instead the difference of the change
  const serviceAddress =
    networkStore.btcNetwork === 'bitcoin'
      ? selectedPair.fromSymbol === 'rdex'
        ? SERVICE_LIVENET_RDEX_ADDRESS
        : SERVICE_LIVENET_ADDRESS
      : SERVICE_TESTNET_ADDRESS
  // let serviceFee = Math.max(2000, total * 0.025) // 2.5%
  let serviceFee = 16_000

  // fetch a biggest utxo
  const listingUtxos = await getListingUtxos()
  const paymentUtxo = await getUtxos(address).then((result) => {
    const filtered = result.filter((utxo) => {
      return !listingUtxos.some((listingUtxo) => {
        const [txId, outputIndex] = listingUtxo.dummyId.split(':')
        return utxo.txId === txId && utxo.outputIndex === Number(outputIndex)
      })
    })

    // choose the largest utxo
    const utxo = filtered.reduce((prev, curr) => {
      if (prev.satoshis > curr.satoshis) {
        return prev
      } else {
        return curr
      }
    }, result[0])
    return utxo
  })
  if (!paymentUtxo) {
    throw new Error(
      'You have no usable You have no usable BTC UTXO. Please deposit more BTC into your address to receive additional UTXO. utxo'
    )
  }
  // add input
  // const rawPaymentTx = await getTxHex(paymentUtxo.txId)
  // const paymentTx = btcjs.Transaction.fromHex(rawPaymentTx)
  const paymentPrevOutput = btcjs.address.toOutputScript(address)
  const paymentWitnessUtxo = {
    value: paymentUtxo.satoshis,
    script: paymentPrevOutput,
  }
  const paymentInput = {
    hash: paymentUtxo.txId,
    index: paymentUtxo.outputIndex,
    witnessUtxo: paymentWitnessUtxo,
    sighashType: SIGHASH_SINGLE_ANYONECANPAY,
  }
  sell.addInput(paymentInput)
  // add output
  const changeValue = paymentInput.witnessUtxo.value - serviceFee
  if (changeValue < 0) {
    throw new Error(
      'Insufficient balance. Please ensure that the address has a sufficient balance and try again.'
    )
  }
  // if change is too small, we discard it instead of sending it back to the seller
  if (changeValue >= DUST_UTXO_VALUE) {
    sell.addOutput({
      address,
      value: safeOutputValue(changeValue),
    })
  } else {
    serviceFee += changeValue
  }

  return {
    order: sell,
    type: 'sell',
    value: ordinalValue,
    totalPrice: 0,
    networkFee: 0,
    serviceFee,
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
