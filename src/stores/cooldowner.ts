import { defineStore } from 'pinia'
import { useLocalStorage, type RemovableRef } from '@vueuse/core'

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
