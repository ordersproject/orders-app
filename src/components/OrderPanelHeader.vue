<script lang="ts" setup>
import btcLogo from '@/assets/btc.svg?url'
import orxcLogo from '@/assets/orxc.png?url'
import whitelist from '@/lib/whitelist'
import { useAddressStore } from '@/store'
import { computed } from 'vue'

defineProps(['isLimitExchangeMode'])
defineEmits(['update:isLimitExchangeMode'])

const addressStore = useAddressStore()

const inWhitelist = computed(() => {
  return addressStore.get && whitelist.includes(addressStore.get)
})
</script>

<template>
  <div
    class="grid grid-cols-6 items-center justify-between border-b border-zinc-300 px-4 py-2"
  >
    <!-- empty placeholder -->
    <div class="col-span-2"></div>

    <!-- title -->
    <div class="col-span-2 flex items-center justify-center gap-2">
      <div class="flex">
        <img :src="orxcLogo" class="h-8" />
        <img :src="btcLogo" class="-ml-2 h-8" />
      </div>

      <span class="font-bold">ORXC-BTC</span>
    </div>

    <!-- limit exchange button -->
    <div class="col-span-2 flex justify-end">
      <button
        class="col-span-2 rounded-md border px-4 py-2 text-sm transition hover:border-orange-300 hover:bg-orange-300 hover:text-white"
        :class="
          isLimitExchangeMode
            ? 'border-orange-300 bg-orange-300 text-orange-900'
            : 'border-zinc-300 text-zinc-300'
        "
        @click="$emit('update:isLimitExchangeMode', !isLimitExchangeMode)"
        v-if="inWhitelist"
      >
        Limit Exchange
      </button>
    </div>
  </div>
</template>
