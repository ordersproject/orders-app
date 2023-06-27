<script setup lang="ts">
import { onMounted, ref } from 'vue'

import TheHeader from '@/components/TheHeader.vue'
import NotAvailableOverlay from '@/components/NotAvailableOverlay.vue'

// After loaded, check if window width is less than 768px; if so, set isMobile to true
const isMobile = ref(false)
onMounted(() => {
  if (window.innerWidth < 768) {
    isMobile.value = true
  }
})
</script>

<template>
  <NotAvailableOverlay v-if="isMobile" />

  <template v-else>
    <TheHeader />
    <router-view></router-view>
  </template>
</template>

<style scoped></style>
