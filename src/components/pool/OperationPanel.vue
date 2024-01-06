<script lang="ts" setup>
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { computed, inject, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRoute } from 'vue-router'

import { useConnectionStore } from '@/stores/connection'
import { getMyRewardsEssential } from '@/queries/pool'
import { defaultPoolPair, selectedPoolPairKey } from '@/data/trading-pairs'

import PanelAdd from './PanelAdd.vue'
import PanelRemove from './PanelRemove.vue'
import PanelStandbys from './PanelStandbys.vue'
import PanelRelease from './PanelRelease.vue'
import PanelHistory from './PanelHistory.vue'
import PanelClaim from './PanelClaim.vue'
import PanelEvent from './PanelEvent.vue'

const selectedPair = inject(selectedPoolPairKey, defaultPoolPair)

const tabLabels = ['Add', 'Standbys', 'Remove', 'Release', 'History', 'Claim']
if (selectedPair.fromSymbol === 'rdex') {
  tabLabels.push('Event🔥')

  // remove Add
  tabLabels.shift()
}

const loggedIn = ref(useConnectionStore().connected)
async function connectWallet() {
  const connection = await useConnectionStore().connect('unisat')
  if (connection.status === 'connected') {
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
  selectedTab.value = tabLabels.indexOf('Release')
}

const connectionStore = useConnectionStore()
const { data: rewardsEssential } = useQuery({
  queryKey: [
    'poolRewardsEssential',
    { address: connectionStore.getAddress, tick: selectedPair.fromSymbol },
  ],
  queryFn: () =>
    getMyRewardsEssential({
      address: connectionStore.getAddress,
      tick: selectedPair.fromSymbol,
    }),
  enabled: computed(() => connectionStore.connected),
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
        <TabPanel class="tab-panel" v-if="selectedPair.fromSymbol !== 'rdex'">
          <PanelAdd />
        </TabPanel>

        <TabPanel class="tab-panel">
          <PanelStandbys />
        </TabPanel>

        <TabPanel class="tab-panel">
          <PanelRemove />
        </TabPanel>

        <TabPanel class="tab-panel">
          <PanelRelease />
        </TabPanel>

        <TabPanel class="tab-panel">
          <PanelHistory />
        </TabPanel>

        <TabPanel class="pt-12 focus-visible:outline-none">
          <PanelClaim @go-release="changeTab(tabLabels.indexOf('Release'))" />
        </TabPanel>

        <TabPanel class="tab-panel">
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

<style scoped>
.tab-panel {
  padding-top: 3rem;
  outline: none;
}
</style>
