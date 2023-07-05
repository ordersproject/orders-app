<script lang="ts" setup>
import PoolPairSelector from '@/components/pool/PairSelector.vue'
import PoolOperationPanel from '@/components/pool/OperationPanel.vue'
</script>

<template>
  <div class="max-w-7xl mx-auto h-full mt-[10vh] grid grid-cols-5 gap-8">
    <PoolPairSelector class="col-span-2" />
    <PoolOperationPanel class="col-span-3" />
  </div>
</template>
