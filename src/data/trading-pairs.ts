import btcLogo from '@/assets/btc.svg?url'
import rdexLogo from '@/assets/rdex.png?url'
import ordiLogo from '@/assets/ordi.svg?url'
import { useRoute } from 'vue-router'
import { InjectionKey } from 'vue'

const tradingPairs = [
  {
    id: 1,
    fromSymbol: 'rdex',
    toSymbol: 'btc',
    fromIcon: rdexLogo,
    toIcon: btcLogo,
  },
  {
    id: 2,
    fromSymbol: 'ordi',
    toSymbol: 'btc',
    fromIcon: ordiLogo,
    toIcon: btcLogo,
  },
]

export default tradingPairs

export type TradingPair = (typeof tradingPairs)[0]

export const defaultPair = tradingPairs[0]

export const selectPair = (pairRaw?: string) => {
  const route = useRoute()
  const params = route.params
  const pairSymbols = (pairRaw || (params.pair as string) || 'rdex-btc').split(
    '-'
  )

  return (
    tradingPairs.find(
      (pair) =>
        pair.fromSymbol === pairSymbols[0] && pair.toSymbol === pairSymbols[1]
    ) || tradingPairs[0]
  )
}

export const selectedPairKey = Symbol() as InjectionKey<TradingPair>
export const selectedPoolPairKey = Symbol() as InjectionKey<TradingPair>
