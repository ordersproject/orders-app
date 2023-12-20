<script lang="ts" setup>
import { computed, ref } from 'vue'

import { useAddressStore } from '@/store'

import PairSelect from './PairSelect.vue'
import Echart from '@/components/orders/Echart.vue'
defineProps(['isLimitExchangeMode'])
defineEmits(['update:isLimitExchangeMode'])

const addressStore = useAddressStore()
const isOpen = ref(false)
const inWhitelist = computed(() => {
  return addressStore.get
})
</script>

<template>
  <div
    class="flex items-center justify-between border-b border-orange-200/40 px-4 py-2"
  >
    <!-- pair select -->
    <div class="col-span-2 flex items-center justify-center gap-2">
      <PairSelect />
      <button
        class="col-span-2 rounded-md bg-black px-4 py-2.5 text-sm transition-all hover:bg-opacity-80"
        @click="isOpen = true"
      >
        <span class="font-bold text-orange-300">Kline</span>
      </button>
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
        v-if="inWhitelist"
      >
        Create Order
      </button>
    </div>
  </div>
  <Echart :isOpen="isOpen"></Echart>
</template>
