<script lang="ts" setup>
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'

import { getMyStandbyRewardsClaimRecords } from '@/queries/pool'
import { useAddressStore } from '@/store'
import { EVENT_REWARDS_TICK } from '@/data/constants'

import PanelClaimRecordItem from '@/components/pool/PanelClaimRecordItem.vue'

const addressStore = useAddressStore()

const { data: records, isLoading: isLoadingRecords } = useQuery({
  queryKey: [
    'standbyRewardsClaimRecords',
    { address: addressStore.get as string, tick: EVENT_REWARDS_TICK },
  ],
  queryFn: () =>
    getMyStandbyRewardsClaimRecords({
      tick: EVENT_REWARDS_TICK,
    }),
  select: (data) => {
    return data
  },
  enabled: computed(() => !!addressStore.get),
})
</script>

<template>
  <div class="">
    <div
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
    </div>
  </div>
</template>
