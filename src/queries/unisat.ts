import { ElMessage } from 'element-plus'

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

export const connect: () => Promise<string> = async () => {
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
