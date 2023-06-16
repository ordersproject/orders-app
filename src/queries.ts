import sign from './lib/sign'
import { useAddressStore, useNetworkStore } from './store'
import { ElMessage } from 'element-plus'
import fetch from '@/lib/fetch'

export const getOrdiBalance = async (
  address: string,
  network: 'livenet' | 'testnet'
) => {
  // fake data for testnet
  if (network === 'testnet') {
    // randomize, from 5 to 100
    const fakeBalance = 10
    return fakeBalance
  }

  // real data for livenet
  return 1
}

export type BidCandidate = {
  inscriptionId: string
  inscriptionNumber: string
  coinAmount: string
}
export const getBidCandidates = async (
  network: 'livenet' | 'testnet',
  tick: string
): Promise<BidCandidate[]> => {
  const candidates: BidCandidate[] = await fetch(
    `https://api.ordbook.io/book/brc20/order/bid/pre?net=${network}&tick=${tick}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
    .then((res) => res.json())
    .then(({ data: { availableList } }) => availableList)

  return candidates || []
}

export const getBidCandidateInfo = async ({
  network,
  tick,
  inscriptionId,
  inscriptionNumber,
  coinAmount,
  total,
}: {
  network: 'livenet' | 'testnet'
  tick: string
  inscriptionId: string
  inscriptionNumber: string
  coinAmount: string | number
  total: number
}): Promise<{
  net: 'livenet' | 'testnet'
  tick: string
  psbtRaw: string
  orderId: string
}> => {
  const candidateInfo = await fetch(
    `https://api.ordbook.io/book/brc20/order/bid?net=${network}&tick=${tick}&inscriptionId=${inscriptionId}&inscriptionNumber=${inscriptionNumber}&coinAmount=${coinAmount}&total=${total}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
    .then((res) => res.json())
    .then(({ data: candidateInfo }) => candidateInfo)

  return candidateInfo
}

export type Order = {
  amount: number
  buyerAddress: string
  coinAmount: number
  coinDecimalNum: number
  coinRatePrice: number
  net: 'livenet' | 'testnet'
  orderId: string
  orderState: number
  orderType: number
  freeState?: 1 | 0
  psbtRaw: string
  sellerAddress: string
  tick: string
  timestamp: number
}
export const getOrders = async ({
  type,
  network,
  sort = 'asc',
}: {
  type: 'bid' | 'ask'
  network: 'livenet' | 'testnet'
  sort: 'asc' | 'desc'
}) => {
  const orderType = type === 'ask' ? 1 : 2
  const sortType = sort === 'asc' ? 1 : -1
  const orders: Order[] = await fetch(
    `https://api.ordbook.io/book/brc20/orders?net=${network}&orderType=${orderType}&orderState=1&sortKey=coinRatePrice&sortType=${sortType}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
    .then((res) => res.json())
    .then(({ data: { results } }) => results)

  return orders || []
}

export type Ticker = {
  amount: string
  avgPrice: string
  tick: string
  pair: string
  net: 'livenet' | 'testnet'
}
export const getMarketPrice = async ({ tick }: { tick: string }) => {
  // const network = useNetworkStore().network
  const network = 'livenet' // TODO
  const marketPrice: number = await fetch(
    `https://api.ordbook.io/book/brc20/tickers?tick=${tick}&net=${network}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
    .then((res) => res.json())
    .then(({ data: { results: tickers } }) => tickers)
    .then((tickers: Ticker[]) => {
      if (tickers.length === 0) return 0

      const theTicker = tickers.find(
        (ticker) => ticker.tick === tick && ticker.net === network
      )

      return theTicker ? Number(theTicker.avgPrice) : 0
    })

  return marketPrice / 1e8
}

export type Brc20 = {
  inscriptionId: string
  inscriptionNumber: string
  amount: string
}
export const getBrc20s = async ({
  tick,
  address,
}: {
  tick: string
  address: string
}) => {
  const brc20s: Brc20[] = await fetch(
    `https://api.ordbook.io/book/brc20/address/${address}/${tick}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
    .then((res) => res.json())
    .then(({ data: { transferBalanceList } }) => transferBalanceList)
  console.log({ brc20s })

  return brc20s || []
}

export const pushSellTake = async ({
  network,
  psbtRaw,
  orderId,
  address,
  value,
  amount,
}: {
  network: 'livenet' | 'testnet'
  psbtRaw: string
  orderId: string
  address: string
  value: number
  amount: string
}) => {
  const sellEndpoint = `https://api.ordbook.io/book/brc20/order/bid/do`
  console.log({ value })
  const sellRes = await fetch(sellEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      net: network,
      psbtRaw,
      orderId,
      address,
      value,
      amount,
    }),
  })
    .then((res) => res.json())
    .then((res) => {
      if (res.code === 1) {
        throw new Error(res.message)
      }
    })

  return sellRes
}

