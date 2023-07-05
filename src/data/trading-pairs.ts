import btcLogo from '@/assets/btc.svg?url'
import rdexLogo from '@/assets/rdex.png?url'
import ordiLogo from '@/assets/ordi.svg?url'
import oxbtLogo from '@/assets/oxbt.png?url'
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
  {
    id: 3,
    fromSymbol: 'oxbt',
    toSymbol: 'btc',
    fromIcon: oxbtLogo,
    toIcon: btcLogo,
  },
  {
    id: 4,
    fromSymbol: 'sats',
    toSymbol: 'btc',
    fromIcon: btcLogo,
    toIcon: btcLogo,
  },
]

export default tradingPairs

export type TradingPair = (typeof tradingPairs)[0]

export const defaultPair = tradingPairs[0]

export const selectPair = () => {
  const route = useRoute()
  const params = route.params
  const pairRaw = (params.pair as string) || 'rdex-btc'
  const pairSymbols = pairRaw.split('-')

  return (
    tradingPairs.find(
      (pair) =>
        pair.fromSymbol === pairSymbols[0] && pair.toSymbol === pairSymbols[1]
    ) || tradingPairs[0]
  )
}

export const selectedPairKey = Symbol() as InjectionKey<TradingPair>
