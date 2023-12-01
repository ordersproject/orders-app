<script lang="ts" setup>
import { useQuery } from '@tanstack/vue-query'
import { computed, inject } from 'vue'

import { defaultPoolPair, selectedPoolPairKey } from '@/data/trading-pairs'
import { useAddressStore } from '@/store'
import { getMyStandbys } from '@/queries/pool'
import { prettyTxid } from '@/lib/formatters'
import { CopyIcon } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'

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
</script>

<template>
  <div class="h-[50vh] overflow-y-auto nicer-scrollbar pr-2">
    <table class="min-w-full divide-y divide-zinc-300 text-center">
      <thead>
        <tr>
          <th
            scope="col"
            class="py-3.5 pl-4 pr-3 text-center text-sm font-semibold text-zinc-100 sm:pl-0"
          >
            Order ID
          </th>
          <th
            scope="col"
            class="px-3 py-3.5 text-center text-sm font-semibold text-zinc-100"
          >
            Amount
          </th>

          <th
            scope="col"
            class="px-3 py-3.5 text-center text-sm font-semibold text-zinc-100"
          >
            Percentage
          </th>
          <th
            scope="col"
            class="px-3 py-3.5 text-center text-sm font-semibold text-zinc-100"
          >
            Reward
          </th>
        </tr>
      </thead>

      <tbody class="divide-y divide-zinc-200">
        <tr
          v-for="standby in standbys"
          :key="standby.orderId"
          v-if="standbys?.length"
        >
          <td class="whitespace-nowrap py-5 pl-4 pr-3 text-sm sm:pl-0">
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
          <td class="whitespace-nowrap px-3 py-5 text-sm">
            <div class="text-zinc-100">
              {{ standby.fromOrderCoinAmount + ' $' + standby.fromOrderTick }} /
              {{ standby.fromOrderAmount }}
            </div>
            <!-- <div class="mt-1 text-zinc-500">{{ standby.department }}</div> -->
          </td>

          <td class="whitespace-nowrap px-3 py-5 text-sm">
            {{ (standby.percentage / 100).toFixed(2) }}%
          </td>
          <td class="whitespace-nowrap px-3 py-5 text-sm">
            {{ standby.rewardAmount }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
