import { useNetworkStore } from './store'

export const getOrdiBalance = async (
  address: string,
  network: 'livenet' | 'testnet'
) => {
  // fake data for testnet
  if (network === 'testnet') {
    // randomize, from 5 to 100
    const fakeBalance = Math.floor(Math.random() * 95) + 5
    return fakeBalance
  }

  // real data for livenet
  return 1
}

export type BidCandidate = {
  inscriptionId: string
  inscriptionNumber: string
  coinAmount: string
}
export const getBidCandidates = async (
  network: 'livenet' | 'testnet',
  tick: string
): Promise<BidCandidate[]> => {
  const candidates: BidCandidate[] = await fetch(
    `https://api.ordbook.io/book/brc20/order/bid/pre?net=${network}&tick=${tick}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
    .then((res) => res.json())
    .then(({ data: { availableList } }) => availableList)

  return candidates
}

export const getBidCandidateInfo = async ({
  network,
  tick,
  inscriptionId,
  inscriptionNumber,
  coinAmount,
  total,
}: {
  network: 'livenet' | 'testnet'
  tick: string
  inscriptionId: string
  inscriptionNumber: string
  coinAmount: string | number
  total: number
}): Promise<{
  net: 'livenet' | 'testnet'
  tick: string
  psbtRaw: string
}> => {
  const candidateInfo = await fetch(
    `https://api.ordbook.io/book/brc20/order/bid?net=${network}&tick=${tick}&inscriptionId=${inscriptionId}&inscriptionNumber=${inscriptionNumber}&coinAmount=${coinAmount}&total=${total}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
    .then((res) => res.json())
    .then(({ data: candidateInfo }) => candidateInfo)

  return candidateInfo
}

export const pushBidOrder = async ({
  network,
  address,
  tick,
  psbtRaw,
  feeb,
  total,
}: {
  network: 'livenet' | 'testnet'
  address: string
  tick: string
  psbtRaw: string
  feeb: number
  total: number
}) => {
  const createEndpoint = `https://api.ordbook.io/book/brc20/order/bid/push`
  const createRes = await fetch(createEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      net: network,
      address,
      tick,
      psbtRaw,
      rate: feeb,
      amount: total,
    }),
  }).then((res) => res.json())

  return createRes
}

export type SimpleUtxoFromMempool = {
  txId: string
  satoshis: number
  outputIndex: number
  addressType: any
}
export const getUtxos2 = async (address: string) => {
  const network = useNetworkStore().network

  const url = `https://ordex.riverrun.online/api/utxos2?address=${address}&network=${network}`
  const paymentUtxos: SimpleUtxoFromMempool[] = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((res) => res.json())
    .then((utxos) => {
      return utxos.map((utxo: any) => {
        return {
          txId: utxo.txid,
          satoshis: utxo.value,
          outputIndex: utxo.vout,
          addressType: utxo.addressType || 2,
        }
      })
    })

  return paymentUtxos
}
