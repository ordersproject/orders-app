import { useAddressStore } from '../store'
import { ElMessage } from 'element-plus'

export const getAddress = async () => {
  if (!window.unisat) {
    return ''
    ElMessage.warning('Unisat not available')
    throw new Error('Unisat not available')
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

    useAddressStore().set(addresses[0])
    return addresses[0]
  }

  return ''
}

export const connect = async () => {
  const connectRes = await window.unisat.requestAccounts()
  if (connectRes && connectRes.length) {
    // if it's a legacy address(1... or m..., n...), throw error
    if (
      connectRes[0].startsWith('1') ||
      connectRes[0].startsWith('m') ||
      connectRes[0].startsWith('n')
    ) {
      ElMessage.error('Please use a SegWit address')
      return
    }

    useAddressStore().set(connectRes[0])

    return connectRes[0]
  }
}

export const getBalance = async () => {
  if (!window.unisat) {
    ElMessage.warning('Unisat not available')
    throw new Error('Unisat not available')
  }

  const balance: number = await window.unisat
    .getBalance()
    .then(
      (info: { confirmed: number; unconfirmed: number; total: number }) =>
        info.total
    )
  return balance
}
