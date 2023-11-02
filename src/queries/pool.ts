import { DEBUG } from '@/data/constants'
import { ordersApiFetch } from '@/lib/fetch'
import sign from '@/lib/sign'
import { useAddressStore, useNetworkStore } from '@/store'

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

/**
 * Add
 */
type LiquidityOfferParams = {
  address: string
  amount: number
  coinAmount: number
  coinPsbtRaw: string
  psbtRaw?: string
  btcUtxoId?: string
  ratio?: number
  net: 'livenet' | 'testnet'
  pair: string
  tick: string
  poolState: 1
  poolType: 1 | 3
  btcPoolMode?: 1 | 2 // 1 for psbt, 2 for custody; default to 2
}
export const pushAddLiquidity = async ({
  address,
  amount,
  coinAmount,
  btcUtxoId,
  coinPsbtRaw,
  ratio,
  psbtRaw,
  net,
  pair,
  tick,
  poolState,
  poolType,
  btcPoolMode,
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
      btcUtxoId,
      coinPsbtRaw,
      ratio,
      psbtRaw,
      net,
      pair,
      tick,
      poolState,
      poolType,
      btcPoolMode,
    }),
  })
}

export const getPoolCredential = async (): Promise<{
  publicKey: string
  btcReceiveAddress: string
  btcPublicKey: string
}> => {
  const network = 'livenet'

  return await ordersApiFetch(`pool/pair/key?net=${network}`)
}

/**
 * Remove
 */
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
  poolType: 1 | 3
  decreasing: number
  psbtRaw: string
  tick: string
  rewardCoinAmount: number
  timestamp: number

  percentage: number
  percentageExtra: number

  rewardAmount: number
  rewardRealAmount: number
  rewardExtraAmount: number

  dealCoinTxBlockState: number
  dealCoinTxBlock: number
  dealTime: number
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
    poolType: '100',
  })

  return await ordersApiFetch(`pool/orders?${params}`).then((res) => {
    return res?.results || []
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

/**
 * Release
 */
export type ReleaseHistory = PoolRecord & {
  releaseTime: number
  releaseTx: string
  releaseTxBlock: number
}
export const getMyUsedPoolRecords = async ({
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
    poolState: '3', // 3 for releasable (used)
    poolType: '100',
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

        return item
      })
    })
}

export const getMyReleasedRecords = async ({
  address,
  tick,
}: {
  address: string
  tick: string
}): Promise<ReleaseHistory[]> => {
  const network = 'livenet'
  const params = new URLSearchParams({
    net: network,
    tick,
    address,
    poolState: '4', // 3 for released
    poolType: '100',
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

        return item
      })
    })
}

type ReleaseEssential = {
  coinPsbtRaw: string
  psbtRaw: string
  coinTransferPsbtRaw: string
  rewardCoinAmount: number
  net: 'livenet'
  orderId: string
  tick: string
}
export const getReleaseEssential = async ({
  orderId,
  tick,
}: {
  orderId: string
  tick: string
}): Promise<ReleaseEssential> => {
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

export const submitRelease = async ({
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

/**
 * Rewards
 */
type RewardsEssential = {
  totalRewardAmount: number
  totalRewardExtraAmount: number
  hadClaimRewardAmount: number
  hasReleasePoolOrderCount: number
  net: 'livenet'
  tick: string
}
export const getMyRewardsEssential = async ({
  tick,
  address,
}: {
  tick: string
  address: string
}): Promise<RewardsEssential> => {
  const network = useNetworkStore().network
  const { publicKey, signature } = await sign()

  const params = new URLSearchParams({
    tick,
    address,
    net: network,
  })

  return await ordersApiFetch(`pool/reward/info?${params}`, {
    method: 'GET',
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
  }).then((res) => {
    if (res.HasReleasePoolOrderCount) {
      res.hasReleasePoolOrderCount = res.HasReleasePoolOrderCount
      delete res.HasReleasePoolOrderCount
    }
    // if (DEBUG) res.hasReleasePoolOrderCount = 10

    return res
  })
}

export type RewardsClaimRecord = {
  address: string
  orderId: string
  pair: string
  rewardCoinAmount: number
  rewardState: 'pending' | 'finished'
  tick: string
  timestamp: number
}
export const getMyRewardsClaimRecords = async ({
  tick,
}: {
  tick: string
}): Promise<RewardsClaimRecord[]> => {
  const network = useNetworkStore().network
  const address = useAddressStore().get!
  const { publicKey, signature } = await sign()

  const params = new URLSearchParams({
    tick,
    address,
    net: network,
    rewardState: '100',
  })

  return await ordersApiFetch(`pool/reward/orders?${params}`, {
    method: 'GET',
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
  })
    .then((res) => {
      return res?.results || []
    })
    .then((res) => {
      return res.map((item: any) => {
        if (item.rewardState === 3) {
          item.rewardState = 'finished'
        } else {
          item.rewardState = 'pending'
        }

        return item
      })
    })
}

export const claimReward = async ({
  rewardAmount,
  tick,
}: {
  rewardAmount: number
  tick: string
}) => {
  const network = useNetworkStore().network
  const address = useAddressStore().get!
  const { publicKey, signature } = await sign()

  return await ordersApiFetch(`pool/reward/claim`, {
    method: 'POST',
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
    body: JSON.stringify({
      net: network,
      rewardAmount,
      address,
      tick,
    }),
  })
}
