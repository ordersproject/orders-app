import { useNetworkStore } from '@/stores'
import fetch, { originalFetch } from '@/lib/fetch'

export type SimpleUtxoFromMempool = {
  txId: string
  satoshis: number
  outputIndex: number
  addressType: any
}
export const getUtxos = async (address: string) => {
  const network = useNetworkStore().network
  if (network === 'livenet') {
    return getUtxosFromYouKnowWhere(address)
  }

  const url = `https://api2.orders.exchange/api/utxos2?address=${address}&network=${network}`
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

type Balance = {
  confirmed: number
  unconfirmed: number
  address: string
}
export const fetchBalance = async (address: string) => {
  const url = `https://api2.orders.exchange/api/balance?address=${address}`
  const balance: Balance = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  return balance
}

export const getUtxosFromYouKnowWhere = async (address: string) => {
  const network = useNetworkStore().network

  const url = `https://api2.orders.exchange/api/utxos?address=${address}&network=${network}`
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
  network?: 'livenet' | 'testnet'
}): Promise<FeebPlan[]> => {
  if (!network) network = 'livenet'

  const url = `https://api2.orders.exchange/api/feeb-plans?network=${network}`
  const feebPlans = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(({ result: { list } }) => list)

  return feebPlans
}

export const getTxHex = async (txId: string) => {
  const network = useNetworkStore().network

  const url = `https://api2.orders.exchange/api/tx-hex?id=${txId}&network=${network}`

  const txHex: string = await originalFetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((res) => res.text())
    .then((txHex: string) => {
      if (txHex === 'Transaction not found') {
        throw new Error(
          'Some error happened when finding BTC to pay. Please try again later.'
        )
      }

      return txHex
    })

  return txHex
}
