import { RemovableRef } from '@vueuse/core'
import dayjs from 'dayjs/esm/index.js'
import Decimal from 'decimal.js'

export function prettyTimestamp(
  timestamp: number,
  isInSeconds = false,
  format = 'YYYY-MM-DD HH:mm:ss'
) {
  if (isInSeconds) timestamp = timestamp * 1000

  return dayjs(timestamp).format(format)
}

export const prettyAddress = (address: string, len = 6) => {
  return `${address.slice(0, len)}...${address.slice(-len)}`
}

export const prettyTxid = (txid: string, len = 6) => {
  return `${txid.slice(0, len)}...${txid.slice(-len)}`
}

export const prettyBalance = (
  balance: number | string,
  useBtcUnit: boolean | RemovableRef<boolean> = true
) => {
  if (balance === 0 || balance === '0') return new Decimal(0)
  if (!balance) return '-'

  const useBtcUnitValue =
    typeof useBtcUnit === 'boolean' ? useBtcUnit : useBtcUnit.value
  if (useBtcUnitValue) {
    const _ = new Decimal(balance).dividedBy(1e8)

    if (_.dp() > 8) return _.toFixed()

    return _.toFixed(8)
  }

  return new Decimal(balance).toFixed()
}

export const prettyBtcDisplay = (balance: number | string) => {
  return `${prettyBalance(balance)} BTC`
}

export const prettyCoinDisplay = (balance: number | string, symbol: string) => {
  if (symbol.toUpperCase() === 'BTC') return prettyBtcDisplay(balance)

  return `${balance} ${symbol.toUpperCase()}`
}
