import { ElMessage } from 'element-plus'
import { fetchBalance } from './proxy'
import { useConnectionStore } from '@/store'

export const getAddress = async () => {
  if (!window.okxwallet) {
    return ''
  }

  const account: {
    address: string
    publicKey: string
  } = await window.okxwallet.bitcoin.connect()

  if (!account) return ''

  const address = account.address
  if (
    address.startsWith('1') ||
    address.startsWith('3') ||
    address.startsWith('m') ||
    address.startsWith('n')
  ) {
    ElMessage.error('Please use a SegWit or Taproot address')
    throw new Error('Please use a SegWit or Taproot address')
  }

  return address
}

export const connect: () => Promise<string> = async () => {
  const account: {
    address: string
    publicKey: string
  } = await window.okxwallet.bitcoin.connect()
  if (account) {
    const address = account.address
    // if it's a legacy address(1... or m..., n...), throw error
    if (
      address.startsWith('1') ||
      address.startsWith('3') ||
      address.startsWith('m') ||
      address.startsWith('n')
    ) {
      throw new Error('Please use a SegWit or Taproot address')
    }

    return address
  }

  return ''
}

export const getBalance = async () => {
  if (!window.okxwallet) {
    ElMessage.warning('Please install the Okx wallet extension first.')
    throw new Error('Please install the Okx wallet extension first.')
  }

  const address = useConnectionStore().getAddress

  const balance: number = await fetchBalance(address).then(
    (balanceInfo) => balanceInfo.confirmed + balanceInfo.unconfirmed
  )
  return balance
}
