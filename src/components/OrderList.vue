<script lang="ts" setup>
import OrderItem from './OrderItem.vue'
import type { PsbtWrapper } from './OrderPanel.vue'

defineProps<{
  sellPsbtWrappers: PsbtWrapper[]
}>()

defineEmits(['usePrice'])
</script>

<template>
  <table class="w-full">
    <thead>
      <tr>
        <th class="th">Price (BTC)</th>
        <th class="th">Amount (ORDI)</th>
        <th class="th">Total (BTC)</th>
      </tr>
    </thead>

    <tbody>
      <OrderItem
        v-for="order in sellPsbtWrappers"
        :key="order.id"
        :order="order"
        @click="$emit('usePrice', Number(order.coinRatePrice) / 1e8)"
      />
    </tbody>
  </table>
</template>

<style scoped>
.th {
  @apply py-2 text-left text-sm font-normal text-zinc-500;
}
</style>
