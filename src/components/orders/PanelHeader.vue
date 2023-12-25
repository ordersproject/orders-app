<script lang="ts" setup>
import { useConnectionStore } from '@/stores/connection'

import PairSelect from './PairSelect.vue'

defineProps(['isLimitExchangeMode'])
defineEmits(['update:isLimitExchangeMode'])

const connectionStore = useConnectionStore()
</script>

<template>
  <div
    class="flex items-center justify-between border-b border-orange-200/40 px-4 py-2"
  >
    <!-- pair select -->
    <div class="col-span-2 flex items-center justify-center gap-2">
      <PairSelect />
    </div>

    <!-- limit exchange button -->
    <div class="col-span-2 flex justify-end">
      <button
        class="col-span-2 rounded-md border px-4 py-2 text-sm transition hover:border-orange-300 hover:bg-orange-300 hover:text-white"
        :class="
          isLimitExchangeMode
            ? 'border-orange-300 bg-orange-300 text-orange-950'
            : 'border-zinc-300 text-zinc-300'
        "
        @click="$emit('update:isLimitExchangeMode', !isLimitExchangeMode)"
        v-if="connectionStore.connected"
      >
        Create Order
      </button>
    </div>
  </div>
</template>
