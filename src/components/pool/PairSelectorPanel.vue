<script lang="ts" setup>
import { computed, inject } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import {
  defaultPoolPair,
  selectPair,
  selectedPoolPairKey,
} from '@/data/trading-pairs'
import { getOnePoolPair } from '@/queries/pool'
import { useConnectionStore } from '@/stores/connection'
import { prettyCoinDisplay } from '@/lib/formatters'

import PoolPairSelect from '@/components/pool/PoolPairSelect.vue'

const selectedPair = inject(selectedPoolPairKey, defaultPoolPair)

// pair info
const { data: pairInfo } = useQuery(
  [
    'pairInfo',
    {
      from: selectedPair.fromSymbol,
      to: selectedPair.toSymbol,
      address: useConnectionStore().getAddress,
    },
  ],
  () =>
    getOnePoolPair({
      from: selectedPair.fromSymbol,
      to: selectedPair.toSymbol,
      address: useConnectionStore().getAddress,
    }),
  {
    enabled: !!selectedPair.fromSymbol && !!selectedPair.toSymbol,
  }
)

const infoMap = computed(() => {
  if (!pairInfo.value) {
    return []
  }

  return [
    {
      label: 'Pooled $' + selectedPair.fromSymbol.toUpperCase(),
      value: prettyCoinDisplay(
        pairInfo.value.fromPoolSize,
        '$' + selectedPair.fromSymbol.toUpperCase()
      ),
    },
    {
      label: 'Pooled ' + selectedPair.toSymbol.toUpperCase(),
      value: prettyCoinDisplay(
        pairInfo.value.toPoolSize,
        selectedPair.toSymbol.toUpperCase()
      ),
    },
    {
      label: `Your LP($${selectedPair.fromSymbol.toUpperCase()}-${selectedPair.toSymbol.toUpperCase()}) $${selectedPair.fromSymbol.toUpperCase()}`,
      value: prettyCoinDisplay(
        pairInfo.value.myFromPoolBalance,
        '$' + selectedPair.fromSymbol.toUpperCase()
      ),
    },
    {
      label: `Your LP($${selectedPair.fromSymbol.toUpperCase()}-${selectedPair.toSymbol.toUpperCase()}) ${selectedPair.toSymbol.toUpperCase()}`,
      value: prettyCoinDisplay(
        pairInfo.value.myToPoolBalance,
        selectedPair.toSymbol.toUpperCase()
      ),
    },
    {
      label: `Your $${selectedPair.fromSymbol.toUpperCase()} share of the pool`,
      value:
        Number(pairInfo.value.fromPoolSize) === 0
          ? '-'
          : (
              (Number(pairInfo.value.myFromPoolBalance) /
                Number(pairInfo.value.fromPoolSize)) *
              100
            ).toFixed(4) + '%',
    },
    {
      label: `Your ${selectedPair.toSymbol.toUpperCase()} share of the pool`,
      value:
        Number(pairInfo.value.toPoolSize) === 0
          ? '-'
          : (
              (Number(pairInfo.value.myToPoolBalance) /
                Number(pairInfo.value.toPoolSize)) *
              100
            ).toFixed(4) + '%',
    },
  ]
})
</script>

<template>
  <div class="border-2 border-orange-200/30 rounded-xl p-8">
    <PoolPairSelect />

    <!-- liquidity pair info -->
    <div class="mt-8">
      <div class="flex items-center gap-2">
        <div class="flex">
          <img :src="selectedPair.fromIcon" class="h-6 rounded-full" />
          <img :src="selectedPair.toIcon" class="-ml-2 h-6 rounded-full" />
        </div>

        <h3 class="uppercase text-xl">
          {{ `LP($${selectedPair.fromSymbol}-${selectedPair.toSymbol})` }}
        </h3>
      </div>

      <div class="mt-4 border border-zinc-700 bg-zinc-800 rounded-md p-4">
        <h3>Prices and pool share</h3>

        <div class="text-sm mt-4" v-if="pairInfo">
          <div
            class="flex justify-between items-center py-3"
            v-for="info in infoMap"
          >
            <span class="text-zinc-500">
              {{ info.label }}
            </span>
            <span>{{ info.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
