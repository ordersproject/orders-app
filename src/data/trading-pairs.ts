import btcLogo from '@/assets/btc.svg?url'
import rdexLogo from '@/assets/rdex.png?url'
import ordiLogo from '@/assets/ordi.svg?url'
import oxbtLogo from '@/assets/oxbt.png?url'
import satsLogo from '@/assets/sats.jpg?url'
import grumLogo from '@/assets/grum.png?url'
import vmpxLogo from '@/assets/vmpx.jpg?url'
import tracLogo from '@/assets/trac.png?url'
import saycLogo from '@/assets/sayc.jpg?url'
import fishLogo from '@/assets/fish.jpg?url'
import catsLogo from '@/assets/cats.jpg?url'
import btcsLogo from '@/assets/btcs.jpg?url'
import ibtcLogo from '@/assets/ibtc.jpg?url'
import biliLogo from '@/assets/bili.jpg?url'
import ratsLogo from '@/assets/rats.jpg?url'

import { useRoute } from 'vue-router'
import { InjectionKey } from 'vue'

const tradingPairs = [
  {
    id: 1,
    fromSymbol: 'rdex',
    exactName: 'RDEX',
    toSymbol: 'btc',
    fromIcon: rdexLogo,
    toIcon: btcLogo,
    hasPool: true,
    usePool: true,
    hasEvent: false,
  },
  {
    id: 2,
    fromSymbol: 'ordi',
    exactName: 'ordi',
    toSymbol: 'btc',
    fromIcon: ordiLogo,
    toIcon: btcLogo,
    hasPool: true,
  },
  {
    id: 3,
    fromSymbol: 'oxbt',
    exactName: 'OXBT',
    toSymbol: 'btc',
    fromIcon: oxbtLogo,
    toIcon: btcLogo,
    hasPool: true,
  },
  {
    id: 4,
    fromSymbol: 'sats',
    exactName: 'sats',
    toSymbol: 'btc',
    fromIcon: satsLogo,
    toIcon: btcLogo,
    useDecimals: 16,
    hasPool: true,
  },
  {
    id: 5,
    fromSymbol: 'rats',
    exactName: 'rats',
    toSymbol: 'btc',
    fromIcon: ratsLogo,
    toIcon: btcLogo,
    hasPool: true,
  },
  {
    id: 6,
    fromSymbol: 'vmpx',
    exactName: 'VMPX',
    toSymbol: 'btc',
    fromIcon: vmpxLogo,
    toIcon: btcLogo,
    hasPool: true,
  },
  {
    id: 7,
    fromSymbol: 'trac',
    exactName: 'trac',
    toSymbol: 'btc',
    fromIcon: tracLogo,
    toIcon: btcLogo,
  },

  {
    id: 8,
    fromSymbol: 'btcs',
    exactName: 'BTCs',
    toSymbol: 'btc',
    fromIcon: btcsLogo,
    toIcon: btcLogo,
    hasPool: true,
  },
  {
    id: 9,
    fromSymbol: 'ibtc',
    exactName: 'IBTC',
    toSymbol: 'btc',
    fromIcon: ibtcLogo,
    toIcon: btcLogo,
    hasPool: true,
  },
  {
    id: 10,
    fromSymbol: 'bili',
    exactName: 'bili',
    toSymbol: 'btc',
    fromIcon: biliLogo,
    toIcon: btcLogo,
    hasPool: true,
  },
  {
    id: 11,
    fromSymbol: 'cats',
    exactName: 'cats',
    toSymbol: 'btc',
    fromIcon: catsLogo,
    toIcon: btcLogo,
    hasPool: true,
  },
  {
    id: 12,
    fromSymbol: 'fish',
    exactName: 'fish',
    toSymbol: 'btc',
    fromIcon: fishLogo,
    toIcon: btcLogo,
    hasPool: true,
  },
  {
    id: 14,
    fromSymbol: 'sayc',
    exactName: 'sayc',
    toSymbol: 'btc',
    fromIcon: saycLogo,
    toIcon: btcLogo,
  },
  {
    id: 15,
    fromSymbol: 'orxc',
    toSymbol: 'btc',
    fromIcon: rdexLogo,
    toIcon: btcLogo,
    hasPool: true,
  },
] as {
  id: number
  fromSymbol: string
  exactName: string
  toSymbol: string
  fromIcon: string
  toIcon: string
  hasPool?: boolean
  usePool?: boolean
  useDecimals?: number
  isNew?: boolean
  hasEvent?: boolean
}[]

export default tradingPairs

export type TradingPair = (typeof tradingPairs)[0]

export const defaultPair = tradingPairs[0]
export const defaultPoolPair = tradingPairs.filter((pair) => pair.hasPool)[0]

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
