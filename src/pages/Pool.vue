<script lang="ts" setup>
import { useRoute } from 'vue-router'
import { provide } from 'vue'

import {
  defaultPair,
  selectPair,
  selectedPoolPairKey,
} from '@/data/trading-pairs'

import PoolPairSelectorPanel from '@/components/pool/PairSelectorPanel.vue'
import PoolOperationPanel from '@/components/pool/OperationPanel.vue'

const route = useRoute()
const pairRaw = route.params?.pair as string | undefined
const selectedPair = pairRaw ? selectPair(pairRaw) : defaultPair
provide(selectedPoolPairKey, selectedPair)
</script>

<template>
  <div class="max-w-7xl mx-auto h-full mt-[10vh] grid grid-cols-5 gap-8">
    <PoolPairSelectorPanel class="col-span-2" />
    <PoolOperationPanel class="col-span-3" />
  </div>
</template>
