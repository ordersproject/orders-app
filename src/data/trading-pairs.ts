import btcLogo from '@/assets/btc.svg?url'
import rdexLogo from '@/assets/rdex.png?url'
import ordiLogo from '@/assets/ordi.svg?url'
import oxbtLogo from '@/assets/oxbt.png?url'
import satsLogo from '@/assets/sats.jpg?url'
import grumLogo from '@/assets/grum.png?url'
import vmpxLogo from '@/assets/vmpx.jpg?url'
import tracLogo from '@/assets/trac.png?url'
import lgerLogo from '@/assets/lger.jpg?url'

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
    fromIcon: satsLogo,
    toIcon: btcLogo,
  },
  {
    id: 5,
    fromSymbol: 'grum',
    toSymbol: 'btc',
    fromIcon: grumLogo,
    toIcon: btcLogo,
  },
  {
    id: 6,
    fromSymbol: 'vmpx',
    toSymbol: 'btc',
    fromIcon: vmpxLogo,
    toIcon: btcLogo,
  },
  {
    id: 7,
    fromSymbol: 'trac',
    toSymbol: 'btc',
    fromIcon: tracLogo,
    toIcon: btcLogo,
  },
  {
    id: 8,
    fromSymbol: 'lger',
    toSymbol: 'btc',
    fromIcon: lgerLogo,
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
