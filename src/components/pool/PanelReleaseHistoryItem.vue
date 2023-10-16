<script lang="ts" setup>
import Decimal from 'decimal.js'

import { prettyTimestamp, prettyTxid } from '@/lib/formatters'
import { type ReleaseHistory } from '@/queries/pool'
import { ExternalLinkIcon } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{
  record: ReleaseHistory
}>()

const toTx = () => {
  window.open(`https://mempool.space/tx/${props.record.releaseTx}`, '_blank')
}

const status = computed(() => {
  if (props.record.releaseTxBlock) {
    return 'confirmed'
  }

  return 'unconfirmed'
})
</script>

<template>
  <div class="py-4 mx-4 bg-zinc-950 rounded-lg px-4">
    <h3 class="items-center flex justify-between">
      <span class="text-orange-300" v-if="record.poolType === 3">
        {{
          `${record.coinAmount} ${record.tick.toUpperCase()} / ${new Decimal(
            record.amount
          ).dividedBy(1e8)} BTC`
        }}
      </span>
      <span class="text-orange-300" v-else>
        {{ `${record.coinAmount} ${record.tick.toUpperCase()}` }}
      </span>

      <span class="text-zinc-500 text-sm">
        {{ `${prettyTimestamp(record.timestamp)}` }}
      </span>
    </h3>

    <div class="mt-4 flex items-center justify-between">
      <div class="text-sm space-y-2">
        <div class="flex items-center">
          <span class="w-32 inline-block text-zinc-500">Type</span>
          <span>{{
            record.poolType === 3
              ? 'Bidirectional Liquidity'
              : 'Unidirectional Liquidity'
          }}</span>
        </div>

        <div class="flex items-center">
          <span class="w-32 inline-block text-zinc-500">Assets</span>
          <span v-if="record.poolType === 3">
            {{
              `${
                record.coinAmount
              } ${record.tick.toUpperCase()} / ${new Decimal(
                record.amount
              ).dividedBy(1e8)} BTC`
            }}
          </span>
          <span v-else>
            {{ `${record.coinAmount} ${record.tick.toUpperCase()}` }}
          </span>
        </div>

        <div class="flex items-center">
          <span class="w-32 inline-block text-zinc-500">Released At</span>
          <span>
            {{ prettyTimestamp(record.releaseTime) }}
          </span>
        </div>

        <div class="flex items-center">
          <span class="w-32 inline-block text-zinc-500">Tx Record</span>
          <div
            class="flex items-center gap-2 hover:cursor-pointer"
            @click="toTx"
          >
            <span class="hover:text-orange-300 underline">
              {{ prettyTxid(record.releaseTx, 4) }}
            </span>

            <ExternalLinkIcon class="inline-block w-4 h-4" />
          </div>
        </div>

        <div class="flex items-center">
          <span class="w-32 inline-block text-zinc-500">Status</span>
          <span
            class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-900 capitalize"
            :class="[
              status === 'unconfirmed' ? 'text-orange-300' : 'text-green-500',
            ]"
          >
            {{ status }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
