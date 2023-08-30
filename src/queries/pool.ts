import { ordersApiFetch } from '@/lib/fetch'
import sign from '@/lib/sign'
import { useAddressStore, useNetworkStore } from '@/store'

// Pool
type PoolPair = {
  fromPoolSize: string
  toPoolSize: string
  myFromPoolBalance: string
  myToPoolBalance: string
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
  const pairSymbol = `${from.toUpperCase()}_${to.toUpperCase()}`
  const network = 'livenet'
  const params = new URLSearchParams({
    net: network,
    tick: from,
    address,
    pair: pairSymbol,
  })
  const { publicKey, signature } = await sign()

  return await ordersApiFetch(`pool/pair/info/one?${params}`, {
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
  })
    .then(
      (res: {
        amount: number
        coinAmount: number
        decimalNum: number
        net: 'livenet'
        ownAmount: number
        ownCoinAmount: number
        ownCount: number
        pair: string
        tick: string
      }) => {
        // handle empty response
        // if res is an empty object
        if (Object.keys(res).length === 0) {
          return {
            fromPoolSize: '0',
            toPoolSize: '0',
            myFromPoolBalance: '0',
            myToPoolBalance: '0',
          }
        }

        return {
          fromPoolSize: res.coinAmount.toString(),
          toPoolSize: res.amount.toString(),
          myFromPoolBalance: (res.ownCoinAmount || 0).toString(),
          myToPoolBalance: (res.ownAmount || 0).toString(),
        }
      }
    )
    .catch((e) => {
      if (e.message === 'pool info ie empty') {
        return {
          fromPoolSize: '0',
          toPoolSize: '0',
          myFromPoolBalance: '0',
          myToPoolBalance: '0',
        }
      }

      throw e
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
export const getMyPoolRewards2 = async (): Promise<PoolReward[]> => {
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

type PooledInscription = {
  coinAmount: string
  inscriptionId: string
  inscriptionNumber: string
}
export const getMyPooledInscriptions = async ({
  address,
  tick,
}: {
  address: string
  tick: string
}): Promise<PooledInscription[]> => {
  const params = new URLSearchParams({
    tick,
    address,
  })

  return await ordersApiFetch(`pool/inscription?${params}`).then((res) => {
    if (!res?.availableList) return []

    return res.availableList.map((item: any) => {
      let inscriptionId
      if (item.inscriptionId.includes(':')) {
        inscriptionId =
          item.inscriptionId.split(':')[0] +
          'i' +
          item.inscriptionId.split(':')[1]
      } else {
        inscriptionId = item.inscriptionId
      }

      item.inscriptionId = inscriptionId

      return item
    })
  })
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

export type PoolRecord = {
  orderId: string
  address: string
  amount: number
  coinAddress: string
  coinAmount: number
  decimalNum: number
  claimState: 'pending' | 'ready'
  coinDecimalNum: number
  inscriptionId: string
  net: 'livenet'
  pair: string
  poolState: 1
  poolType: 1
  psbtRaw: string
  tick: string
  timestamp: number
}
export const getMyPoolRecords = async ({
  address,
  tick,
}: {
  address: string
  tick: string
}): Promise<PoolRecord[]> => {
  const network = 'livenet'
  const params = new URLSearchParams({
    net: network,
    tick,
    address,
    poolState: '1',
    poolType: '1',
  })

  return await ordersApiFetch(`pool/orders?${params}`).then((res) => {
    return res?.results || []
  })
}

export const getMyPoolRewards = async ({
  address,
  tick,
}: {
  address: string
  tick: string
}): Promise<PoolRecord[]> => {
  const network = 'livenet'
  const params = new URLSearchParams({
    net: network,
    tick,
    address,
    poolState: '3', // 3 for claimable (used)
    poolType: '1',
    sortKey: 'timestamp',
    sortType: '-1',
  })

  return await ordersApiFetch(`pool/orders?${params}`)
    .then((res) => {
      return res?.results || []
    })
    .then((res) => {
      return res.map((item: any) => {
        item.claimState = 'pending'
        if (item.multiSigScriptAddressTickAvailableState === 1) {
          item.claimState = 'ready'
        }

        delete item.multiSigScriptAddressTickAvailableState
        console.log(item)

        return item
      })
    })
}

export const removeLiquidity = async ({ orderId }: { orderId: string }) => {
  const network = useNetworkStore().network
  const { publicKey, signature } = await sign()

  return await ordersApiFetch(`pool/order/update`, {
    method: 'POST',
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
    body: JSON.stringify({
      net: network,
      orderId,
      poolState: 2,
    }),
  })
}

type ClaimEssential = {
  coinPsbtRaw: string
  psbtRaw: string
  coinTransferPsbtRaw: string
  rewardPsbtRaw: string
  rewardCoinAmount: number
  net: 'livenet'
  orderId: string
  tick: string
}
export const getClaimEssential = async ({
  orderId,
  tick,
}: {
  orderId: string
  tick: string
}): Promise<ClaimEssential> => {
  const network = useNetworkStore().network
  const address = useAddressStore().get!
  const { publicKey, signature } = await sign()

  return await ordersApiFetch(`pool/order/claim`, {
    method: 'POST',
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
    body: JSON.stringify({
      address,
      net: network,
      poolOrderId: orderId,
      tick,
    }),
  })
}

export const submitClaim = async ({
  orderId,
  psbtRaw,
}: {
  orderId: string
  psbtRaw: string
}) => {
  const { publicKey, signature } = await sign()

  return await ordersApiFetch(`pool/order/claim/commit`, {
    method: 'POST',
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
    body: JSON.stringify({
      poolOrderId: orderId,
      psbtRaw,
    }),
  })
}
