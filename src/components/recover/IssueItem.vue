<script lang="ts" setup>
import { ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'

import { useConnectionStore, useNetworkStore } from '@/stores'
import {
  getIssueDetail,
  submitRecover,
  type Issue,
} from '@/queries/orders/issues'
import { prettyTimestamp } from '@/lib/formatters'
import { buildRecoverPsbt } from '@/lib/order-pool-builder'
import { DEBUG, SIGHASH_SINGLE_ANYONECANPAY } from '@/data/constants'

import BuildingOverlay from '@/components/overlays/Loading.vue'

const props = defineProps<{
  issue: Issue
}>()

const connectionStore = useConnectionStore()
const networkStore = useNetworkStore()

const queryClient = useQueryClient()
const { mutate: mutateRecover } = useMutation({
  mutationFn: submitRecover,
  onSuccess: () => {
    ElMessage.success('Issue recovered')
    queryClient.invalidateQueries({
      queryKey: [
        'issues',
        {
          network: networkStore.network,
          address: connectionStore.getAddress,
        },
      ],
    })
  },
  onError: (err: any) => {
    ElMessage.error(err.message)
  },
})

const building = ref(false)
async function onRecover() {
  building.value = true
  try {
    // get brc psbt
    const issueDetail = await getIssueDetail({
      address: connectionStore.getAddress,
      orderId: props.issue.orderId,
      tick: props.issue.tick,
    })

    const releasePsbt = await buildRecoverPsbt({
      ordinalMsPsbtRaw: issueDetail.coinPsbtRaw,
      ordinalRecoverPsbtRaw: issueDetail.coinTransferPsbtRaw,
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
    ]

    const signed = await connectionStore.adapter.signPsbt(releasePsbt.toHex(), {
      autoFinalized: true,
      toSignInputs,
    })

    mutateRecover({
      orderId: props.issue.orderId,
      psbtRaw: signed,
    })
  } catch (e: any) {
    if (DEBUG) {
      console.log(e)
      ElMessage.error(e.message)
    } else {
      ElMessage.error(`Error while recovering issue. Reason: ${e.message}`)
    }
  }

  building.value = false
}
</script>

<template>
  <BuildingOverlay v-if="building" />

  <div class="p-4 bg-black rounded-md">
    <!-- order id -->
    <h3 class="text-zinc-500 text-xs">
      {{ issue.orderId }}
    </h3>

    <div class="mt-4 flex items-center justify-between">
      <div class="space-2">
        <div class="flex gap-1 text-orange-300">
          <div>{{ issue.coinAmount }}</div>
          <div>${{ issue.tick.toUpperCase() }}</div>
        </div>

        <div class="text-sm text-zinc-300">
          {{ prettyTimestamp(issue.timestamp) }}
        </div>
      </div>

      <div class="">
        <button
          class="text-orange-300 border border-orange-300/30 px-4 py-1 rounded-md shadow-md shadow-orange-300/10 hover:shadow-orange-300/30 hover:bg-orange-300 hover:text-orange-950 transition-all duration-200"
          @click="onRecover"
        >
          Recover
        </button>
      </div>
    </div>

    <div class="flex mt-4 text-xs gap-8">
      <div class="text-zinc-500">Issue Description:</div>
      <ul class="list-disc space-y-1">
        <li class="">Sell transactions failed</li>
        <li>BRC20 asset stucked in multi-sig address</li>
      </ul>
    </div>
  </div>
</template>
@/stores/store
