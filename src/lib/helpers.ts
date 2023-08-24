import { type Psbt } from 'bitcoinjs-lib'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import * as dayjs from 'dayjs'

import { useAddressStore, useBtcJsStore } from '@/store'
import { DUST_UTXO_VALUE, FEEB_MULTIPLIER, MIN_FEEB } from '../data/constants'
import { getFeebPlans, getTxHex, getUtxos2 } from '@/queries/proxy'
import { Buffer } from 'buffer'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function prettyTimestamp(timestamp: number, isInSeconds = false) {
  if (isInSeconds) timestamp = timestamp * 1000

  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

export function calculateFee(feeRate: number, vinLen: number, voutLen: number) {
  const baseTxSize = 10
  const inSize = 180
  const outSize = 34

  const txSize = baseTxSize + vinLen * inSize + (voutLen + 1) * outSize

  const fee = Math.round((txSize * feeRate) / 2)

  return fee
}

export function calculatePsbtFee(psbt: Psbt, feeRate: number) {
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

  return fee

  // bump up the fee
  // return Math.round(fee * FEEB_MULTIPLIER)
}

export async function change({
  psbt,
  feeb,
  pubKey,
}: {
  psbt: Psbt
  feeb?: number
  pubKey?: Buffer
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

  const fee = calculatePsbtFee(psbt, feeb)
  const changeValue = paymentUtxo.satoshis - fee

  if (changeValue >= DUST_UTXO_VALUE) {
    psbt.addOutput({
      address,
      value: changeValue,
    })
  }
}

export const prettyAddress = (address: string, len = 6) => {
  return `${address.slice(0, len)}...${address.slice(-len)}`
}

export const prettyBalance = (balance: number | string) => {
  if (balance === 0 || balance === '0') return '0'
  if (!balance) return '-'

  return (Number(balance) / 1e8).toFixed(8)
}

export const prettyBtcDisplay = (balance: number | string) => {
  return `${prettyBalance(balance)} BTC`
}

export const prettyCoinDisplay = (balance: number | string, symbol: string) => {
  if (symbol.toUpperCase() === 'BTC') return prettyBtcDisplay(balance)

  return `${balance} ${symbol.toUpperCase()}`
}

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type SimpleUtxo = {
  txId: string
  scriptPk: string
  satoshis: number
  outputIndex: number
  addressType: any
}

export const raise = (err: string): never => {
  throw new Error(err)
}