export const pushAskOrder = async ({
  network,
  address,
  tick,
  psbtRaw,
  amount,
}: {
  network: 'livenet' | 'testnet'
  address: string
  tick: string
  psbtRaw: string
  amount: number
}) => {
  const { publicKey, signature } = await sign()

  const createEndpoint = `https://api.ordbook.io/book/brc20/order/ask/push`
  const createRes = await fetch(createEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
    body: JSON.stringify({
      psbtRaw,
      address,
      net: network,
      orderState: 1,
      orderType: 1,
      tick,
      coinAmount: amount,
    }),
  }).then((res) => res.json())

  return createRes
}

export const pushBuyTake = async ({
  network,
  psbtRaw,
  orderId,
}: {
  network: 'livenet' | 'testnet'
  psbtRaw: string
  orderId: string
}) => {
  const pushTxId = await window.unisat.pushPsbt(psbtRaw)
  const address = useAddressStore().address!
  console.log({ pushTxId })

  const { publicKey, signature } = await sign()

  // if pushed successfully, update the Dummies
  if (pushTxId) {
    // notify update psbt status
    const updateEndpoint = `https://api.ordbook.io/book/brc20/order/update`
    const updateRes = await fetch(updateEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Public-Key': publicKey,
      },
      body: JSON.stringify({
        net: network,
        address,
        orderId,
        orderState: 2,
        psbtRaw,
      }),
    })
  }
}

export const cancelOrder = async ({ orderId }: { orderId: string }) => {
  const address = useAddressStore().address!
  const network = useNetworkStore().network
  const { publicKey, signature } = await sign()

  const updateEndpoint = `https://api.ordbook.io/book/brc20/order/update`
  await fetch(updateEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
    body: JSON.stringify({
      net: network,
      address,
      orderId,
      orderState: 3,
    }),
  })
}

export const pushBidOrder = async ({
  network,
  address,
  tick,
  psbtRaw,
  feeb,
  fee,
  total,
  using,
  orderId,
}: {
  network: 'livenet' | 'testnet'
  address: string
  tick: string
  psbtRaw: string
  feeb: number
  fee: number
  total: number
  using: number
  orderId: string
}) => {
  try {
    const { publicKey, signature } = await sign()
    const createEndpoint = `https://api.ordbook.io/book/brc20/order/bid/push`
    const createRes = await fetch(createEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Public-Key': publicKey,
      },
      body: JSON.stringify({
        net: network,
        address,
        tick,
        psbtRaw,
        rate: feeb,
        fee,
        amount: total,
        buyerInValue: using,
        orderId,
      }),
    }).then((res) => res.json())

    return createRes
  } catch (e) {
    throw e
  }
}

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
  })
    .then((res) => res.json())
    .then((utxos) => {
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
  })
    .then((res) => res.json())
    .then(({ result }) => result)

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
  })
    .then((res) => res.json())
    .then(({ result: { list } }) => list)

  return feebPlans
}

/**
 * Unisat API
 */
export const getAddress = async () => {
  if (!window.unisat) {
    ElMessage.warning('Unisat not available')
    throw new Error('Unisat not available')
  }

  const addresses = await window.unisat.getAccounts()
  if (addresses && addresses.length > 0) {
    if (
      addresses[0].startsWith('1') ||
      addresses[0].startsWith('m') ||
      addresses[0].startsWith('n')
    ) {
      ElMessage.error('Please use a SegWit address')
      throw new Error('Please use a SegWit address')
    }

    useAddressStore().set(addresses[0])
    return addresses[0]
  }

  ElMessage.warning('Login to Unisat first.')
  throw new Error('Login to Unisat first.')
}

export const getBalance = async () => {
  if (!window.unisat) {
    ElMessage.warning('Unisat not available')
    throw new Error('Unisat not available')
  }

  const balance: number = await window.unisat
    .getBalance()
    .then(
      (info: { confirmed: number; unconfirmed: number; total: number }) =>
        info.total
    )
  console.log({ balance })

  return balance
}
