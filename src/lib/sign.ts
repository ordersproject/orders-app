import { useAddressStore, useCredentialsStore } from '@/store'

export default async function sign() {
  const address = useAddressStore().get!
  const credentialsStore = useCredentialsStore()

  // read from store first.
  const credential = credentialsStore.getByAddress(address)
  if (credential) return credential

  // if not found, then sign and in store.
  const message = 'orders.exchange'
  // const doubleHash = bitcoin
  const publicKey = await window.unisat.getPublicKey()
  const signature = await window.unisat.signMessage(message)

  credentialsStore.add({ publicKey, signature, address })
  console.log({ publicKey, signature, address })

  return { publicKey, signature, address }
}
