<script lang="ts" setup>
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import { useQuery } from '@tanstack/vue-query'
import { ChevronRightIcon } from 'lucide-vue-next'
import { computed, inject } from 'vue'

import { getMyRewardsClaimRecords } from '@/queries/pool'
import { defaultPoolPair, selectedPoolPairKey } from '@/data/trading-pairs'
import { useConnectionStore } from '@/stores/connection'

import PanelClaimRecordItem from '@/components/pool/PanelClaimRecordItem.vue'

const selectedPair = inject(selectedPoolPairKey, defaultPoolPair)
const connectionStore = useConnectionStore()

const { data: records, isLoading: isLoadingRecords } = useQuery({
  queryKey: [
    'poolRewardsClaimRecords',
    { address: connectionStore.getAddress, tick: selectedPair.fromSymbol },
  ],
  queryFn: () =>
    getMyRewardsClaimRecords({
      tick: selectedPair.fromSymbol,
    }),
  select: (data) => {
    return data
  },
  enabled: computed(() => connectionStore.connected),
})
</script>

<template>
  <div class="">
    <Disclosure v-slot="{ open }" :default-open="true">
      <DisclosureButton class="py-1 flex items-center gap-4">
        <span class="text-sm font-medium leading-6 text-zinc-300">
          Claim Records {{ records?.length ? `(${records.length})` : '' }}
        </span>

        <ChevronRightIcon
          class="h-4 w-4 text-zinc-500 ml-auto"
          :class="{ 'transform rotate-90': open }"
          aria-hidden="true"
        />
      </DisclosureButton>

      <transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-out"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <DisclosurePanel
          class="mt-4 grow overflow-y-auto space-y-2"
          :class="{ '-ml-4': records?.length }"
        >
          <template v-if="isLoadingRecords"> - </template>

          <template v-else-if="records?.length === 0">
            <div class="text-sm text-zinc-500">No records</div>
          </template>

          <template v-else>
            <PanelClaimRecordItem
              class=""
              v-for="record in records"
              :record="record"
              :key="record.orderId"
            />
          </template>
        </DisclosurePanel>
      </transition>
    </Disclosure>
  </div>
</template>
