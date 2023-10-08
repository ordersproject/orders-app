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
    'poolRecords',
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
      <!-- <el-popover
        placement="bottom-start"
        :width="400"
        trigger="hover"
        content="You can earn records by providing liquidity to the pool, which will be compensated in RDEX tokens. When you choose to claim your records, you simultaneously release your locked liquidity."
        popper-class="!bg-zinc-800 !text-zinc-300 !shadow-lg !shadow-orange-400/10 "
      >
        <template #reference>
          <HelpCircleIcon class="h-4 w-4 text-zinc-400" aria-hidden="true" />
        </template>
      </el-popover> -->
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
