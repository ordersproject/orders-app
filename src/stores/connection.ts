import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { Psbt } from 'bitcoinjs-lib'

import * as unisatAdapter from '@/wallet-adapters/unisat'
import * as okxAdapter from '@/wallet-adapters/okx'
import * as metaletAdapter from '@/wallet-adapters/metalet'
import { login } from '@/queries/orders-api'

function getWalletAdapter(wallet: Wallet) {
  switch (wallet) {
    case 'unisat':
      return unisatAdapter
    case 'okx':
      return okxAdapter
    case 'metalet':
      return metaletAdapter
    default:
      throw new Error(`Unsupported wallet: ${wallet}`)
  }
}

export type Wallet = 'unisat' | 'okx' | 'metalet'
export type WalletConnection = {
  wallet: Wallet
  status: 'connected' | 'disconnected'
  address: string
  pubKey: string
}
export const useConnectionStore = defineStore('connection', {
  state: () => {
    return {
      last: useLocalStorage('last-connection', {
        wallet: 'unisat',
        status: 'disconnected',
        address: '',
        pubKey: '',
      } as WalletConnection),
    }
  },

  getters: {
    has: (state) => !!state.last,
    connected: (state) =>
      state.last.status === 'connected' && !!state.last.address,
    getAddress: (state) => state.last.address,
    getPubKey: (state) => state.last.pubKey,
    provider: (state) => {
      if (!state.last) return null

      return state.last.wallet === 'unisat' ? window.unisat : window.okxwallet
    },
    adapter: (state) => {
      if (!state.last) throw new Error('No connection')

      const adapter: {
        initPsbt: () => Psbt
        finishPsbt: (psbt: string) => string
        getAddress: () => Promise<string>
        connect: () => Promise<{
          address: string
          pubKey: string
        }>
        disconnect: () => Promise<void>
        getBalance: () => Promise<number>
        inscribe: (tick: string) => Promise<string>
        signPsbt: (psbt: string, options?: any) => Promise<string>
        signPsbts: (psbts: string[], options?: any) => Promise<string[]>
        pushPsbt: (psbt: string) => Promise<string>
      } = getWalletAdapter(state.last.wallet)

      return adapter
    },
  },

  actions: {
    async connect(wallet: Wallet) {
      const connection: WalletConnection = this.last
        ? (JSON.parse(JSON.stringify(this.last)) as WalletConnection)
        : {
          wallet,
          status: 'connected',
          address: '',
          pubKey: '',
        }

      const connectRes = await this.adapter.connect()

      if (connectRes) {
        connection.address = connectRes.address
        connection.pubKey = connectRes.pubKey

        connection.status = 'connected'
        connection.wallet = wallet

        this.last = connection

        await login()
      }


      return this.last
    },

    async sync() {
      // get address again from wallet
      if (!this.connected) return

      const address = await this.adapter.getAddress()
      this.last.status = 'connected'
      this.last.address = address

      await login()

      return this.last
    },

    async disconnect() {
      if (!this.last) return

      if (this.last.wallet === 'okx') {
        this.adapter.disconnect()
      }

      this.last.status = 'disconnected'
      this.last.address = ''
      this.last.pubKey = ''
    },
  },
})
