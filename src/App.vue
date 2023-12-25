<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import * as secp256k1 from 'tiny-secp256k1'

import { DEBUG } from '@/data/constants'
import { useBtcJsStore } from '@/stores/btcjs'
import { useGeoStore } from '@/stores/geo'

import Toaster from '@/components/ui/toast/Toaster.vue'
import TheHeader from '@/components/header/TheHeader.vue'
import NotAvailableOverlay from '@/components/overlays/NotAvailable.vue'

const btcJsStore = useBtcJsStore()
const geoStore = useGeoStore()

// After loaded, check if window width is less than 768px; if so, set isMobile to true
const isMobile = ref(false)

onMounted(async () => {
  if (window.innerWidth < 768) {
    isMobile.value = true
  }

  // initialize btcjs
  const btcjs = window.bitcoin
  btcjs.initEccLib(secp256k1)
  btcJsStore.set(btcjs)

  // initialize related btc modules
  const ECPair = window.ecpair.ECPairFactory(secp256k1)
  btcJsStore.setECPair(ECPair)
})

const queryClient = useQueryClient()
queryClient.setDefaultOptions({
  queries: {
    staleTime: 1000 * 30, // 30 seconds
  },
})
</script>

<template>
  <Toaster />
  <NotAvailableOverlay v-if="isMobile && !DEBUG" />

  <template v-else>
    <TheHeader v-if="geoStore.pass" />
    <router-view :key="$route.fullPath"></router-view>
  </template>
</template>

<style scoped></style>
