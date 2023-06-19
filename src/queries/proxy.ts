import { useNetworkStore } from '../store'
import fetch from '@/lib/fetch'

export type SimpleUtxoFromMempool = {
  txId: string
  satoshis: number
  outputIndex: number
  addressType: any
}
export const getUtxos2 = async (address: string) => {
  const network = useNetworkStore().network
  if (network === 'livenet') {
    return getUtxosFromYouKnowWhere(address)
  }

  const url = `https://ordex.riverrun.online/api/utxos2?address=${address}&network=${network}`
  const paymentUtxos: SimpleUtxoFromMempool[] = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((utxos) => {
    return utxos.map((utxo: any) => {
      return {
        txId: utxo.txid,
        satoshis: utxo.value,
        outputIndex: utxo.vout,
        addressType: utxo.addressType || 2,
      }
    })
  })

  return paymentUtxos
}

export const getUtxosFromYouKnowWhere = async (address: string) => {
  const network = useNetworkStore().network

  const url = `https://ordex.riverrun.online/api/utxos?address=${address}&network=${network}`
  const paymentUtxos: SimpleUtxoFromMempool[] = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(({ result }) => result)

  return paymentUtxos
}

export type FeebPlan = {
  title: string
  desc: string
  feeRate: number
}
export const getFeebPlans = async ({
  network,
}: {
  network: 'livenet' | 'testnet'
}): Promise<FeebPlan[]> => {
  const url = `https://ordex.riverrun.online/api/feeb-plans?network=${network}`
  const feebPlans = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(({ result: { list } }) => list)

  return feebPlans
}
