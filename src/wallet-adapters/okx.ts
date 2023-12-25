import { ElMessage } from 'element-plus'

import { fetchBalance } from '@/queries/proxy'
import { useBtcJsStore } from '@/stores/btcjs'
import { useConnectionStore } from '@/stores/connection'
import { generateRandomString } from '@/lib/helpers'
import { OKX_TEMPLATE_PSBT } from '@/data/constants'

function checkOkx() {
  if (!window.okxwallet) {
    ElMessage.warning('Please install the Okx wallet extension first.')
    throw new Error('Please install the Okx wallet extension first.')
  }
}

export function initPsbt() {
  const bitcoinJs = useBtcJsStore().get!

  // use templatePsbt otherwise for okx
  return bitcoinJs.Psbt.fromHex(OKX_TEMPLATE_PSBT)
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

export const connect: () => Promise<{
  address: string
  pubKey: string
}> = async () => {
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

    return {
      address,
      pubKey: account.publicKey,
    }
  }

  return {
    address: '',
    pubKey: '',
  }
}

export const disconnect = async () => {
  await window.okxwallet.bitcoin.disconnect()
}

export const getBalance = async () => {
  checkOkx()

  const address = useConnectionStore().getAddress

  const balance: number = await fetchBalance(address).then(
    (balanceInfo) =>
      Math.round(balanceInfo.confirmed) + Math.round(balanceInfo.unconfirmed)
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

export const signPsbt = async (psbt: string, options?: any) => {
  checkOkx()

  const address = useConnectionStore().getAddress

  // if (options && options.type === 'list') {
  //   // modify psbt to comply with okxwallet
  //   const bitcoinjs = useBtcJsStore().get!
  //   const templatePsbt = bitcoinjs.Psbt.fromHex(OKX_TEMPLATE_PSBT)
  //   const toSign = bitcoinjs.Psbt.fromHex(psbt)
  //   const toSignPsbtInputs = toSign.data.inputs
  //   const toSignPsbtOutputs = toSign.data.outputs
  //   templatePsbt.addInputs(toSignPsbtInputs as any)
  //   templatePsbt.addOutputs(toSignPsbtOutputs as any)
  //   // for (const input of templatePsbt.txInputs) {
  //   //   psbt = psbt.replace(input.hash, input.hash.reverse().toString('hex'))
  //   // }

  //   console.log({ templatePsbt })
  // }
  const psbtObj = useBtcJsStore().get!.Psbt.fromHex(psbt)
  const goodStr =
    '70736274ff0100e8020000000300000000000000000000000000000000000000000000000000000000000000000000000000ffffffff00000000000000000000000000000000000000000000000000000000000000000100000000ffffffff349c4f6bc87d9c142451754fd5a08ba65fdb1459cdf34cbb3bafcc537a75ffec0000000000ffffffff0300000000000000001976a914000000000000000000000000000000000000000088ac00000000000000001976a914000000000000000000000000000000000000000088aca086010000000000160014e0acb86393de998d6837c7f77725a285dbf60fb4000000000001011f0000000000000000160014ae47938f7acd1623e6e10e1ebcc33c2a7cb6e30d0001011f0000000000000000160014ae47938f7acd1623e6e10e1ebcc33c2a7cb6e30d0001011f2202000000000000160014e0acb86393de998d6837c7f77725a285dbf60fb40103048300000000000000'
  const good = useBtcJsStore().get!.Psbt.fromHex(goodStr)

  const signed = await window.okxwallet.bitcoin.signPsbt(psbt, {
    from: address,
  })

  console.log({ equal: psbt === signed })

  return signed
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

  // extract raw tx from psbt
  const bitcoinjs = useBtcJsStore().get!
  const psbtObj = bitcoinjs.Psbt.fromHex(psbt)
  const txHex = psbtObj.extractTransaction().toHex()

  return await window.okxwallet.bitcoin
    .sendPsbt(
      [
        {
          itemId: randomId,
          signedTx: txHex,
          type: 52,
        },
      ],
      address
    )
    .then((res) => {
      return res[0][randomId]
    })
}
