import { MIN_FEEB } from '@/data/constants'
import { getFeebPlans } from '@/queries/proxy'

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const raise = (err: string): never => {
  throw new Error(err)
}

export const getLowestFeeb = async () => {
  const feeb = (await getFeebPlans({ network: 'livenet' }).then(
    (plans) => plans[0]?.feeRate || MIN_FEEB
  )) as number

  // no less than 3
  return Math.max(feeb, 3)
}
