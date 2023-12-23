import { useBtcJsStore } from '@/stores/btcjs'
import { ElMessage } from 'element-plus'

function checkUnisat() {
  if (!window.unisat) {
    ElMessage.warning('Please install the Unisat wallet extension first.')
    throw new Error('Please install the Unisat wallet extension first.')
  }
}

export function initPsbt() {
  const bitcoinJs = useBtcJsStore().get!

  return new bitcoinJs.Psbt()
}

export const getAddress = async () => {
  if (!window.unisat) {
    return ''
  }

  const addresses = await window.unisat.getAccounts()
  if (addresses && addresses.length > 0) {
    if (
      addresses[0].startsWith('1') ||
      addresses[0].startsWith('m') ||
      addresses[0].startsWith('n')
    ) {
      ElMessage.error('Please use a SegWit address')
      throw new Error('Please use a SegWit address')
    }

    return addresses[0]
  }

  return ''
}

export const connect: () => Promise<{
  address: string
  pubKey: string
}> = async () => {
  const connectRes = await window.unisat.requestAccounts()
  if (connectRes && connectRes.length) {
    // if it's a legacy address(1... or m..., n...), throw error
    if (
      connectRes[0].startsWith('1') ||
      connectRes[0].startsWith('3') ||
      connectRes[0].startsWith('m') ||
      connectRes[0].startsWith('n')
    ) {
      throw new Error('Please use a SegWit address')
    }

    // get the pubKey from the address
    const pubKey: string = await window.unisat.getPublicKey()

    return {
      address: connectRes[0],
      pubKey,
    }
  }

  return {
    address: '',
    pubKey: '',
  }
}

export const disconnect = async () => {}

export const getBalance = async () => {
  checkUnisat()

  const balance: number = await window.unisat
    .getBalance()
    .then(
      (info: { confirmed: number; unconfirmed: number; total: number }) =>
        info.total
    )
  return balance
}

export const inscribe = async (tick: string): Promise<string> => {
  checkUnisat()

  return await window.unisat.inscribeTransfer(tick)
}

export const signPsbt = async (
  psbt: string,
  options?: any
): Promise<string> => {
  checkUnisat()

  return await window.unisat.signPsbt(psbt, options)
}

export const signPsbts = async (
  psbts: string[],
  options?: any[]
): Promise<string[]> => {
  checkUnisat()

  return await window.unisat.signPsbts(psbts, options)
}

export const pushPsbt = async (psbt: string): Promise<string> => {
  checkUnisat()

  return await window.unisat.pushPsbt(psbt)
}
