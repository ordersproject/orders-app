<script lang="ts" setup>
import { useQuery } from '@tanstack/vue-query'
import { computed, inject } from 'vue'

import { defaultPoolPair, selectedPoolPairKey } from '@/data/trading-pairs'
import { useAddressStore } from '@/store'
import { getMyStandbys } from '@/queries/pool'

const selectedPair = inject(selectedPoolPairKey, defaultPoolPair)
const addressStore = useAddressStore()

const people = [
  {
    name: 'Lindsay Walton',
    title: 'Front-end Developer',
    department: 'Optimization',
    email: 'lindsay.walton@example.com',
    role: 'Member',
    image:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  // More people...
]

const { data: standbys } = useQuery({
  queryKey: ['poolStandbys', { tick: selectedPair.fromSymbol }],
  queryFn: () => getMyStandbys({ tick: selectedPair.fromSymbol }),
  select: (data) => {
    console.log('🚀 ~ file: PanelStandbys.vue:29 ~ data:', data)
    return data
  },
  enabled: computed(() => !!addressStore.get),
})
</script>

<template>
  <div class="max-w-md">
    <table class="min-w-full divide-y divide-zinc-300">
      <thead>
        <tr>
          <th
            scope="col"
            class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-zinc-100 sm:pl-0"
          >
            Order ID
          </th>
          <th
            scope="col"
            class="px-3 py-3.5 text-left text-sm font-semibold text-zinc-100"
          >
            Amount
          </th>
          <th
            scope="col"
            class="px-3 py-3.5 text-left text-sm font-semibold text-zinc-100"
          >
            Block
          </th>
          <th
            scope="col"
            class="px-3 py-3.5 text-left text-sm font-semibold text-zinc-100"
          >
            Percentage
          </th>
          <th
            scope="col"
            class="px-3 py-3.5 text-left text-sm font-semibold text-zinc-100"
          >
            Reward
          </th>
        </tr>
      </thead>

      <tbody class="divide-y divide-zinc-200">
        <tr
          v-for="standby in standbys"
          :key="standby.orderId"
          v-if="standbys?.length"
        >
          <td class="whitespace-nowrap py-5 pl-4 pr-3 text-sm sm:pl-0">
            <div class="flex items-center">
              <div class="ml-4">
                <div class="font-medium text-zinc-100">
                  {{ standby.orderId }}
                </div>
                <!-- <div class="mt-1 text-zinc-500">{{ person.email }}</div> -->
              </div>
            </div>
          </td>
          <td class="whitespace-nowrap px-3 py-5 text-sm text-zinc-500">
            <div class="text-zinc-100">{{ person.title }}</div>
            <div class="mt-1 text-zinc-500">{{ person.department }}</div>
          </td>
          <td class="whitespace-nowrap px-3 py-5 text-sm text-zinc-500">
            <span
              class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
              >Active</span
            >
          </td>
          <td class="whitespace-nowrap px-3 py-5 text-sm text-zinc-500">
            {{ person.role }}
          </td>
          <td
            class="relative whitespace-nowrap py-5 pl-3 pr-4 text-right text-sm font-medium sm:pr-0"
          >
            <a href="#" class="text-indigo-600 hover:text-indigo-900"
              >Edit<span class="sr-only">, {{ person.name }}</span></a
            >
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
