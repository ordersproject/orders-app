<script lang="ts" setup>
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { HelpCircleIcon } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, inject } from 'vue'

import { defaultPoolPair, selectedPoolPairKey } from '@/data/trading-pairs'
import { useAddressStore } from '@/store'
import { getMyRewardsEssential, claimReward } from '@/queries/pool'
import { DEBUG } from '@/data/constants'

import ClaimRecords from '@/components/pool/PanelClaimRecords.vue'

const selectedPair = inject(selectedPoolPairKey, defaultPoolPair)
const addressStore = useAddressStore()

const { data: rewardsEssential, isLoading: isLoadingRewardsEssential } =
  useQuery({
    queryKey: [
      'poolRewardsEssential',
      { address: addressStore.get as string, tick: selectedPair.fromSymbol },
    ],
    queryFn: () =>
      getMyRewardsEssential({
        address: addressStore.get as string,
        tick: selectedPair.fromSymbol,
      }),
    select: (data) => {
      return {
        ...data,
        total:
          data.totalRewardAmount +
          data.totalRewardExtraAmount -
          data.hadClaimRewardAmount,
      }
    },
    enabled: computed(() => !!addressStore.get),
  })

// hasReleasable
const hasReleasable = computed(() => {
  if (!rewardsEssential.value) return false

  return !!rewardsEssential.value?.hasReleasePoolOrderCount
})
const emit = defineEmits(['goRelease'])

const queryClient = useQueryClient()
const { mutate: mutateClaimReward } = useMutation({
  mutationFn: claimReward,
  onSuccess: () => {
    ElMessage.success('Reward claimed')
    queryClient.invalidateQueries({
      queryKey: [
        'poolRewardsEssential',
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

async function onClaimReward() {
  try {
    if (!rewardsEssential.value) return

    mutateClaimReward({
      rewardAmount: rewardsEssential.value.total,
      tick: selectedPair.fromSymbol,
    })
  } catch (e: any) {
    if (DEBUG) {
      console.log(e)
      ElMessage.error(e.message)
    } else {
      ElMessage.error('Error while claiming reward.')
    }
  }
}
</script>

<template>
  <div class="max-w-xl mx-auto h-[40vh] flex flex-col">
    <div class="">
      <!-- releasable alert -->
      <div
        v-if="hasReleasable"
        class="text-sm bg-orange-400/10 rounded py-2 px-4 -mx-4 mb-4 flex items-center justify-between gap-4"
      >
        <div class="text-orange-300 text-xs">
          <p>
            Your liquidity reward has been generated. Please release promptly to
            claim.
          </p>
          <p class="mt-2">
            Note: Rewards may decrease if not released within 3 days of
            liquidity being used.
          </p>
        </div>

        <button
          class="bg-orange-300 text-orange-950 rounded py-1 px-4"
          @click="$emit('goRelease')"
        >
          Release
        </button>
      </div>

      <!-- title -->
      <div class="flex items-center gap-4">
        <h3 class="text-sm font-medium leading-6 text-zinc-300">My Rewards</h3>
        <el-popover
          placement="bottom-start"
          :width="400"
          trigger="hover"
          content="You can earn records by providing liquidity to the pool, which will be compensated in RDEX tokens. When you choose to claim your records, you simultaneously release your locked liquidity."
          popper-class="!bg-zinc-800 !text-zinc-300 !shadow-lg !shadow-orange-400/10 "
        >
          <template #reference>
            <HelpCircleIcon class="h-4 w-4 text-zinc-400" aria-hidden="true" />
          </template>
        </el-popover>
      </div>

      <!-- total -->
      <div class="mt-2 flex items-center gap-4">
        <div class="flex items-baseline gap- text-orange-300">
          <span class="font-bold text-lg">
            {{ isLoadingRewardsEssential ? '-' : rewardsEssential?.total }}
          </span>

          <span class="text-sm ml-1 uppercase">
            {{ selectedPair.fromSymbol }}
          </span>
        </div>

        <!-- claim button -->
        <button
          class="rounded bg-orange-300 text-orange-950 px-4 py-1 shadow-md shadow-orange-300/20 text-sm hover:shadow-orange-300/50 disabled:opacity-30 disabled:saturate-50 disabled:shadow-none"
          @click="onClaimReward"
          :disabled="!rewardsEssential || rewardsEssential.total === 0"
          v-if="rewardsEssential && rewardsEssential.total > 0"
        >
          Claim
        </button>
      </div>
    </div>

    <!-- claim records -->
    <ClaimRecords class="mt-8 overflow-y-scroll nicer-scrollbar" />
  </div>
</template>
