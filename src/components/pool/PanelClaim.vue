<script lang="ts" setup>
import { defaultPair, selectedPoolPairKey } from '@/data/trading-pairs'
import { getMyPoolRewards } from '@/queries/pool'
import { useAddressStore } from '@/store'
import { useQuery } from '@tanstack/vue-query'
import { HelpCircleIcon } from 'lucide-vue-next'
import { computed, inject } from 'vue'
import PanelClaimRewardItem from './PanelClaimRewardItem.vue'

const selectedPair = inject(selectedPoolPairKey, defaultPair)
const addressStore = useAddressStore()
const enabled = computed(() => !!addressStore.get)

const { data: poolRewards } = useQuery({
  queryKey: [
    'poolRewards',
    {
      address: addressStore.get as string,
      tick: selectedPair.fromSymbol,
    },
  ],
  queryFn: () =>
    getMyPoolRewards({
      address: addressStore.get as string,
      tick: selectedPair.fromSymbol,
    }),
  enabled,
})
</script>

<template>
  <div class="max-w-xl mx-auto h-[40vh] flex flex-col">
    <h3 class="text-base font-medium leading-6 text-zinc-300">My Rewards</h3>

    <div class="rounded mt-4 grow overflow-y-auto -mx-4">
      <div
        class="flex items-center justify-center h-full text-zinc-500"
        v-if="!poolRewards || poolRewards.length === 0"
      >
        No Rewards Currently.
      </div>

      <PanelClaimRewardItem
        v-for="reward in poolRewards"
        :key="reward.orderId"
        :reward="reward"
      />
    </div>
  </div>
</template>
