<script lang="ts" setup>
import { getMyPoolRewards } from '@/queries/pool'
import { useQuery } from '@tanstack/vue-query'
import { HelpCircleIcon } from 'lucide-vue-next'

const { data: poolRewards } = useQuery(['poolRewards'], () =>
  getMyPoolRewards()
)
console.log({ poolRewards })
</script>

<template>
  <div class="max-w-xl mx-auto h-[40vh] flex flex-col">
    <h3 class="text-base font-medium leading-6 text-zinc-300">My Rewards</h3>

    <div
      class="border rounded mt-4 px-4 divide-y divide-zinc-700 border-zinc-600 grow overflow-y-auto"
    >
      <div class="py-4" v-for="record in poolRewards" :key="record.id">
        <div class="flex items-center justify-between">
          <h3 class="text-zinc-300">
            {{ record.title }}
          </h3>

          <el-popover
            placement="bottom-start"
            :width="400"
            trigger="hover"
            content="Rewards are available to for pledged assets and pledges respectively."
            popper-class="!bg-zinc-800 !text-zinc-300 !shadow-lg !shadow-orange-400/10 "
          >
            <template #reference>
              <HelpCircleIcon
                class="h-5 w-5 text-zinc-300"
                aria-hidden="true"
              />
            </template>
          </el-popover>
        </div>

        <div class="mt-4 flex items-center justify-between">
          <div class="">
            <div class="flex items-center">
              <span class="w-20 inline-block text-zinc-500 text-sm"
                >Assets</span
              >
              <span>
                {{ `${record.assets.amount} ${record.assets.symbol}` }}
              </span>
            </div>
            <div class="flex items-center">
              <span class="w-20 inline-block text-zinc-500 text-sm"
                >Rewards</span
              >
              <span>
                {{ `${record.rewards.amount} ${record.rewards.symbol}` }}
              </span>
            </div>
          </div>

          <button class="rounded-md bg-orange-300 text-orange-950 px-6 py-2">
            Claim
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
