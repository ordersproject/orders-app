<script lang="ts" setup>
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { computed, inject, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import { useAddressStore } from '@/store'
import { connect } from '@/queries/unisat'
import { getMyRewardsEssential } from '@/queries/pool'
import { defaultPoolPair, selectedPoolPairKey } from '@/data/trading-pairs'

import PanelAdd from './PanelAdd.vue'
import PanelRemove from './PanelRemove.vue'
import PanelRelease from './PanelRelease.vue'
import PanelClaim from './PanelClaim.vue'
import PanelEvent from './PanelEvent.vue'
import { useRoute } from 'vue-router'

const selectedPair = inject(selectedPoolPairKey, defaultPoolPair)

const tabLabels = ['Add', 'Remove', 'Release', 'Claim']
if (selectedPair.fromSymbol === 'rdex') {
  tabLabels.push('Event🔥')
}

const loggedIn = ref(!!useAddressStore().get)
async function connectWallet() {
  const address = await connect()
  if (address) {
    loggedIn.value = true
  }
}

const selectedTab = ref(0)
function changeTab(index: number) {
  selectedTab.value = index
}

const route = useRoute()
const queryAction = route.query.action as string | undefined
if (queryAction === 'release') {
  selectedTab.value = 2
}

const addressStore = useAddressStore()
const { data: rewardsEssential } = useQuery({
  queryKey: [
    'poolRewardsEssential',
    { address: addressStore.get as string, tick: selectedPair.fromSymbol },
  ],
  queryFn: () =>
    getMyRewardsEssential({
      address: addressStore.get as string,
      tick: selectedPair.fromSymbol,
    }),
  enabled: computed(() => !!addressStore.get),
})

// hasReleasable
const hasReleasable = computed(() => {
  if (!rewardsEssential.value) return false

  return !!rewardsEssential.value?.hasReleasePoolOrderCount
})
</script>

<template>
  <div class="border-2 border-orange-200/30 rounded-xl p-8">
    <TabGroup
      v-if="loggedIn"
      :default-index="selectedTab"
      :selected-index="selectedTab"
      @change="changeTab"
    >
      <TabList
        class="flex items-center justify-center gap-4"
        v-slot="{ selectedIndex }"
      >
        <Tab
          :class="[
            'px-4 py-1 outline-none border-b-2 font-bold',
            selectedIndex === index
              ? 'border-orange-300 text-zinc-100'
              : 'border-transparent text-zinc-500',
          ]"
          v-for="(label, index) in tabLabels"
        >
          <span>{{ label }}</span>
          <span
            v-if="label === 'Release' && hasReleasable"
            class="inline-flex items-center rounded-md bg-orange-400/30 px-1.5 py-0.5 text-xs font-medium text-orange-400 -translate-y-2 -translate-x-1 absolute"
          >
            {{ rewardsEssential?.hasReleasePoolOrderCount }}
          </span>
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel class="pt-12 focus-visible:outline-none">
          <PanelAdd />
        </TabPanel>

        <TabPanel class="pt-12 focus-visible:outline-none">
          <PanelRemove />
        </TabPanel>

        <TabPanel class="pt-12 focus-visible:outline-none">
          <PanelRelease />
        </TabPanel>

        <TabPanel class="pt-12 focus-visible:outline-none">
          <PanelClaim @go-release="changeTab(2)" />
        </TabPanel>

        <TabPanel class="pt-12 focus-visible:outline-none">
          <PanelEvent />
        </TabPanel>
      </TabPanels>
    </TabGroup>

    <div class="flex flex-col items-center justify-center h-full gap-8" v-else>
      <p class="text-gray-300">
        Please connect your wallet first to use the pool.
      </p>

      <button
        class="py-2 rounded-lg border-2 border-orange-300 px-4 transition hover:border-orange-400 hover:bg-orange-300"
        @click="connectWallet"
      >
        Connect Wallet
      </button>
    </div>
  </div>
</template>
