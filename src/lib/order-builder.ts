import {
  useAddressStore,
  useBtcJsStore,
  useDummiesStore,
  useNetworkStore,
} from '@/store'
import { SimpleUtxo, calculateFee, getTxHex } from './helpers'
import {
  DUMMY_UTXO_VALUE,
  SERVICE_LIVENET_ADDRESS,
  SERVICE_TESTNET_ADDRESS,
} from './constants'
import {
  SimpleUtxoFromMempool,
  getBidCandidateInfo,
  getUtxos2,
} from '@/queries'

export async function buildAskLimit({
  network,
  total,
  amount,
}: {
  network: 'bitcoin' | 'testnet'
  total: number
  amount: number
}) {}

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
    tick: 'ordi',
    inscriptionId,
    inscriptionNumber,
    coinAmount,
    total,
  })

  // return
  // const exchangeHexes = [
  //   '70736274ff01005e0200000001d9df4dd04affa73afdff58357e39dec4734e52d17362309d33f2c2d61de52cfc0100000000ffffffff01283c0000000000002251207091db2e0151dd9068a4d360364e7e8453edb5b408f21d704e66892de6f6c901000000000001012b95250000000000002251207091db2e0151dd9068a4d360364e7e8453edb5b408f21d704e66892de6f6c9010108430141aa1c0d6822dc0b7404d6bf8ceaa10464c2443c36bff4f6bf517931cbf4c3abd4feb84bdc2c1c6f5b5d56e2e48ebb384fdd9692c9f6351849ab6e8ff2d8381aab830000',
  //   '70736274ff01005e0200000001d9df4dd04affa73afdff58357e39dec4734e52d17362309d33f2c2d61de52cfc0100000000ffffffff0150780000000000002251207091db2e0151dd9068a4d360364e7e8453edb5b408f21d704e66892de6f6c901000000000001012b95250000000000002251207091db2e0151dd9068a4d360364e7e8453edb5b408f21d704e66892de6f6c90101084301415b2fd59ee380afc1799958e4afc1d9b57490d46f5657cbc30d85e98bf40b4c9b2dc5fff9489284ab3a0a091b52ddcd33913693be213b3a3d94de56630c7d5c94830000',
  // ]
  // const exchangeHex = total === 12300 ? exchangeHexes[0] : exchangeHexes[1]
  const exchange = btcjs.Psbt.fromHex(candidateInfo.psbtRaw, {
    network: btcjs.networks[btcNetwork],
  })
  console.log({ exchange })

  const bid = new btcjs.Psbt({ network: btcjs.networks[btcNetwork] })
  let totalInput = 0
  // Step 2. build the bid part: add 2 dummy inputs
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
  const newDummiesIndex = [bid.txOutputs.length - 2, bid.txOutputs.length - 1]

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

  bid.addInput(paymentInput)
  totalInput += paymentInput.witnessUtxo.value

  // Step 9: add change output
  const feeb = btcNetwork === 'bitcoin' ? 11 : 1
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
  const postponer = Math.round(total * 0.25)
  const changeValue =
    paymentInput.witnessUtxo.value -
    total -
    fee -
    serviceFee -
    DUMMY_UTXO_VALUE * 2

  console.log({ changeValue, totalInput, totalOutput, fee, postponer })

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
    postponer,
    total,
  }
  // sign
  const signed = await window.unisat.signPsbt(bid.toHex())
  console.log({ signed })
  if (signed) {
    // const signedToPsbt = btcjs.Psbt.fromHex(signed, {
    //   network: btcjs.networks[network],
    // })
    // const txHex = signedToPsbt.extractTransaction().toHex()
    // const newDummies = [
    //   {
    //     txId: pushTxId,
    //     satoshis: DUMMY_UTXO_VALUE,
    //     outputIndex: newDummiesIndex[0],
    //     addressType: 2,
    //     txHex,
    //   },
    //   {
    //     txId: pushTxId,
    //     satoshis: DUMMY_UTXO_VALUE,
    //     outputIndex: newDummiesIndex[1],
    //     addressType: 2,
    //     txHex,
    //   },
    // ]
    // dummiesStore.set(newDummies)
    // await
  }
}

export async function buildBuyTake() {}

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
    throw new Error('not implemented')
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
