<script lang="ts" setup>
import { useQuery } from '@tanstack/vue-query'
import { computed, inject, ref } from 'vue'
import { CopyIcon, HelpCircleIcon } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'

import { defaultPoolPair, selectedPoolPairKey } from '@/data/trading-pairs'
import { useAddressStore } from '@/store'
import { getMyStandbyRewardsEssential, getMyStandbys } from '@/queries/pool'
import { prettyBalance, prettyTxid } from '@/lib/formatters'
import { unit, useBtcUnit } from '@/lib/helpers'

import StandbyExplainModal from './StandbyExplainModal.vue'
import { EVENT_REWARDS_TICK } from '@/data/constants'

const selectedPair = inject(selectedPoolPairKey, defaultPoolPair)
const addressStore = useAddressStore()

const { data: standbys } = useQuery({
  queryKey: ['poolStandbys', { tick: selectedPair.fromSymbol }],
  queryFn: () => getMyStandbys({ tick: selectedPair.fromSymbol }),
  select: (data) => {
    return data
  },
  enabled: computed(() => !!addressStore.get),
})

const { data: eventRewardsEssential, isLoading: isLoadingRewardsEssential } =
  useQuery({
    queryKey: [
      'eventRewardsEssential',
      { address: addressStore.get as string, tick: selectedPair.fromSymbol },
    ],
    queryFn: () =>
      getMyStandbyRewardsEssential({
        address: addressStore.get as string,
        tick: selectedPair.fromSymbol,
      }),
    select: (data) => {
      return {
        ...data,
        total:
          data.totalRewardAmount +
          data.totalRewardExtraAmount -
          data.hadClaimRewardAmount,
      }
    },
    enabled: computed(() => !!addressStore.get),
  })

const onCopyOrderId = (orderId: string) => {
  navigator.clipboard.writeText(orderId)

  ElMessage.success('Order ID copied')
}

const isModelOpen = ref(false)
</script>

<template>
  <StandbyExplainModal v-model:is-open="isModelOpen" />

  <!-- title -->
  <div class="flex items-center gap-4">
    <h3 class="text-sm font-medium leading-6 text-zinc-300">
      My Standby Rewards
    </h3>
  </div>

  <!-- total -->
  <div class="mt-2 flex items-center gap-4">
    <div class="flex items-baseline gap- text-orange-300">
      <span class="font-bold text-lg">
        {{ isLoadingRewardsEssential ? '-' : eventRewardsEssential?.total }}
      </span>

      <span class="text-sm ml-1 uppercase">
        ${{ EVENT_REWARDS_TICK.toUpperCase() }}
      </span>
    </div>

    <!-- claim button -->
    <button
      class="rounded bg-orange-300 text-orange-950 px-4 py-1 shadow-md shadow-orange-300/20 text-sm hover:shadow-orange-300/50 disabled:opacity-30 disabled:saturate-50 disabled:shadow-none"
      @click=""
      :disabled="!eventRewardsEssential || eventRewardsEssential.total === 0"
      v-if="eventRewardsEssential && eventRewardsEssential.total > 0"
    >
      Claim
    </button>

    <el-tooltip
      content="You need to pay a small amount of gas for claiming rewards."
      placement="bottom"
      effect="light"
    >
      <HelpCircleIcon class="box-content h-4 w-4 pr-2 text-zinc-300" />
    </el-tooltip>
  </div>

  <div class="h-[40vh] overflow-y-auto nicer-scrollbar pr-2 mt-8">
    <button
      class="text-zinc-300 mb-2 hover:underline hover:text-orange-300"
      @click="isModelOpen = true"
    >
      What are these records?
    </button>

    <table
      class="min-w-full text-center border-separate border-spacing-0"
      v-if="standbys?.length"
    >
      <thead>
        <tr>
          <th
            scope="col"
            class="py-3.5 pl-4 pr-3 text-center text-sm font-semibold text-orange-300 sm:pl-0 sticky top-0 z-10 border-b-2 border-zinc-500 bg-zinc-900/80"
          >
            Order ID
          </th>
          <th
            scope="col"
            class="px-3 py-3.5 text-center text-sm font-semibold text-orange-300 sticky top-0 z-10 border-b-2 border-zinc-500 bg-zinc-900/80"
          >
            Amount
          </th>

          <th
            scope="col"
            class="px-3 py-3.5 text-center text-sm font-semibold text-orange-300 sticky top-0 z-10 border-b-2 border-zinc-500 bg-zinc-900/80"
          >
            #Day
          </th>

          <th
            scope="col"
            class="px-3 py-3.5 text-center text-sm font-semibold text-orange-300 sticky top-0 z-10 border-b-2 border-zinc-500 bg-zinc-900/80"
          >
            Percentage
          </th>
          <th
            scope="col"
            class="px-3 py-3.5 text-center text-sm font-semibold text-orange-300 sticky top-0 z-10 border-b-2 border-zinc-500 bg-zinc-900/80"
          >
            Reward
          </th>
        </tr>
      </thead>

      <tbody class="">
        <tr
          v-for="standby in standbys"
          :key="standby.orderId"
          v-if="standbys?.length"
        >
          <td
            class="whitespace-nowrap py-5 pl-4 pr-3 text-sm sm:pl-0 border-b border-zinc-700"
          >
            <div class="flex items-center justify-center gap-2">
              <div class="font-medium text-zinc-100">
                {{ prettyTxid(standby.orderId) }}
              </div>
              <button
                title="copy order id"
                @click="onCopyOrderId(standby.orderId)"
              >
                <CopyIcon class="w-4 h-4 text-zinc-500 hover:text-orange-300" />
              </button>
            </div>
          </td>
          <td
            class="whitespace-nowrap px-3 py-5 text-sm border-b border-zinc-700"
          >
            <div class="text-zinc-100">
              {{ standby.fromOrderCoinAmount + ' $' + standby.fromOrderTick }}
            </div>
            <div class="mt-1 text-zinc-100">
              {{ prettyBalance(standby.fromOrderAmount, useBtcUnit) }}
              {{ unit }}
            </div>
          </td>

          <td
            class="whitespace-nowrap px-3 py-5 text-sm border-b border-zinc-700"
          >
            {{ standby.calBigBlock }}
          </td>

          <td
            class="whitespace-nowrap px-3 py-5 text-sm border-b border-zinc-700"
          >
            {{ (standby.percentage / 100).toFixed(2) }}%
          </td>
          <td
            class="whitespace-nowrap px-3 py-5 text-sm border-b border-zinc-700"
          >
            {{ standby.rewardAmount }}
          </td>
        </tr>
      </tbody>
    </table>

    <div class="flex items-center justify-center text-zinc-500 mt-36" v-else>
      No Records Currently.
    </div>
  </div>
</template>
