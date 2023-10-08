import sign from '../lib/sign'
import { useAddressStore, useNetworkStore } from '../store'
import { ordersApiFetch } from '@/lib/fetch'

export const login = async () => {
  const address = useAddressStore().get as string
  const loginRes = await ordersApiFetch(`login/in`, {
    method: 'POST',
    body: JSON.stringify({
      net: 'livenet',
      address,
    }),
  })

  return loginRes
}

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
  poolOrderId?: string
}
export const getBidCandidates = async (
  network: 'livenet' | 'testnet',
  tick: string,
  isPool: boolean = true
): Promise<BidCandidate[]> => {
  const params = new URLSearchParams({
    net: network,
    tick,
    isPool: String(isPool),
  })
  let candidates: BidCandidate[] = await ordersApiFetch(
    `order/bid/pre?${params}`
  ).then(({ availableList }) => availableList)

  if (candidates) {
    candidates = candidates.map((candidate) => {
      let inscriptionId
      if (candidate.inscriptionId.includes(':')) {
        inscriptionId =
          candidate.inscriptionId.split(':')[0] +
          'i' +
          candidate.inscriptionId.split(':')[1]
      } else {
        inscriptionId = candidate.inscriptionId
      }

      candidate.inscriptionId = inscriptionId

      return candidate
    })
  }

  return candidates || []
}

export const getBidCandidateInfo = async ({
  network,
  tick,
  inscriptionId,
  inscriptionNumber,
  coinAmount,
  total,
  isPool,
  poolOrderId,
}: {
  network: 'livenet' | 'testnet'
  tick: string
  inscriptionId: string
  inscriptionNumber: string
  coinAmount: string | number
  total: number
  isPool: boolean
  poolOrderId?: string
}): Promise<{
  net: 'livenet' | 'testnet'
  tick: string
  psbtRaw: string
  orderId: string
}> => {
  const params = new URLSearchParams({
    net: network,
    tick,
    inscriptionNumber,
    coinAmount: String(coinAmount),
    total: String(total),
    amount: String(total),
    // inscriptionId,
  })
  if (isPool) {
    params.append('isPool', String(isPool))

    if (poolOrderId) params.append('poolOrderId', poolOrderId)
  }

  const candidateInfo = await ordersApiFetch(
    `order/bid?${params}&inscriptionId=${inscriptionId}`
  )

  // validate
  if (!candidateInfo.psbtRaw) {
    throw new Error('Psbt is not provided.')
  }

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
  sellerAddress: string
  tick: string
  timestamp: number
}
export const getOrders = async ({
  type,
  network,
  sort = 'asc',
  tick = 'rdex',
}: {
  type: 'bid' | 'ask'
  network: 'livenet' | 'testnet'
  sort: 'asc' | 'desc'
  tick: string
}) => {
  const orderType = type === 'ask' ? 1 : 2
  const sortType = sort === 'asc' ? 1 : -1

  const params = new URLSearchParams({
    net: network,
    orderType: String(orderType),
    orderState: '1',
    sortKey: 'coinRatePrice',
    sortType: String(sortType),
    tick,
  })
  const orders: Order[] = await ordersApiFetch(`orders?${params}`).then(
    ({ results }) => results
  )

  return orders || []
}

type DetailedOrder = Order & { psbtRaw: string }
export const getOneOrder = async ({
  orderId,
}: {
  orderId: string
}): Promise<DetailedOrder> => {
  const { publicKey, signature } = await sign()
  const address = useAddressStore().get!

  const order: DetailedOrder = await ordersApiFetch(
    `order/${orderId}?buyerAddress=${address}`,
    {
      headers: {
        'X-Signature': signature,
        'X-Public-Key': publicKey,
      },
    }
  )

  return order
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
  const marketPrice: number = await ordersApiFetch(
    `tickers?tick=${tick}&net=${network}`
  )
    .then(({ results: tickers }) => tickers)
    .then((tickers: Ticker[]) => {
      if (tickers.length === 0) return 0

      const theTicker = tickers.find(
        (ticker) => ticker.tick === tick && ticker.net === network
      )

      return theTicker ? Number(theTicker.avgPrice) : 0
    })

  return marketPrice / 1e8
}

