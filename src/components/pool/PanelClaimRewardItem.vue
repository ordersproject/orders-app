<script lang="ts" setup>
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'
import { Buffer } from 'buffer'
import { inject, ref } from 'vue'

import { prettyTimestamp } from '@/lib/formatters'
import { raise } from '@/lib/helpers'
import { type PoolRecord, getClaimEssential, submitClaim } from '@/queries/pool'
import { useAddressStore, useBtcJsStore } from '@/store'
import {
  DEBUG,
  SIGHASH_SINGLE_ANYONECANPAY,
  SIGHASH_DEFAULT,
  SIGHASH_ALL,
  SIGHASH_SINGLE,
} from '@/data/constants'
import { buildClaimPsbt } from '@/lib/order-pool-builder'
import BtcHelpers from '@/lib/btc-helpers'
import { defaultPair, selectedPoolPairKey } from '@/data/trading-pairs'

import ClaimingOverlay from '@/components/overlays/Claiming.vue'
import Decimal from 'decimal.js'

const props = defineProps<{
  reward: PoolRecord
}>()

const queryClient = useQueryClient()
const addressStore = useAddressStore()

const claiming = ref(false)

const selectedPair = inject(selectedPoolPairKey, defaultPair)
const { mutate: mutateFinishReward } = useMutation({
  mutationFn: submitClaim,
  onSuccess: () => {
    ElMessage.success('Reward claimed')
    queryClient.invalidateQueries({
      queryKey: [
        'poolRecords',
        {
          address: addressStore.get as string,
          tick: selectedPair.fromSymbol,
        },
      ],
    })
  },
  onError: (err: any) => {
    ElMessage.error(err.message)
  },
})

async function submitClaimReward() {
  claiming.value = true
  const btcHelpers = new BtcHelpers()
  try {
    const claimEssential = await getClaimEssential({
      orderId: props.reward.orderId,
      tick: props.reward.tick,
    })

    const claimPsbt = await buildClaimPsbt({
      btcMsPsbtRaw: claimEssential.psbtRaw,
      ordinalMsPsbtRaw: claimEssential.coinPsbtRaw,
      ordinalReleasePsbtRaw: claimEssential.coinTransferPsbtRaw,
      rewardPsbtRaw: claimEssential.rewardPsbtRaw,
    })

    type ToSignInput = {
      index: number
      address: string
      sighashTypes: number[]
    }
    const toSignInputs: ToSignInput[] = [
      {
        index: 0,
        address: addressStore.get!,
        sighashTypes: [SIGHASH_SINGLE_ANYONECANPAY],
      },
      {
        index: 1,
        address: addressStore.get!,
        sighashTypes: [SIGHASH_SINGLE_ANYONECANPAY],
      },
      {
        index: 2,
        address: addressStore.get!,
        sighashTypes: [SIGHASH_SINGLE_ANYONECANPAY],
      },
      {
        index: 4,
        address: addressStore.get!,
        sighashTypes: [SIGHASH_SINGLE_ANYONECANPAY],
      },
    ]
    const signed = await window.unisat.signPsbt(claimPsbt.toHex(), {
      autoFinalized: true,
      toSignInputs,
    })

    const signedPsbt = useBtcJsStore().get!.Psbt.fromHex(signed)

    // console.log({
    //   validate00: btcHelpers.validate(signedPsbt, [0], exchangePubKey),
    //   validate01: btcHelpers.validate(signedPsbt, [0], selfPubKey),
    //   validate10: btcHelpers.validate(signedPsbt, [1], exchangePubKey),
    //   validate11: btcHelpers.validate(signedPsbt, [1], selfPubKey),
    //   validate20: btcHelpers.validate(signedPsbt, [2], exchangePubKey),
    //   validate21: btcHelpers.validate(signedPsbt, [2], selfPubKey),
    //   validate41: btcHelpers.validate(signedPsbt, [4], selfPubKey),
    // })
    // signedPsbt
    //   .finalizeInput(0)
    //   .finalizeInput(1)
    //   .finalizeInput(2)
    //   .finalizeInput(4)

    console.log({ signedPsbt })
    // const tx = signedPsbt.extractTransaction()
    // console.log({ tx })
    // notify api to update order state
    // const res = await window.unisat.pushPsbt(signedPsbt.toHex())
    // console.log({ res })
    mutateFinishReward({
      orderId: props.reward.orderId,
      psbtRaw: signed,
    })
  } catch (e: any) {
    if (DEBUG) {
      console.log(e)
      ElMessage.error(e.message)
    } else {
      ElMessage.error('Error while claiming reward.')
    }
  }

  claiming.value = false
}
</script>

<template>
  <ClaimingOverlay v-if="claiming" />

  <div class="py-4 mx-4 bg-zinc-950 rounded-lg px-4">
    <h3 class="items-center flex justify-between">
      <span class="text-orange-300" v-if="reward.poolType === 3">
        {{
          `${reward.coinAmount} ${reward.tick.toUpperCase()} / ${new Decimal(
            reward.amount
          ).dividedBy(1e8)} BTC`
        }}
      </span>
      <span class="text-orange-300" v-else>
        {{ `${reward.coinAmount} ${reward.tick.toUpperCase()}` }}
      </span>

      <span class="text-zinc-500 text-sm">
        {{ `${prettyTimestamp(reward.timestamp)}` }}
      </span>
    </h3>

    <div class="mt-4 flex items-center justify-between">
      <div class="text-sm space-y-2">
        <div class="flex items-center">
          <span class="w-20 inline-block text-zinc-500">Type</span>
          <span>{{
            reward.poolType === 3
              ? 'Bidirectional Liquidity'
              : 'Unidirectional Liquidity'
          }}</span>
        </div>

        <div class="flex items-center">
          <span class="w-20 inline-block text-zinc-500">Assets</span>
          <span v-if="reward.poolType === 3">
            {{
              `${
                reward.coinAmount
              } ${reward.tick.toUpperCase()} / ${new Decimal(
                reward.amount
              ).dividedBy(1e8)} BTC`
            }}
          </span>
          <span v-else>
            {{ `${reward.coinAmount} ${reward.tick.toUpperCase()}` }}
          </span>
        </div>

        <div class="flex items-center">
          <span class="w-20 inline-block text-zinc-500">Rewards</span>
          <span>
            {{
              reward.rewardCoinAmount ? `${reward.rewardCoinAmount} RDEX` : '-'
            }}
          </span>
        </div>
      </div>

      <button
        :class="[
          'rounded-md bg-orange-300 text-orange-950 px-6 py-2 shadow-md shadow-orange-300/20',
          { 'opacity-30 saturate-50': reward.claimState !== 'ready' },
        ]"
        @click.prevent="submitClaimReward"
        :disabled="reward.claimState !== 'ready'"
      >
        {{ reward.claimState === 'ready' ? 'Claim' : 'Pending' }}
      </button>
    </div>
  </div>
</template>
