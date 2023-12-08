import { ElMessage } from 'element-plus'
import { fetchBalance } from './proxy'
import { useConnectionStore } from '@/store'
import { generateRandomString } from '@/lib/helpers'

function checkOkx() {
  if (!window.okxwallet) {
    ElMessage.warning('Please install the Okx wallet extension first.')
    throw new Error('Please install the Okx wallet extension first.')
  }
}

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
  checkOkx()

  const address = useConnectionStore().getAddress

  const balance: number = await fetchBalance(address).then(
    (balanceInfo) => balanceInfo.confirmed + balanceInfo.unconfirmed
  )
  return balance
}

export const inscribe = async (tick: string) => {
  checkOkx()

  const address = useConnectionStore().getAddress
  console.log({ tick })

  return await window.okxwallet.bitcoin.inscribe({
    type: 51,
    from: address,
    tick,
  })
}

export const signPsbt = async (psbt: string) => {
  checkOkx()

  const address = useConnectionStore().getAddress

  return await window.okxwallet.bitcoin.signPsbt(psbt, { from: address })
}

export const signPsbts = async (psbts: string[], options: any[]) => {
  checkOkx()

  const address = useConnectionStore().getAddress
  const signRes = []

  for (const psbt of psbts) {
    const signed = await window.okxwallet.bitcoin.signPsbt(psbt, {
      from: address,
    })
    signRes.push(signed)
  }

  return signRes
}

export const pushPsbt = async (psbt: string): Promise<string> => {
  checkOkx()

  const address = useConnectionStore().getAddress
  const randomId = generateRandomString(8)

  return await window.okxwallet.bitcoin
    .sendPsbt(
      [
        {
          itemId: randomId,
          signedTx: psbt,
          type: 52,
        },
      ],
      address
    )
    .then((res) => {
      return res[0][randomId]
    })
}
