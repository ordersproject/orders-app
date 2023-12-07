import { useConnectionStore, useCredentialsStore } from '@/store'

export default async function sign() {
  const connection = useConnectionStore().last
  if (!connection.address || connection.status === 'disconnected') {
    throw new Error('Please connect to a wallet first.')
  }

  const address = useConnectionStore().getAddress
  const credentialsStore = useCredentialsStore()

  // read from store first.
  const credential = credentialsStore.getByAddress(address)

  if (credential) return credential

  // if not found, then sign and in store.
  const message = 'orders.exchange'

  let publicKey: string
  let signature: string

  if (connection.wallet === 'unisat') {
    publicKey = await window.unisat.getPublicKey()
    signature = await window.unisat.signMessage(message)
  } else {
    const account: {
      address: string
      publicKey: string
    } = await window.okxwallet.bitcoin.connect()

    publicKey = account.publicKey
    signature = await window.okxwallet.bitcoin.signMessage(message, {
      from: account.address,
    })
  }

  credentialsStore.add({ publicKey, signature, address })

  return { publicKey, signature, address }
}
