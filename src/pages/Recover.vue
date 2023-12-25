<script lang="ts" setup>
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import { getIssues } from '@/queries/orders/issues'
import { useConnectionStore } from '@/stores/connection'
import { useNetworkStore } from '@/stores/network'

const connectionStore = useConnectionStore()
const networkStore = useNetworkStore()

const { data: issues } = useQuery({
  queryKey: [
    'issues',
    {
      network: networkStore.network,
      address: connectionStore.getAddress,
    },
  ],
  queryFn: () =>
    getIssues({
      address: connectionStore.getAddress,
    }),
  enabled: computed(() => !!connectionStore.connected),
})
</script>

<template>
  <div
    class="mx-auto max-w-3xl bg-zinc-900 rounded-xl shadow-lg shadow-orange-300/10 border-2 border-orange-200/20 hover:shadow-orange-300/20 min-h-[75vh] flex flex-col p-8 mt-8"
  >
    <div class="border-b border-orange-300/30 pb-4 -mt-2">
      <h3 class="font-bold text-zinc-300 text-lg">
        Issues
        <span v-if="issues?.length">({{ issues.length }})</span>
      </h3>
    </div>

    <div class="space-y-4 py-4 grow flex flex-col justify-center">
      <div
        class="text-center text-zinc-500 text-base"
        v-if="issues && !issues.length"
      >
        You have no ongoing issues.
      </div>
      <IssueItem v-for="issue of issues" :key="issue.orderId" :issue="issue" />
    </div>
  </div>
</template>
