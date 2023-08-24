<script lang="ts" setup>
import { useQuery } from '@tanstack/vue-query'
import { HelpCircleIcon } from 'lucide-vue-next'
import { computed, inject, ref } from 'vue'
import * as ecc from 'tiny-secp256k1'
import { Buffer } from 'buffer'

import { defaultPair, selectedPoolPairKey } from '@/data/trading-pairs'
import { getMyPoolRewards } from '@/queries/pool'
import { useAddressStore, useBtcJsStore } from '@/store'

import PanelClaimRewardItem from './PanelClaimRewardItem.vue'
import { raise } from '@/lib/helpers'
import { ECPairFactory } from 'ecpair'

const selectedPair = inject(selectedPoolPairKey, defaultPair)
const addressStore = useAddressStore()
const enabled = computed(() => !!addressStore.get)

const privateKeyHex = ref('')
const ECPair = ECPairFactory(ecc)
const derivedAddress = computed(() => {
  const btcjs = useBtcJsStore().get ?? raise('btcjs not ready')

  if (!privateKeyHex.value) return '-'

  const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKeyHex.value, 'hex'))
  const { address } = btcjs.payments.p2tr({
    internalPubkey: keyPair.publicKey.slice(1, 33),
  })

  return address
})

const { data: poolRewards } = useQuery({
  queryKey: [
    'poolRewards',
    {
      address: addressStore.get as string,
      tick: selectedPair.fromSymbol,
    },
  ],
  queryFn: () =>
    getMyPoolRewards({
      address: addressStore.get as string,
      tick: selectedPair.fromSymbol,
    }),
  enabled,
})
</script>

<template>
  <div class="max-w-xl mx-auto h-[40vh] flex flex-col">
    <div class="mb-8 space-y-2">
      <div class="items-center grid gap-4 justify-center text-xs grid-cols-6">
        <span>Private Key</span>
        <input
          type="text"
          placeholder="Enter your wif here...test only"
          v-model="privateKeyHex"
          class="w-full rounded bg-zinc-800 p-2 placeholder-zinc-500 outline-none border border-zinc-700 text-xs col-span-5"
        />
      </div>

      <div class="gap-4 grid items-center text-xs grid-cols-6">
        <div class="">Address</div>
        <div class="text-xs text-zinc-500">{{ derivedAddress }}</div>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <h3 class="text-base font-medium leading-6 text-zinc-300">My Rewards</h3>
      <el-popover
        placement="bottom-start"
        :width="400"
        trigger="hover"
        content="Rewards are available to for pledged assets and pledges respectively."
        popper-class="!bg-zinc-800 !text-zinc-300 !shadow-lg !shadow-orange-400/10 "
      >
        <template #reference>
          <HelpCircleIcon class="h-4 w-4 text-zinc-400" aria-hidden="true" />
        </template>
      </el-popover>
    </div>

    <div class="rounded mt-4 grow overflow-y-auto -mx-4 space-y-2">
      <div
        class="flex items-center justify-center h-full text-zinc-500"
        v-if="!poolRewards || poolRewards.length === 0"
      >
        No Rewards Currently.
      </div>

      <PanelClaimRewardItem
        v-for="reward in poolRewards"
        :key="reward.orderId"
        :reward="reward"
        :privateKeyHex="privateKeyHex"
      />
    </div>
  </div>
</template>
