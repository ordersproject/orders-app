<script lang="ts" setup>
import Decimal from 'decimal.js'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import { computed } from 'vue'
import { ExternalLinkIcon, ChevronRightIcon } from 'lucide-vue-next'

import { prettyTimestamp, prettyTxid } from '@/lib/formatters'
import { type ReleaseHistory } from '@/queries/pool'
import { POOL_REWARDS_TICK } from '@/data/constants'
import { toTx } from '@/lib/helpers'

const props = defineProps<{
  record: ReleaseHistory
}>()

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
          )} sat`
        }}
      </span>
      <span class="text-orange-300" v-else>
        {{ `${record.coinAmount} ${record.tick.toUpperCase()}` }}
      </span>

      <span class="text-zinc-500 text-sm">
        {{ `${prettyTimestamp(record.dealTime)}` }}
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
              )} sat`
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

        <div class="flex items-baseline">
          <span class="w-32 inline-block text-zinc-500 shrink-0">Rewards</span>

          <Disclosure
            v-if="record.rewardRealAmount"
            as="div"
            v-slot="{ open }"
            class="grow"
          >
            <DisclosureButton class="flex items-center gap-2">
              <span>
                {{
                  `${
                    record.rewardRealAmount
                  } ${POOL_REWARDS_TICK.toUpperCase()}`
                }}
              </span>

              <ChevronRightIcon
                class="w-4"
                :class="open && 'rotate-90 transform'"
              />
            </DisclosureButton>

            <DisclosurePanel
              class="text-gray-500 bg-black rounded-md px-2 py-2 space-y-2 mt-0.5"
            >
              <div class="">
                <span>=</span>
                <span class="inline-flex items-center gap-1 ml-1">
                  <span>{{ record.rewardAmount }}</span>
                  <span
                    class="text-xs bg-zinc-700/30 px-2 py-0.5 rounded text-orange-300"
                  >
                    base amount
                  </span>
                </span>
              </div>

              <div class="">
                <span>*</span>
                <span class="inline-flex items-center gap-1 ml-1">
                  <span>(100% - {{ record.decreasing }}%</span>
                  <span
                    class="text-xs bg-red-900/30 px-2 py-0.5 rounded text-red-700"
                  >
                    decrease % over time
                  </span>
                  <span>)</span>
                </span>
              </div>

              <div class="">
                <span>+</span>
                <span class="inline-flex items-center gap-1 ml-1">
                  <span>{{ record.rewardExtraAmount }}</span>
                  <span
                    class="text-xs bg-cyan-900/30 px-2 py-0.5 rounded text-cyan-700"
                  >
                    long standby time bonus
                  </span>
                </span>
              </div>
            </DisclosurePanel>
          </Disclosure>

          <span v-else> -</span>

          <!-- <div class="text-xs text-zinc-500">
              <span
                >{{ record.rewardAmount }} * (1 -
                {{ record.decreasing }}%)</span
              >
            </div> -->
        </div>

        <div class="flex items-center">
          <span class="w-32 inline-block text-zinc-500">Tx Record</span>
          <div
            class="flex items-center gap-2 hover:cursor-pointer"
            @click="toTx(record.releaseTx)"
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
