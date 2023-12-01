import { ordersApiFetch } from '@/lib/fetch'
import sign from '@/lib/sign'

export type Issue = {
  address: string
  amount: 0
  bidCount: 0
  calEndBlock: 0
  calStartBlock: 0
  coinAddress: string
  coinAmount: 0
  coinDecimalNum: 0
  coinPrice: 0
  coinPriceDecimalNum: 0
  coinPsbtRaw: string
  coinRatePrice: 0
  dealCoinTx: string
  dealCoinTxBlock: 0
  dealCoinTxBlockState: 1
  dealInscriptionId: string
  dealInscriptionTime: 0
  dealInscriptionTx: string
  dealInscriptionTxIndex: 0
  dealInscriptionTxOutValue: 0
  dealTime: 0
  dealTx: string
  decimalNum: 0
  decreasing: 0
  inscriptionId: string
  multiSigScriptAddress: string
  multiSigScriptAddressTickAvailableState: 0
  net: string
  orderId: string
  pair: string
  percentage: 0
  percentageExtra: 0
  poolState: 1
  poolType: 1
  psbtRaw: string
  releaseTime: 0
  releaseTx: string
  releaseTxBlock: 0
  rewardAmount: 0
  rewardExtraAmount: 0
  rewardRealAmount: 0
  tick: string
  timestamp: 0
  utxoId: string
}
export const getIssues = async ({
  address,
}: {
  address: string
}): Promise<Issue[]> => {
  const { publicKey, signature } = await sign()
  const params = new URLSearchParams({
    address,
  })

  return await ordersApiFetch(`pool/err/orders?${params}`, {
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
  }).then(({ results }) => results ?? [])
}

export type IssueDetail = {
  coinAmount: 0
  coinPsbtRaw: string
  coinTransferPsbtRaw: string
  fee: 0
  inscriptionId: string
  net: string
  orderId: string
  psbtRaw: string
  rewardCoinAmount: 0
  rewardPsbtRaw: string
  tick: string
}
export const getIssueDetail = async ({
  address,
  tick,
  orderId,
}: {
  address: string
  tick: string
  orderId: string
}): Promise<IssueDetail> => {
  const { publicKey, signature } = await sign()

  return ordersApiFetch(`pool/err/order/release`, {
    method: 'POST',
    body: JSON.stringify({
      address,
      tick,
      poolOrderid: orderId,
    }),
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
  }).then((result) => {
    return result
  })
}

export const submitRecover = async ({
  orderId,
  psbtRaw,
}: {
  orderId: string
  psbtRaw: string
}): Promise<IssueDetail> => {
  const { publicKey, signature } = await sign()

  return ordersApiFetch(`pool/err/order/release/commit`, {
    method: 'POST',
    body: JSON.stringify({
      poolOrderid: orderId,
      psbtRaw,
    }),
    headers: {
      'X-Signature': signature,
      'X-Public-Key': publicKey,
    },
  }).then((result) => {
    return result
  })
}
