import { useAddressStore, useNetworkStore } from '@/store'
import { type Psbt } from 'bitcoinjs-lib'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateFee(feeRate: number, vinLen: number, voutLen: number) {
  const baseTxSize = 10
  const inSize = 180
  const outSize = 34

  const txSize = baseTxSize + vinLen * inSize + (voutLen + 1) * outSize

  const fee = Math.round((txSize * feeRate) / 2)

  return fee
}

export function calculatePsbtFee(feeRate: number, psbt: Psbt) {
  // clone a new psbt to mock the finalization
  const clonedPsbt = psbt.clone()
  const address = useAddressStore().get!

  // mock the change output
  clonedPsbt.addOutput({
    address,
    value: 546,
  })
  const unsignedTx: any = clonedPsbt.data.globalMap.unsignedTx
  const virtualSize = unsignedTx.tx.virtualSize()
  const fee = virtualSize * feeRate

  return fee
}

export const toXOnly = (pubKey: any) =>
  pubKey.length === 32 ? pubKey : pubKey.subarray(1, 33)

export const prettyAddress = (address: string, len = 6) => {
  return `${address.slice(0, len)}...${address.slice(-len)}`
}

export const prettyBalance = (balance: number | string) => {
  if (balance === 0 || balance === '0') return '0'

  return (Number(balance) / 1e8).toFixed(8)
}

export const prettyBtcDisplay = (balance: number | string) => {
  return `${prettyBalance(balance)} BTC`
}

export const prettyCoinDisplay = (balance: number | string, symbol: string) => {
  if (symbol === 'BTC') return prettyBtcDisplay(balance)

  return `${balance} ${symbol}`
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
export const getUtxos = async (address: string) => {
  const network = useNetworkStore().network

  const url = `https://ordex.riverrun.online/api/utxos?address=${address}&network=${network}`
  const paymentUtxos: SimpleUtxo[] = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((res) => res.json())
    .then(({ result }) => result)

  return paymentUtxos
}

export const getTxHex = async (txId: string) => {
  const network = useNetworkStore().network

  const url = `https://ordex.riverrun.online/api/tx-hex?id=${txId}&network=${network}`

  const txHex: string = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((res) => res.text())

  return txHex
}
