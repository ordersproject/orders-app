import { defineStore } from 'pinia'

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
