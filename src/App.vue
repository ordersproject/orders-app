<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { DEBUG } from './data/constants'
import { useBtcJsStore } from './store'

import TheHeader from '@/components/header/TheHeader.vue'
import NotAvailableOverlay from '@/components/overlays/NotAvailable.vue'

const btcJsStore = useBtcJsStore()

// After loaded, check if window width is less than 768px; if so, set isMobile to true
const isMobile = ref(false)

onMounted(async () => {
  if (window.innerWidth < 768) {
    isMobile.value = true
  }

  // initialize btcjs
  const btcjs = window.bitcoin
  const secp256k1 = await import('tiny-secp256k1')
  btcjs.initEccLib(secp256k1)
  btcJsStore.set(btcjs)

  // initialize related btc modules
  const ECPair = window.ecpair.ECPairFactory(secp256k1)
  btcJsStore.setECPair(ECPair)
})

// setup vue-query
import { useQueryClient } from '@tanstack/vue-query'
const queryClient = useQueryClient()
queryClient.setDefaultOptions({
  queries: {
    staleTime: 1000 * 30, // 30 seconds
  },
})
</script>

<template>
  <NotAvailableOverlay v-if="isMobile && !DEBUG" />

  <template v-else>
    <TheHeader />
    <router-view :key="$route.fullPath"></router-view>
  </template>
</template>

<style scoped></style>
