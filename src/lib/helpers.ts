import { useNetworkStore } from '@/store'

export function calculateFee(feeRate: number, vinLen: number, voutLen: number) {
  const baseTxSize = 10
  const inSize = 180
  const outSize = 34

  const txSize = baseTxSize + vinLen * inSize + (voutLen + 1) * outSize

  const fee = txSize * feeRate
  return fee
}

export const toXOnly = (pubKey: any) =>
  pubKey.length === 32 ? pubKey : pubKey.subarray(1, 33)

export const prettyAddress = (address: string, len = 6) => {
  return `${address.slice(0, len)}...${address.slice(-len)}`
}

export const prettyBalance = (balance: number | string) => {
  return Number(balance) / 1e8
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
