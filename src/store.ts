import { defineStore } from 'pinia'
type BitcoinJs = typeof import('bitcoinjs-lib')
import { useLocalStorage } from '@vueuse/core'
import type { RemovableRef } from '@vueuse/core'
import { SimpleUtxoFromMempool } from './queries/orders-api'

export const useAddressStore = defineStore('address', {
  state: () => {
    return {
      address: undefined as string | undefined,
    }
  },

  getters: {
    get: (state) => state.address,
  },

  actions: {
    set(address: string) {
      this.address = address
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
    }
  },

  getters: {
    get: (state) => state.btcjs,
  },

  actions: {
    set(btcjs: BitcoinJs) {
      this.btcjs = btcjs
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

export const useFutureUtxosStore = defineStore('futureUtxos', {
  state: () => {
    return {
      utxos: [] as any[],
    }
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
  },
})
