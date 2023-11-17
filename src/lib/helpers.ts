import { MIN_FEEB } from '@/data/constants'
import { getFeebPlans } from '@/queries/proxy'
import { computedEager, useStorage } from '@vueuse/core'
import Decimal from 'decimal.js'

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const raise = (err: string): never => {
  throw new Error(err)
}

export const useBtcUnit = computedEager(() => {
  return useStorage('use-btc-unit', true)
})
export const unit = computedEager(() => {
  const useBtcUnit = useStorage('use-btc-unit', true)
  return useBtcUnit.value ? 'BTC' : 'sat'
})

export const getLowestFeeb = async () => {
  const feeb = (await getFeebPlans({ network: 'livenet' }).then(
    (plans) => plans[0]?.feeRate || MIN_FEEB
  )) as number

  // no less than 3
  return Math.max(feeb, 3)
}

export const getDecimalLength = (value: number | string | Decimal): number => {
  return new Decimal(value).dp()
}

export type BidTxSpec = {
  inputs: {
    type: 'dummy' | 'btc' | 'brc'
    value: number
    tick?: string
    address?: string
  }[]
  outputs: {
    type: 'dummy' | 'btc' | 'brc' | 'change'
    value: number
    tick?: string
    address?: string
  }[]
}

export const toTx = (txid: string) => {
  window.open(`https://mempool.space/tx/${txid}`, '_blank')
}
