import { getListingUtxos } from '@/queries/orders-api'
import { getUtxos } from '@/queries/proxy'
import { useQuery } from '@tanstack/vue-query'
import { ComputedRef } from 'vue'

export const useExcludedBalanceQuery = (
  address: ComputedRef<string | undefined>,
  enabled: ComputedRef<boolean>
) => {
  const queryFn = async () => {
    return Promise.all([getUtxos(address.value!), getListingUtxos()]).then(
      ([allUtxos, listing]) => {
        const listingUtxos = listing.map((l) => {
          const [txid, vout] = l.dummyId.split(':')
          return {
            txid,
            outputIndex: Number(vout),
          }
        })
        // const balance = allUtxos.reduce((acc, utxo) => {
        //   // filter out utxos that are in the listing
        //   const isExcluded = listingUtxos.some(
        //     (l) => l.txid === utxo.txId && l.outputIndex === utxo.outputIndex
        //   )

        //   if (isExcluded) {
        //     return acc
        //   }

        //   return acc + utxo.satoshis
        // }, 0)
        const biggestNotListingUtxo = allUtxos.reduce(
          (acc, utxo) => {
            // filter out utxos that are in the listing
            const isExcluded = listingUtxos.some(
              (l) => l.txid === utxo.txId && l.outputIndex === utxo.outputIndex
            )

            if (isExcluded) {
              return acc
            }

            if (utxo.satoshis > acc.satoshis) {
              return utxo
            }

            return acc
          },
          { satoshis: 0 }
        )
        console.log('biggestNotListingUtxo', biggestNotListingUtxo)

        return biggestNotListingUtxo.satoshis ?? 0
      }
    )
  }
  return useQuery({
    queryKey: ['excludedBalance', { address: address.value }],
    queryFn,
    enabled,
  })
}
