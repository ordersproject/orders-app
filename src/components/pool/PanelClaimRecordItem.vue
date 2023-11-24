<script lang="ts" setup>
import { prettyTimestamp, prettyTxid } from '@/lib/formatters'
import { toTx } from '@/lib/helpers'
import { type RewardsClaimRecord } from '@/queries/pool'
import { ExternalLinkIcon } from 'lucide-vue-next'
import { computed } from 'vue'

const { record } = defineProps<{
  record: RewardsClaimRecord
}>()
</script>

<template>
  <div class="py-4 mx-4 bg-zinc-950 rounded-lg px-4">
    <!-- order id -->
    <span class="text-zinc-500 text-xs"># {{ record.orderId }}</span>

    <!-- order amount & timestamp -->
    <div class="items-center flex justify-between mt-4">
      <div class="">
        <div class="flex items-center gap-2">
          <span class="text-orange-300">
            {{ `${record.rewardCoinAmount} ${record.tick.toUpperCase()}` }}
          </span>

          <span class="text-zinc-500 text-xs">
            {{ `${prettyTimestamp(record.timestamp)}` }}
          </span>
        </div>

        <div class="flex mt-2 items-center gap-2" v-if="record.sendId">
          <span class="text-zinc-500 text-xs">Claim Tx</span>

          <div
            class="flex items-center gap-2 hover:cursor-pointer"
            @click="toTx(record.sendId)"
          >
            <span class="hover:text-orange-300 underline">
              {{ prettyTxid(record.sendId, 4) }}
            </span>

            <ExternalLinkIcon class="inline-block w-4 h-4" />
          </div>
        </div>
      </div>

      <!-- order state -->
      <span
        class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-900 capitalize"
        :class="[
          record.rewardState === 'pending' ? 'text-zinc-500' : 'text-green-500',
        ]"
      >
        {{ record.rewardState }}
      </span>
    </div>
  </div>
</template>
