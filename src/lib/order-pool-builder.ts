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
import { raise } from './utils'
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

async function generateMultisigScript() {
  const btcjs = useBtcJsStore().get!

  const { selfPubKey, exchangePubKey } = await getBothPubKeys()
  const pubkeys = [selfPubKey, exchangePubKey].map((hex) =>
    Buffer.from(hex, 'hex')
  )
  const redeem = btcjs.payments.p2ms({ m: 2, pubkeys })

  return redeem.output ?? raise('Failed to generate multisig script')
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
  const multisigAddress = await generateMultisigAddress()
  // const multisigScript = btcjs.address.toOutputScript(multisigAddress)
  const multisigScript = await generateMultisigScript()
  addLiquidity.addOutput({
    script: multisigScript,
    value: Number(total),
  })
  console.log({ multisigScript: multisigScript.toString() })

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

export async function buildClaimBtcTx({ psbt }: { psbt: string }) {
  const btcjs = window.bitcoin
  const address = useAddressStore().get!

  const claim = btcjs.Psbt.fromHex(psbt)

  // Add payment input
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

  claim.addInput(paymentInput)

  // Add change output
  const feeb = 12
  const fee = calculatePsbtFee(feeb, claim)
  const changeValue = paymentUtxo.satoshis - fee

  claim.addOutput({
    address,
    value: changeValue,
  })

  return claim
}
