<script lang="ts" setup>
import { useQuery } from '@tanstack/vue-query'
import { computed, inject } from 'vue'

import { defaultPoolPair, selectedPoolPairKey } from '@/data/trading-pairs'
import { getMyUsedPoolRecords } from '@/queries/pool'
import { useAddressStore } from '@/store'

import PanelReleaseRecordItem from './PanelReleaseRecordItem.vue'

const selectedPair = inject(selectedPoolPairKey, defaultPoolPair)
const addressStore = useAddressStore()
const enabled = computed(() => !!addressStore.get)

const { data: poolRecords, isLoading: isLoadingPoolRecords } = useQuery({
  queryKey: [
    'poolReleasableRecords',
    {
      address: addressStore.get as string,
      tick: selectedPair.fromSymbol,
    },
  ],
  queryFn: () =>
    getMyUsedPoolRecords({
      address: addressStore.get as string,
      tick: selectedPair.fromSymbol,
    }),
  enabled,
})
</script>

<template>
  <div class="max-w-xl mx-auto h-[40vh] flex flex-col">
    <div class="flex items-center gap-4">
      <h3 class="text-base font-medium leading-6 text-zinc-300">
        My Pool Records
      </h3>
    </div>

    <div class="rounded mt-4 grow overflow-y-auto -mx-4 space-y-2">
      <p v-if="isLoadingPoolRecords" class="text-center pt-4 text-zinc-500">
        Loading...
      </p>

      <div
        class="flex items-center justify-center h-full text-zinc-500"
        v-else-if="!poolRecords || poolRecords.length === 0"
      >
        No Records Currently.
      </div>

      <PanelReleaseRecordItem
        v-for="record in poolRecords"
        :key="record.orderId"
        :record="record"
      />
    </div>
  </div>
</template>
