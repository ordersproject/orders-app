<script lang="ts" setup>
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'
import { inject, ref } from 'vue'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import {
  HelpCircleIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
} from 'lucide-vue-next'

import { prettyBalance, prettyTimestamp, prettyTxid } from '@/lib/formatters'
import {
  type PoolRecord,
  getReleaseEssential,
  submitRelease,
} from '@/queries/pool'
import { useConnectionStore } from '@/store'
import {
  DEBUG,
  POOL_REWARDS_TICK,
  SIGHASH_SINGLE_ANYONECANPAY,
} from '@/data/constants'
import { buildReleasePsbt } from '@/lib/order-pool-builder'
import { defaultPoolPair, selectedPoolPairKey } from '@/data/trading-pairs'
import { toTx, unit, useBtcUnit } from '@/lib/helpers'

import ReleasingOverlay from '@/components/overlays/Loading.vue'

const props = defineProps<{
  record: PoolRecord
}>()

const queryClient = useQueryClient()
const connectionStore = useConnectionStore()

const releasing = ref(false)

const selectedPair = inject(selectedPoolPairKey, defaultPoolPair)
const { mutate: mutateFinishRecord } = useMutation({
  mutationFn: submitRelease,
  onSuccess: () => {
    ElMessage.success('Record released')
    queryClient.invalidateQueries({
      queryKey: [
        'poolReleasableRecords',
        {
          address: connectionStore.getAddress,
          tick: selectedPair.fromSymbol,
        },
      ],
    })
  },
  onError: (err: any) => {
    ElMessage.error(err.message)
  },
})

async function submitReleaseRecord() {
  releasing.value = true
  try {
    const releaseEssential = await getReleaseEssential({
      orderId: props.record.orderId,
      tick: props.record.tick,
    })

    const releasePsbt = await buildReleasePsbt({
      btcMsPsbtRaw: releaseEssential.psbtRaw,
      ordinalMsPsbtRaw: releaseEssential.coinPsbtRaw,
      ordinalReleasePsbtRaw: releaseEssential.coinTransferPsbtRaw,
    })

    type ToSignInput = {
      index: number
      address: string
      sighashTypes: number[]
    }
    const toSignInputs: ToSignInput[] = [
      {
        index: 0,
        address: connectionStore.getAddress,
        sighashTypes: [SIGHASH_SINGLE_ANYONECANPAY],
      },
      {
        index: 1,
        address: connectionStore.getAddress,
        sighashTypes: [SIGHASH_SINGLE_ANYONECANPAY],
      },
      {
        index: 2,
        address: connectionStore.getAddress,
        sighashTypes: [SIGHASH_SINGLE_ANYONECANPAY],
      },
      {
        index: 3,
        address: connectionStore.getAddress,
        sighashTypes: [SIGHASH_SINGLE_ANYONECANPAY],
      },
    ]
    const signed = await connectionStore.queries.signPsbt(releasePsbt.toHex(), {
      autoFinalized: true,
      toSignInputs,
    })

    mutateFinishRecord({
      orderId: props.record.orderId,
      psbtRaw: signed,
    })
  } catch (e: any) {
    if (DEBUG) {
      console.log(e)
      ElMessage.error(e.message)
    } else {
      ElMessage.error(`Error while releasing record. Reason: ${e.message}`)
    }
  }

  releasing.value = false
}
</script>

