<script lang="ts" setup>
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'

const tabLabels = ['Add', 'Remove', 'Claim']
</script>

<template>
  <div class="border rounded-xl p-8">
    <TabGroup>
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
        <TabPanel>
          <PanelAdd />
        </TabPanel>
        <TabPanel>Content 2</TabPanel>
        <TabPanel>Content 3</TabPanel>
      </TabPanels>
    </TabGroup>
  </div>
</template>
