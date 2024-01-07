import { ElMessage } from 'element-plus'

import { useBtcJsStore } from '@/stores/btcjs'

function checkMetalet() {
  if (!window.metaidwallet) {
    ElMessage.warning('Please install the Metalet wallet extension first.')
    throw new Error('Please install the Metalet wallet extension first.')
  }
}

export function initPsbt() {
  const bitcoinJs = useBtcJsStore().get!

  return new bitcoinJs.Psbt()
}

export function finishPsbt<T>(psbt: T): T {
  return psbt
}

export const getAddress = async () => {
  checkMetalet()

  const address = await window.metaidwallet.btc.getAddress()
  if (address) {
    if (
      address.startsWith('1') ||
      address.startsWith('m') ||
      address.startsWith('n')
    ) {
      ElMessage.error('Please use a SegWit address')
      throw new Error('Please use a SegWit address')
    }
  }

  return address
}

export const connect: () => Promise<{
  address: string
  pubKey: string
}> = async () => {
  const connetRes = await window.metaidwallet.btc.connect()
  if (connetRes.address && connetRes.pubKey) {
    return connetRes
  }
  throw new Error(`Metalet connect status: ${connetRes.status}`)
}

export const disconnect = async () => { }

export const getBalance = async () => {
  checkMetalet()

  return await window.metaidwallet.btc.getBalance("btc")
    .then((info: { total: number }) => info.total)
}

export const inscribe = async (tick: string): Promise<string> => {
  checkMetalet()

  return await window.metaidwallet.btc.inscribeTransfer(tick)
}

export const signPsbt = async (
  psbt: string,
  options?: any
): Promise<string> => {
  checkMetalet()

  return await window.metaidwallet.btc.signPsbt(psbt, options)
}

export const signPsbts = async (
  psbtHexs: string[],
  options?: any[]
): Promise<string[]> => {
  checkMetalet()

  return await window.metaidwallet.btc.signPsbts(psbtHexs, options)
}

export const pushPsbt = async (psbtHex: string): Promise<string> => {
  checkMetalet()

  return await window.metaidwallet.btc.pushPsbt(psbtHex)
}
