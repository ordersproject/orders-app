import { Buffer } from 'buffer'

import {
  useAddressStore,
  useBtcJsStore,
  useCredentialsStore,
  useNetworkStore,
} from '@/store'
import { getOneBrc20 } from '@/queries/orders-api'
import { type SimpleUtxoFromMempool, getTxHex } from '@/queries/proxy'
import { type TradingPair } from '@/data/trading-pairs'
import { raise } from './utils'
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

async function generateMultisigAddress() {
  const btcjs = useBtcJsStore().get!

  const { selfPubKey, exchangePubKey } = await getBothPubKeys()
  const pubkeys = [selfPubKey, exchangePubKey].map((hex) =>
    Buffer.from(hex, 'hex')
  )
  const redeem = btcjs.payments.p2ms({ m: 2, pubkeys })
  const multisigPayment = btcjs.payments.p2wsh({ redeem })

  return multisigPayment.address ?? raise('Failed to generate multisig address')
}

export async function buildAddLiquidity({
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

  // Step 1: Get the ordinal utxo as input
  // if testnet, we use a cardinal utxo as a fake one
  let ordinalUtxo: SimpleUtxoFromMempool

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
  const multisigAddress = await generateMultisigAddress()
  addLiquidity.addOutput({
    address: multisigAddress,
    value: total,
  })

  return {
    order: addLiquidity,
    type: 'add-liquidity',
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
