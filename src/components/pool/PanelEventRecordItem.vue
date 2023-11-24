<script lang="ts" setup>
import { prettyAddress, prettyBalance, prettyTimestamp } from '@/lib/formatters'
import { getMyEventRecords } from '@/queries/pool'
import { unit, useBtcUnit } from '@/lib/helpers'
import { EVENT_REWARDS_TICK } from '@/data/constants'
import { CopyIcon } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  record: Awaited<ReturnType<typeof getMyEventRecords>>[0]
}>()

const onCopyOrderId = () => {
  navigator.clipboard.writeText(props.record.orderId)

  ElMessage.success('Order ID copied')
}
</script>

<template>
  <div class="py-4 mx-4 bg-zinc-950 rounded-lg px-4">
    <h3 class="items-center flex justify-between">
      <span class="text-orange-300">
        {{
          `${record.coinAmount} ${record.tick.toUpperCase()} / ${prettyBalance(
            record.amount,
            useBtcUnit
          )} ${unit}`
        }}
      </span>

      <span class="text-zinc-500 text-sm">
        {{ `${prettyTimestamp(record.timestamp)}` }}
      </span>
    </h3>

    <div class="mt-4 flex items-center justify-between">
      <div class="text-sm space-y-2">
        <div class="flex items-center">
          <span class="w-40 shrink-0 inline-block text-zinc-500">Order ID</span>

          <div class="flex items-center gap-2">
            <div class="text-zinc-500">
              {{ prettyAddress(record.orderId, 6) }}
            </div>

            <button title="copy order id" @click="onCopyOrderId">
              <CopyIcon
                class="w-4 h-4 text-zinc-500 cursor-pointer hover:text-orange-300"
              />
            </button>
          </div>
        </div>

        <div class="flex items-center">
          <span class="w-40 shrink-0 inline-block text-zinc-500"
            >Deal Block</span
          >
          <span>
            {{ record.dealTxBlock || '-' }}
          </span>
        </div>

        <div class="flex items-center">
          <span class="w-40 shrink-0 inline-block text-zinc-500"
            >Reward Block Range</span
          >
          <span v-if="record.calStartBlock">
            {{ record.calStartBlock + ' - ' + record.calEndBlock }}
          </span>

          <span v-else>-</span>
        </div>

        <div class="flex items-center">
          <span class="w-40 shrink-0 inline-block text-zinc-500">Reward</span>
          <span
            class="font-bold text-orange-300"
            v-if="record.rewardRealAmount"
          >
            {{ record.rewardRealAmount }} {{ EVENT_REWARDS_TICK.toUpperCase() }}
          </span>
          <span v-else class="text-zinc-500">Calculating...</span>
        </div>

        <div class="flex items-center">
          <span class="w-40 shrink-0 inline-block text-zinc-500">Reward %</span>
          <span class="" v-if="record.percentage">
            {{ (record.percentage / 100).toFixed(2) }}%
          </span>
          <span v-else class="text-zinc-500">Calculating...</span>
        </div>
      </div>
    </div>
  </div>
</template>
