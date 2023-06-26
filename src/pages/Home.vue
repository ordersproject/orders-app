<script lang="ts" setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'

import OrderPanel from '@/components/OrderPanel.vue'

const route = useRoute()

watch(
  () => route.params.pair,
  (toPair, previousPair) => {
    if (toPair !== previousPair) {
      // reload
      window.location.reload()
    }
  }
)
</script>

<template>
  <div class="mx-auto max-w-6xl bg-zinc-900 p-8">
    <OrderPanel />
  </div>
</template>
