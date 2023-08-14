<script lang="ts" setup>
import { useQueryClient } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'
import { HelpCircleIcon } from 'lucide-vue-next'
import ECPairFactory from 'ecpair'
import { Buffer } from 'buffer'
import * as ecc from 'tiny-secp256k1'

import { prettyTimestamp } from '@/lib/helpers'
import { type PoolRecord, getClaimEssential } from '@/queries/pool'
import { useAddressStore, useBtcJsStore } from '@/store'
import { DEBUG } from '@/data/constants'
import { buildClaimBtcTx } from '@/lib/order-pool-builder'

const { reward } = defineProps<{ reward: PoolRecord }>()

const queryClient = useQueryClient()
const addressStore = useAddressStore()
async function submitClaimReward() {
  console.log('claiming')
  try {
    const claimEssential = await getClaimEssential({
      orderId: reward.orderId,
      tick: reward.tick,
    })

    const unisat = window.unisat
    const btcjs = useBtcJsStore().get!

    // const btcClaimTx = btcjs.Psbt.fromHex(claimEssential.psbtRaw)
    const claimBtcPsbt = await buildClaimBtcTx({
      psbt: claimEssential.psbtRaw,
    })
    console.log({ claimBtcPsbt })
    const signed = await unisat.signPsbt(claimBtcPsbt.toHex())

    // validate if all inputs are signed
    const signedPsbt = btcjs.Psbt.fromHex(signed)

    // const ecc = await import('tiny-secp256k1')
    const ECPair = ECPairFactory(ecc)

    const validator = (
      pubkey: Buffer,
      msghash: Buffer,
      signature: Buffer
    ): boolean => ECPair.fromPublicKey(pubkey).verify(msghash, signature)

    const isSigned0 = signedPsbt.validateSignaturesOfInput(0, validator)
    const isSigned1 = signedPsbt.validateSignaturesOfInput(1, validator)
    console.log({ isSigned0, isSigned1 })
    // const pushed = await unisat.pushPsbt(signed)
    // console.log({ signed, pushed })

    ElMessage.success('Reward claimed')
    queryClient.invalidateQueries({
      queryKey: [
        'poolRewards',
        {
          address: addressStore.get as string,
          tick: reward.tick,
        },
      ],
    })
  } catch (e: any) {
    if (DEBUG) console.error(e)
    ElMessage.error('Error while claiming reward.')
  }
}
</script>

<template>
  <div class="py-4 mx-4 bg-zinc-950 rounded-lg px-4">
    <div class="flex items-center justify-between">
      <h3 class="text-zinc-300">
        {{
          `${
            reward.coinAmount
          } ${reward.tick.toUpperCase()} - (${prettyTimestamp(
            reward.timestamp
          )})`
        }}
      </h3>

      <el-popover
        placement="bottom-start"
        :width="400"
        trigger="hover"
        content="Rewards are available to for pledged assets and pledges respectively."
        popper-class="!bg-zinc-800 !text-zinc-300 !shadow-lg !shadow-orange-400/10 "
      >
        <template #reference>
          <HelpCircleIcon class="h-5 w-5 text-zinc-300" aria-hidden="true" />
        </template>
      </el-popover>
    </div>

    <div class="mt-4 flex items-center justify-between">
      <div class="">
        <div class="flex items-center">
          <span class="w-20 inline-block text-zinc-500 text-sm">Assets</span>
          <span>
            {{ `${reward.coinAmount} ${reward.tick.toUpperCase()}` }}
          </span>
        </div>
        <div class="flex items-center">
          <span class="w-20 inline-block text-zinc-500 text-sm">Rewards</span>
          <span>
            -
            <!-- {{ `${reward.rewards.amount} ${reward.rewards.symbol}` }} -->
          </span>
        </div>
      </div>

      <button
        class="rounded-md bg-orange-300 text-orange-950 px-6 py-2 shadow-md shadow-orange-300/20"
        @click.prevent="submitClaimReward"
      >
        Claim
      </button>
    </div>
  </div>
</template>
