import { useAddressStore } from '../store'
import { ElMessage } from 'element-plus'
import { login } from './orders-api'

export const getAddress = async () => {
  if (!window.unisat) {
    return ''
    ElMessage.warning('Please install the Unisat wallet extension first.')
    throw new Error('Please install the Unisat wallet extension first.')
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

    // login to orders api
    await login()

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

    // login to orders api
    await login()

    return connectRes[0]
  }
}

export const getBalance = async () => {
  if (!window.unisat) {
    ElMessage.warning('Please install the Unisat wallet extension first.')
    throw new Error('Please install the Unisat wallet extension first.')
  }

  const balance: number = await window.unisat
    .getBalance()
    .then(
      (info: { confirmed: number; unconfirmed: number; total: number }) =>
        info.total
    )
  return balance
}
