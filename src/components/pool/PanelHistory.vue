<script lang="ts" setup>
import { useQuery } from '@tanstack/vue-query'
import { computed, inject } from 'vue'

import { defaultPoolPair, selectedPoolPairKey } from '@/data/trading-pairs'
import { getMyReleasedRecords } from '@/queries/pool'
import { useAddressStore } from '@/store'

import PanelReleaseHistoryItem from './PanelReleaseHistoryItem.vue'

const selectedPair = inject(selectedPoolPairKey, defaultPoolPair)
const addressStore = useAddressStore()
const enabled = computed(() => !!addressStore.get)

const { data: releaseHistory, isLoading: isLoadingReleaseHistory } = useQuery({
  queryKey: [
    'poolReleaseHistory',
    {
      address: addressStore.get as string,
      tick: selectedPair.fromSymbol,
    },
  ],
  queryFn: () =>
    getMyReleasedRecords({
      address: addressStore.get as string,
      tick: selectedPair.fromSymbol,
    }),
  enabled,
})
</script>

<template>
  <div class="max-w-xl mx-auto flex flex-col">
    <h3>
      <span class="text-zinc-500">Liquidity Usage History</span>
      <span class="text-sm text-zinc-300 pl-4"
        >({{ releaseHistory ? releaseHistory.length : 0 }})</span
      >
    </h3>
    <div
      class="rounded grow overflow-y-auto -mx-4 space-y-2 h-[40vh] nicer-scrollbar mt-4"
    >
      <p v-if="isLoadingReleaseHistory" class="text-center pt-4 text-zinc-500">
        Loading...
      </p>

      <div
        class="flex items-center justify-center h-full text-zinc-500"
        v-else-if="!releaseHistory || releaseHistory.length === 0"
      >
        No release history.
      </div>

      <PanelReleaseHistoryItem
        v-for="history in releaseHistory"
        :key="history.orderId"
        :record="history"
      />
    </div>
  </div>
</template>
