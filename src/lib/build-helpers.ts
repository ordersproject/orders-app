import { type Psbt } from 'bitcoinjs-lib'
import { Buffer } from 'buffer'

import { useAddressStore, useBtcJsStore } from '@/store'
import {
  DUST_UTXO_VALUE,
  FEEB_MULTIPLIER,
  MIN_FEEB,
  MS_FEEB_MULTIPLIER,
} from '@/data/constants'
import { getFeebPlans, getTxHex, getUtxos2 } from '@/queries/proxy'
import { raise } from './helpers'

export function calculateFee(feeRate: number, vinLen: number, voutLen: number) {
  const baseTxSize = 10
  const inSize = 180
  const outSize = 34

  const txSize = baseTxSize + vinLen * inSize + (voutLen + 1) * outSize

  const fee = Math.round((txSize * feeRate) / 2)

  return fee
}

export function calculatePsbtFee(psbt: Psbt, feeRate: number, isMs?: boolean) {
  // clone a new psbt to mock the finalization
  const clonedPsbt = psbt.clone()
  const address = useAddressStore().get ?? raise('Not logined.')

  // mock the change output
  clonedPsbt.addOutput({
    address,
    value: DUST_UTXO_VALUE,
  })
  const virtualSize = (
    clonedPsbt.data.globalMap.unsignedTx as any
  ).tx.virtualSize()
  const fee = Math.max(virtualSize * feeRate, 546)

  // return fee

  // bump up the fee
  const multiplier = isMs ? MS_FEEB_MULTIPLIER : FEEB_MULTIPLIER
  return Math.round(fee * multiplier)
}

export async function change({
  psbt,
  feeb,
  pubKey,
  isMs,
}: {
  psbt: Psbt
  feeb?: number
  pubKey?: Buffer
  isMs?: boolean
}) {
  // check if address is set
  const address = useAddressStore().get ?? raise('Not logined.')

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
  const btcjs = useBtcJsStore().get!
  const tx = btcjs.Transaction.fromHex(rawTx)

  // construct input
  const paymentInput: any = {
    hash: paymentUtxo.txId,
    index: paymentUtxo.outputIndex,
    witnessUtxo: tx.outs[paymentUtxo.outputIndex],
  }
  if (pubKey) {
    paymentInput.tapInternalPubkey = pubKey
  }
  console.log({ paymentInput })

  psbt.addInput(paymentInput)

  // Add change output
  if (!feeb) {
    feeb = (await getFeebPlans({ network: 'livenet' }).then(
      (plans) => plans[0]?.feeRate || MIN_FEEB
    )) as number
  }

  const fee = calculatePsbtFee(psbt, feeb, isMs)
  const changeValue = paymentUtxo.satoshis - fee

  if (changeValue >= DUST_UTXO_VALUE) {
    psbt.addOutput({
      address,
      value: changeValue,
    })
  }
}
