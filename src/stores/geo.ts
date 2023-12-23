import { defineStore } from 'pinia'

export const useGeoStore = defineStore('geo', {
  state: () => {
    return {
      pass: false,
    }
  },
})
