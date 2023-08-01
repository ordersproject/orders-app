import { ordersApiFetch } from '@/lib/fetch'
import sign from '@/lib/sign'

// Pool
type PoolPair = {
  fromPoolSize: string
  toPoolSize: string
  myPoolBalance: string
  totalPoolSupply: string
}
export const getOnePoolPair = async ({
  from,
  to,
  address,
}: {
  from: string
  to: string
  address: string
}): Promise<PoolPair> => {
  const pairSymbol = `${from.toUpperCase()}-${to.toUpperCase()}`

  const network = 'livenet'
  return await ordersApiFetch(
    `pool/pair/info?net=${network}&tick=${from}&pair=${pairSymbol}`
  ).then((res) => {
    // handle empty response
    // if res is an empty object
    if (Object.keys(res).length === 0) {
      return {
        fromPoolSize: '0',
        toPoolSize: '0',
        myPoolBalance: '0',
        totalPoolSupply: '0',
      }
    }
    console.log({ res })
    return res
  })
}

type PoolReward = {
  id: string
  title: string
  assets: {
    symbol: string
    amount: string
  }
  rewards: {
    symbol: string
    amount: string
  }
  status: 'claimable' | 'claimed'
}
export const getMyPoolRewards = async (): Promise<PoolReward[]> => {
  return [
    {
      id: '1',
      title: 'Pool Reward',
      assets: {
        symbol: 'RDEX',
        amount: '100',
      },
      rewards: {
        symbol: 'BTC',
        amount: '0.0001',
      },
      status: 'claimable',
    },
    {
      id: '2',
      title: 'Pool Reward #2',
      assets: {
        symbol: 'RDEX',
        amount: '300',
      },
      rewards: {
        symbol: 'BTC',
        amount: '0.0201',
      },
      status: 'claimed',
    },
    {
      id: '3',
      title: 'Pool Reward #3',
      assets: {
        symbol: 'RDEX',
        amount: '300',
      },
      rewards: {
        symbol: 'BTC',
        amount: '0.0201',
      },
      status: 'claimed',
    },
    {
      id: '4',
      title: 'Pool Reward #4',
      assets: {
        symbol: 'RDEX',
        amount: '300',
      },
      rewards: {
        symbol: 'BTC',
        amount: '0.0201',
      },
      status: 'claimed',
    },
    {
      id: '5',
      title: 'Pool Reward #5',
      assets: {
        symbol: 'RDEX',
        amount: '300',
      },
      rewards: {
        symbol: 'BTC',
        amount: '0.0201',
      },
      status: 'claimed',
    },
  ]
}

type LiquidityOfferParams = {
  address: string
  amount: number
  coinAmount: number
  coinPsbtRaw: string
  psbtRaw?: string
  net: 'livenet' | 'testnet'
  pair: string
  tick: string
  poolState: 1
  poolType: 1
}
export const pushAddLiquidity = async ({
  address,
  amount,
  coinAmount,
  coinPsbtRaw,
  psbtRaw,
  net,
  pair,
  tick,
  poolState,
  poolType,
}: LiquidityOfferParams) => {
  const { publicKey, signature } = await sign()

  return await ordersApiFetch(`pool/order/push`, {
    method: 'POST',
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
    body: JSON.stringify({
      address,
      amount,
      coinAmount,
      coinPsbtRaw,
      psbtRaw,
      net,
      pair,
      tick,
      poolState,
      poolType,
    }),
  })
}

export const getPoolPubKey = async () => {
  const network = 'livenet'

  return await ordersApiFetch(`pool/pair/key?net=${network}`).then(
    ({ publicKey }: { publicKey: string }) => publicKey
  )
}

export type PoolOrder = {
  orderId: string
  address: string
  amount: number
  decimalNum: number
  inscriptionId: string
  net: 'livenet'
  pair: string
  poolState: 1
  poolType: 1
  psbtRaw: string
  tick: string
  timestamp: number
}
export const getMyPoolOrders = async ({
  address,
  tick,
}: {
  address: string
  tick: string
}): Promise<PoolOrder[]> => {
  const network = 'livenet'
  const params = new URLSearchParams({
    net: network,
    tick,
    address,
    poolState: '1',
    poolType: '1',
  })

  return await ordersApiFetch(`pool/orders?${params}`).then((res) => {
    return res
  })
}
