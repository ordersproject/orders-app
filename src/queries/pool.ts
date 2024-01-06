import { ordersApiFetch } from '@/lib/fetch'
import { raise } from '@/lib/helpers'
import sign from '@/lib/sign'
import { useConnectionStore } from '@/stores/connection'
import { useFeebStore } from '@/stores/feeb'
import { useNetworkStore } from '@/stores/network'

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
  const { publicKey, signature } = await sign()

  return await ordersApiFetch(`pool/inscription?${params}`, {
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
  }).then((res) => {
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
  preTxRaw?: string
  btcUtxoId?: string
  ratio?: number
  net: 'livenet' | 'testnet'
  pair: string
  tick: string
  poolState: 1
  poolType: 1 | 3
  btcPoolMode?: 1 | 2 | 3 // 1 for psbt, 2 for custody, 3 for cascade; default to 3
}
export const pushAddLiquidity = async ({
  address,
  amount,
  coinAmount,
  btcUtxoId,
  coinPsbtRaw,
  ratio,
  psbtRaw,
  preTxRaw,
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
      preTxRaw,
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
  dealTime: number
  dealCoinTxBlock: number
  calStartBlock: number
  calEndBlock: number
  dealTx: string
  dealCoinTx: string
}
export const getMyPoolRecords = async ({
  address,
  tick,
}: {
  address: string
  tick: string
}): Promise<PoolRecord[]> => {
  const { publicKey, signature } = await sign()
  const network = 'livenet'
  const params = new URLSearchParams({
    net: network,
    tick,
    address,
    poolState: '1',
    poolType: '100',
  })

  return await ordersApiFetch(`pool/orders?${params}`, {
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
  }).then((res) => {
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

type RewardRecord = {
  address: string
  calBigBlock: 0
  calEndBlock: 0
  calStartBlock: 0
  fromOrderAmount: 0
  fromOrderCoinAmount: 0
  fromOrderDealBlock: 0
  fromOrderDealTime: 0
  fromOrderId: string
  fromOrderPercentage: 0
  fromOrderReward: 0
  fromOrderTick: string
  net: string
  orderId: string
  percentage: 0
  rewardAmount: 0
  rewardType: 1
  tick: string
}
/**
 * Standbys
 */
export const getMyStandbys = async ({
  tick,
}: {
  tick: string
}): Promise<RewardRecord[]> => {
  const network = useNetworkStore().network
  const address = useConnectionStore().getAddress
  const { publicKey, signature } = await sign()

  const params = new URLSearchParams({
    tick,
    address,
    net: network,
  })
  // if tick is rdex, then rewardType is 15; otherwise, rewardType is 2
  if (tick === 'rdex') {
    params.append('rewardType', '15')
  } else {
    params.append('rewardType', '2')
  }

  return await ordersApiFetch(`pool/reward/records?${params}`, {
    method: 'GET',
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
  })
    .then((res) => {
      return res?.results || []
    })
    .then((orders: any[]) => {
      // sort by dealTime desc
      orders.sort((a, b) => {
        return b.fromOrderDealTime - a.fromOrderDealTime
      })

      return orders
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
  const { publicKey, signature } = await sign()

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

  return await ordersApiFetch(`pool/orders?${params}`, {
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
  const { publicKey, signature } = await sign()

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

  return await ordersApiFetch(`pool/orders?${params}`, {
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
  const address = useConnectionStore().getAddress
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
 * Event
 */
export const getMyEventRecords = async ({
  address,
  tick,
}: {
  address: string
  tick: string
}): Promise<RewardRecord[]> => {
  const { publicKey, signature } = await sign()

  const network = 'livenet'
  const params = new URLSearchParams({
    net: network,
    tick,
    address,
    rewardType: '12', // event records
  })

  return await ordersApiFetch(`pool/reward/records?${params}`, {
    method: 'GET',
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
  })
    .then((res) => {
      return res?.results || []
    })
    .then((orders: any[]) => {
      // sort by dealTime desc
      orders.sort((a, b) => {
        return b.fromOrderDealTime - a.fromOrderDealTime
      })

      return orders
    })
}

export const getMyEventRewardsEssential = async ({
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
    rewardType: '12',
  })

  return await ordersApiFetch(`event/reward/info?${params}`, {
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

    return res
  })
}

export const getMyStandbyRewardsEssential = async ({
  tick,
  address,
}: {
  tick: string
  address: string
}): Promise<RewardsEssential> => {
  const network = useNetworkStore().network
  const { publicKey, signature } = await sign()

  const rewardType = tick === 'rdex' ? '12' : '2'
  const params = new URLSearchParams({
    tick,
    address,
    net: network,
    rewardType,
  })

  return await ordersApiFetch(`event/reward/info?${params}`, {
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

    return res
  })
}

export const getRewardClaimFees = async () => {
  const feeb = useFeebStore().get ?? raise('Choose a fee rate first.')
  const { publicKey, signature } = await sign()
  const params = new URLSearchParams({
    networkFeeRate: String(feeb),
    version: '2',
  })

  return (await ordersApiFetch(`event/reward/cal/fee?${params}`, {
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
  })) as {
    rewardInscriptionFee: number
    rewardSendFee: number
    feeAddress: string
  }
}

export const getEventClaimFees = async () => {
  const feeb = useFeebStore().get ?? raise('Choose a fee rate first.')
  const { publicKey, signature } = await sign()
  const params = new URLSearchParams({
    networkFeeRate: String(feeb),
    version: '2',
  })

  return (await ordersApiFetch(`event/reward/cal/fee?${params}`, {
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
  })) as {
    rewardInscriptionFee: number
    rewardSendFee: number
    feeAddress: string
  }
}

export const claimEventReward = async ({
  rewardAmount,
  tick,
  feeSend,
  feeInscription,
  networkFeeRate,
  feeUtxoTxId,
  feeRawTx,
}: {
  rewardAmount: number
  tick: string
  feeSend: number
  feeInscription: number
  networkFeeRate: number
  feeUtxoTxId: string
  feeRawTx: string
}) => {
  const network = useNetworkStore().network
  const address = useConnectionStore().getAddress
  const { publicKey, signature } = await sign()

  return await ordersApiFetch(`event/reward/claim`, {
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
      version: 2,

      feeInscription,
      feeSend,
      feeUtxoTxId,
      networkFeeRate,
      feeRawTx,
      rewardType: 12,
    }),
  })
}

export const claimStandbyReward = async ({
  rewardAmount,
  tick,
  feeSend,
  feeInscription,
  networkFeeRate,
  feeUtxoTxId,
  feeRawTx,
}: {
  rewardAmount: number
  tick: string
  feeSend: number
  feeInscription: number
  networkFeeRate: number
  feeUtxoTxId: string
  feeRawTx: string
}) => {
  const network = useNetworkStore().network
  const address = useConnectionStore().getAddress
  const { publicKey, signature } = await sign()
  const rewardType = tick === 'rdex' ? 12 : 2

  return await ordersApiFetch(`event/reward/claim`, {
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
      version: 2,

      feeInscription,
      feeSend,
      feeUtxoTxId,
      networkFeeRate,
      feeRawTx,
      rewardType,
    }),
  })
}

export const getMyEventRewardsClaimRecords = async ({
  tick,
}: {
  tick: string
}): Promise<RewardsClaimRecord[]> => {
  const network = useNetworkStore().network
  const address = useConnectionStore().getAddress
  const { publicKey, signature } = await sign()

  const params = new URLSearchParams({
    tick,
    address,
    net: network,
    rewardType: '12',
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

export const getMyStandbyRewardsClaimRecords = async ({
  tick,
}: {
  tick: string
}): Promise<RewardsClaimRecord[]> => {
  const network = useNetworkStore().network
  const address = useConnectionStore().getAddress
  const { publicKey, signature } = await sign()

  const params = new URLSearchParams({
    tick,
    address,
    net: network,
    rewardType: '2',
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

    return res
  })
}

export type RewardsClaimRecord = {
  address: string
  orderId: string
  pair: string
  rewardCoinAmount: number
  rewardState: 'pending' | 'finished'
  sendId: string
  tick: string
  timestamp: number
}
export const getMyRewardsClaimRecords = async ({
  tick,
}: {
  tick: string
}): Promise<RewardsClaimRecord[]> => {
  const network = useNetworkStore().network
  const address = useConnectionStore().getAddress
  const { publicKey, signature } = await sign()

  const rewardType = tick === 'rdex' ? '11' : '0'
  const params = new URLSearchParams({
    tick,
    address,
    net: network,
    rewardState: '100',
    rewardType,
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
  feeSend,
  feeInscription,
  networkFeeRate,
  feeUtxoTxId,
  feeRawTx,
}: {
  rewardAmount: number
  tick: string
  feeSend: number
  feeInscription: number
  networkFeeRate: number
  feeUtxoTxId: string
  feeRawTx: string
}) => {
  const network = useNetworkStore().network
  const address = useConnectionStore().getAddress
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
      version: 2,

      feeInscription,
      feeSend,
      feeUtxoTxId,
      networkFeeRate,
      feeRawTx,
      rewardType: 1,
    }),
  })
}