export type Brc20Transferable = {
  inscriptionId: string
  inscriptionNumber: string
  amount: string
}
export type Brc20 = {
  availableBalance: string
  balance: string
  limit: string
  transferBalance: string
  transferBalanceList: Brc20Transferable[]
}
export const getOneBrc20 = async ({
  tick,
  address,
}: {
  tick: string
  address: string
}) => {
  let brc20: Brc20 = await ordersApiFetch(`address/${address}/${tick}`)

  // map inscriptionId into : notation
  if (brc20) {
    brc20.transferBalanceList = brc20.transferBalanceList.map((transfer) => {
      const inscriptionNumber = transfer.inscriptionNumber
      const amount = transfer.amount

      let inscriptionId
      if (transfer.inscriptionId.includes(':')) {
        inscriptionId =
          transfer.inscriptionId.split(':')[0] +
          'i' +
          transfer.inscriptionId.split(':')[1]
      } else {
        inscriptionId = transfer.inscriptionId
      }

      return {
        inscriptionId,
        inscriptionNumber,
        amount,
      }
    })
  }

  return brc20 || {}
}

export type Brx20Brief = {
  balance: string
  token: string
  availableBalance: string
  tokenType: 'BRC20'
  transferBalance: string
}
export const getBrc20s = async ({
  address,
  tick,
}: {
  address: string
  tick?: string
}) => {
  const network = 'livenet'
  let path = `address/${address}/balance/info?net=${network}`
  if (tick) path += `&tick=${tick}`

  const brc20s = await ordersApiFetch(path).then(
    ({ balanceList }: { balanceList: Brx20Brief[] }) => balanceList
  )

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
  const sellRes = await ordersApiFetch(`order/bid/do`, {
    method: 'POST',
    body: JSON.stringify({
      net: network,
      psbtRaw,
      orderId,
      address,
      value,
      amount,
    }),
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

  const createRes = await ordersApiFetch(`order/ask/push`, {
    method: 'POST',
    headers: {
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
  })

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
  // const pushTxId = await window.unisat.pushPsbt(psbtRaw)
  const address = useAddressStore().address!

  const { publicKey, signature } = await sign()

  // if pushed successfully, update the Dummies
  // notify update psbt status
  const updateRes = await ordersApiFetch(`order/update`, {
    method: 'POST',
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
    body: JSON.stringify({
      net: network,
      address,
      orderId,
      orderState: 2,
      psbtRaw,
      broadcastIndex: 1,
    }),
  })

  console.log({ updateRes })
  return updateRes
}

export const cancelOrder = async ({ orderId }: { orderId: string }) => {
  const address = useAddressStore().address!
  const network = useNetworkStore().network
  const { publicKey, signature } = await sign()

  await ordersApiFetch(`order/update`, {
    method: 'POST',
    headers: {
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
    const createRes = await ordersApiFetch(`order/bid/push`, {
      method: 'POST',
      headers: {
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
    })

    return createRes
  } catch (e) {
    throw e
  }
}

// Whitelist claim rewards
export const getOneClaim = async ({
  tick = 'rdex',
  address,
}: {
  tick?: 'rdex'
  address: string
}): Promise<{
  coinAmount: number
  availableCount: number
  fee: number
  orderId: string
  psbtRaw: string
  net: 'livenet' | 'testnet'
  tick: 'rdex'
}> => {
  const network = 'livenet'
  return await ordersApiFetch(
    `claim/order?tick=${tick}&address=${address}&net=${network}`
  )
}

export const updateClaim = async ({
  address,
  orderId,
  psbtRaw,
}: {
  address: string
  orderId: string
  psbtRaw: string
}) => {
  const network = 'livenet'
  const { publicKey, signature } = await sign()

  await ordersApiFetch(`claim/order/update`, {
    method: 'POST',
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
    body: JSON.stringify({
      net: network,
      address,
      orderId,
      psbtRaw,
    }),
  })
}
