<script lang="ts" setup>
import { useQuery } from '@tanstack/vue-query'
import { computed, inject, ref } from 'vue'
import { CopyIcon } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'

import { defaultPoolPair, selectedPoolPairKey } from '@/data/trading-pairs'
import { useAddressStore } from '@/store'
import { getMyStandbys } from '@/queries/pool'
import { prettyBalance, prettyTxid } from '@/lib/formatters'
import { unit, useBtcUnit } from '@/lib/helpers'

import StandbyExplainModal from './StandbyExplainModal.vue'

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

const onCopyOrderId = (orderId: string) => {
  navigator.clipboard.writeText(orderId)

  ElMessage.success('Order ID copied')
}

const isModelOpen = ref(false)
</script>

<template>
  <StandbyExplainModal v-model:is-open="isModelOpen" />

  <div class="h-[50vh] overflow-y-auto nicer-scrollbar pr-2">
    <button
      class="text-zinc-300 mb-2 hover:underline hover:text-orange-300"
      @click="isModelOpen = true"
    >
      What are these records?
    </button>

    <table class="min-w-full text-center border-separate border-spacing-0">
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
  </div>
</template>