<template>
  <ReleasingOverlay v-if="releasing" />

  <div class="py-4 mx-4 bg-zinc-950 rounded-lg px-4">
    <h3 class="items-center flex justify-between">
      <span class="text-orange-300" v-if="record.poolType === 3">
        {{
          `${record.coinAmount} ${record.tick.toUpperCase()} / ${prettyBalance(
            record.amount,
            useBtcUnit
          )} ${unit}`
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
          <span class="w-28 inline-block text-zinc-500">Type</span>
          <span>{{
            record.poolType === 3
              ? 'Bidirectional Liquidity'
              : 'Unidirectional Liquidity'
          }}</span>
        </div>

        <div class="flex items-center">
          <span class="w-28 inline-block text-zinc-500">Assets</span>
          <span v-if="record.poolType === 3">
            {{
              `${
                record.coinAmount
              } ${record.tick.toUpperCase()} / ${prettyBalance(
                record.amount,
                useBtcUnit
              )} ${unit}`
            }}
          </span>
          <span v-else>
            {{ `${record.coinAmount} ${record.tick.toUpperCase()}` }}
          </span>
        </div>

        <div class="flex items-center">
          <span class="w-28 inline-block text-zinc-500">Tx Record</span>
          <div class="space-y-1">
            <div
              class="flex items-center gap-2 hover:cursor-pointer"
              @click="toTx(record.dealCoinTx)"
              v-if="record.dealCoinTx"
            >
              <span
                class="text-xs w-12 text-center py-0.5 bg-cyan-500/50 rounded"
              >
                {{ record.tick.toUpperCase() }}
              </span>
              <span class="hover:text-orange-300 underline">
                {{ prettyTxid(record.dealCoinTx, 4) }}
              </span>

              <ExternalLinkIcon class="inline-block w-4 h-4" />
            </div>

            <div
              class="flex items-center gap-2 hover:cursor-pointer"
              @click="toTx(record.dealTx)"
              v-if="record.dealTx"
            >
              <span
                class="text-xs w-12 text-center py-0.5 bg-indigo-500/50 rounded"
              >
                BTC
              </span>
              <span class="hover:text-orange-300 underline">
                {{ prettyTxid(record.dealTx, 4) }}
              </span>

              <ExternalLinkIcon class="inline-block w-4 h-4" />
            </div>
          </div>
        </div>

        <div class="flex items-center" v-if="record.claimState === 'ready'">
          <span class="w-28 inline-block text-zinc-500">Rewards</span>

          <Disclosure as="div" v-slot="{ open }" class="grow">
            <DisclosureButton class="flex items-center gap-2">
              <span v-if="record.calStartBlock === 0" class="text-zinc-500">
                Calculating...
              </span>
              <span v-else>
                {{
                  record.rewardAmount
                    ? `${
                        record.rewardAmount
                      } ${POOL_REWARDS_TICK.toUpperCase()}`
                    : '-'
                }}
              </span>
              <span class="ml-2">
                {{
                  record.percentage
                    ? ` - ${(record.percentage / 100).toFixed(2)} %`
                    : ''
                }}
              </span>

              <ChevronRightIcon
                class="w-4"
                :class="open && 'rotate-90 transform'"
              />
            </DisclosureButton>

            <DisclosurePanel
              class="text-gray-500 bg-black rounded-md px-2 py-2 space-y-2 mt-0.5 text-xs"
            >
              <div class="">
                <div>Confirm Block Height</div>
                <div class="text-zinc-300">
                  {{ record.dealCoinTxBlock }}
                </div>
              </div>

              <div class="">
                <div>Distributing across Blocks</div>
                <div class="text-zinc-300">
                  {{ record.calStartBlock }} - {{ record.calEndBlock }}
                </div>
              </div>
            </DisclosurePanel>
          </Disclosure>
        </div>

        <div class="flex items-center" v-if="record.decreasing">
          <span class="w-28 inline-block text-zinc-500">Reward %</span>

          <div class="text-red-400 flex items-center gap-1">
            <span>{{ record.decreasing + '%' }}</span>
            <!-- <ArrowDownRightIcon class="h-4 w-4" /> -->
          </div>

          <el-popover
            placement="bottom"
            title="What is decreasing?"
            :width="400"
            trigger="hover"
            content="The rewards obtained from this record will be reduced by a certain percentage unless this asset is released."
            popper-class="!bg-zinc-800 !text-zinc-300 !shadow-lg !shadow-orange-400/10 "
          >
            <template #reference>
              <HelpCircleIcon
                class="h-4 w-4 text-zinc-300 ml-2"
                aria-hidden="true"
              />
            </template>
          </el-popover>
        </div>
      </div>

      <button
        :class="[
          'rounded-md bg-orange-300 text-orange-950 px-6 py-2 shadow-md shadow-orange-300/20',
          { 'opacity-30 saturate-50': record.claimState !== 'ready' },
        ]"
        @click.prevent="submitReleaseRecord"
        :disabled="record.claimState !== 'ready'"
        v-if="record.claimState === 'ready'"
      >
        {{ record.claimState === 'ready' ? 'Release' : 'Pending' }}
      </button>

      <span class="text-zinc-500 text-xs" v-else>
        Waiting for block confirm
      </span>
    </div>
  </div>
</template>
