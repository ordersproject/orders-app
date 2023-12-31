import { defineStore } from 'pinia'
type BitcoinJs = typeof import('bitcoinjs-lib')
import { type ECPairAPI } from 'ecpair'
import { useLocalStorage, type RemovableRef } from '@vueuse/core'

import { type SimpleUtxoFromMempool } from './queries/proxy'
import { DEBUG } from '@/data/constants'

export const useGeoStore = defineStore('geo', {
  state: () => {
    return {
      pass: false,
    }
  },
})

export const useAddressStore = defineStore('address', {
  state: () => {
    return {
      address: undefined as string | undefined,
    }
  },

  getters: {
    get: (state) => {
      if (
        DEBUG &&
        import.meta.env.VITE_TESTING_ADDRESS &&
        import.meta.env.VITE_ENVIRONMENT === 'development'
      ) {
        return import.meta.env.VITE_TESTING_ADDRESS
      }

      return state.address
    },
  },

  actions: {
    set(address: string) {
      this.address = address
    },

    disconnect() {
      this.address = undefined
    },
  },
})

export const useFeebStore = defineStore('feeb', {
  state: () => {
    return {
      feeb: undefined as number | undefined,
    }
  },

  getters: {
    get: (state) => state.feeb,
  },

  actions: {
    set(feeb: number) {
      this.feeb = feeb
    },
  },
})

export type Network = 'livenet' | 'testnet'
export const useNetworkStore = defineStore('network', {
  state: () => {
    return {
      network: useLocalStorage('network', 'livenet') as RemovableRef<Network>,
    }
  },

  getters: {
    btcNetwork: (state) =>
      state.network === 'livenet' ? 'bitcoin' : 'testnet',
    ordersNetwork: (state) => state.network,
  },

  actions: {
    switch() {
      this.network = this.network === 'livenet' ? 'testnet' : 'livenet'
    },
    set(network: Network) {
      this.network = network
    },
  },
})

export const useBtcJsStore = defineStore('btcjs', {
  state: () => {
    return {
      btcjs: undefined as BitcoinJs | undefined,
      ECPair: undefined as ECPairAPI | undefined,
    }
  },

  getters: {
    get: (state) => state.btcjs,
  },

  actions: {
    set(btcjs: BitcoinJs) {
      this.btcjs = btcjs
    },
    setECPair(ECPair: ECPairAPI) {
      this.ECPair = ECPair
    },
  },
})

export type DummyUtxo = SimpleUtxoFromMempool & {
  txHex: string
}
export const useDummiesStore = defineStore('dummies', {
  state: () => {
    return {
      dummies: undefined as DummyUtxo[] | undefined,
    }
  },

  getters: {
    get: (state) => state.dummies,
    has: (state) => state.dummies !== undefined && state.dummies.length === 2,
  },

  actions: {
    set(dummies: DummyUtxo[]) {
      this.dummies = dummies
    },
  },
})

export const useCredentialsStore = defineStore('credentials', {
  state: () => {
    return {
      credentials: useLocalStorage(
        'credentials',
        [] as { publicKey: string; signature: string; address: string }[]
      ) as RemovableRef<
        { publicKey: string; signature: string; address: string }[]
      >,
    }
  },

  getters: {
    getByAddress: (state) => {
      return (address: string) => {
        return state.credentials.find((s) => s.address === address)
      }
    },

    has: (state) => {
      return (address: string) => {
        return !!state.credentials.find((s) => s.address === address)
      }
    },
  },

  actions: {
    add({
      publicKey,
      signature,
      address,
    }: {
      publicKey: string
      signature: string
      address: string
    }) {
      if (this.credentials.find((s) => s.address === address)) return

      this.credentials.push({ publicKey, signature, address })
    },

    remove(address: string) {
      this.credentials = this.credentials.filter((s) => s.address !== address)
    },
  },
})

export type WalletConnection = {
  wallet: 'unisat' | 'okx'
  address: string
  status: 'connected' | 'disconnected'
}
export const useConnectionStore = defineStore('connection', {
  state: () => {
    return {
      last: useLocalStorage(
        'last-connection',
        undefined as WalletConnection | undefined
      ) as RemovableRef<WalletConnection>,
    }
  },
})

export const useCooldownerStore = defineStore('cooldowner', {
  state: () => {
    return {
      instance: useLocalStorage('cooldowner', {}) as RemovableRef<{
        observing: {
          txId: string
          outputIndex: number
        }
      }>,
    }
  },

  actions: {
    start({
      observing,
    }: {
      observing: {
        txId: string
        outputIndex: number
      }
    }) {
      if (this.instance) return

      this.instance = { observing }
    },
  },
})
