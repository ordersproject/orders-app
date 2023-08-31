<script lang="ts" setup>
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { ref } from 'vue'

import { useAddressStore } from '@/store'
import { connect } from '@/queries/unisat'

import PanelAdd from './PanelAdd.vue'
import PanelRemove from './PanelRemove.vue'
import PanelClaim from './PanelClaim.vue'

const tabLabels = ['Add', 'Remove', 'Claim']

const loggedIn = ref(!!useAddressStore().get)

async function connectWallet() {
  const address = await connect()
  if (address) {
    loggedIn.value = true
  }
}
</script>

<template>
  <div class="border rounded-xl p-8">
    <TabGroup v-if="loggedIn" :default-index="2">
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
          {{ label }}
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel class="pt-12">
          <PanelAdd />
        </TabPanel>

        <TabPanel class="pt-12">
          <PanelRemove />
        </TabPanel>

        <TabPanel class="pt-12">
          <PanelClaim />
        </TabPanel>
      </TabPanels>
    </TabGroup>

    <div class="flex flex-col items-center justify-center h-full gap-8" v-else>
      <p class="text-gray-300">
        Please connect your wallet first to use the pool.
      </p>

      <button
        class="py-2 rounded-lg border-2 border-orange-300 px-4 transition hover:border-orange-400 hover:bg-orange-400"
        @click="connectWallet"
      >
        Connect Wallet
      </button>
    </div>
  </div>
</template>
