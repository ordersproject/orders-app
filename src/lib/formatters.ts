import dayjs from 'dayjs/esm/index.js'

export function prettyTimestamp(timestamp: number, isInSeconds = false) {
  if (isInSeconds) timestamp = timestamp * 1000

  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

export const prettyAddress = (address: string, len = 6) => {
  return `${address.slice(0, len)}...${address.slice(-len)}`
}

export const prettyTxid = (txid: string, len = 6) => {
  return `${txid.slice(0, len)}...${txid.slice(-len)}`
}

export const prettyBalance = (balance: number | string) => {
  if (balance === 0 || balance === '0') return '0'
  if (!balance) return '-'

  return (Number(balance) / 1e8).toFixed(8)
}

export const prettyBtcDisplay = (balance: number | string) => {
  return `${prettyBalance(balance)} BTC`
}

export const prettyCoinDisplay = (balance: number | string, symbol: string) => {
  if (symbol.toUpperCase() === 'BTC') return prettyBtcDisplay(balance)

  return `${balance} ${symbol.toUpperCase()}`
}
