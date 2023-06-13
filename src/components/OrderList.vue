<script lang="ts" setup>
import OrderItem from './OrderItem.vue'
import type { Order } from '@/queries'

withDefaults(
  defineProps<{
    askOrders?: Order[]
    bidOrders?: Order[]
  }>(),
  {
    askOrders: () => [],
    bidOrders: () => [],
  }
)

defineEmits(['useBuyPrice', 'useSellPrice'])
</script>

<template>
  <div class="flex flex-col">
    <div class="flex-1">
      <table class="w-full">
        <thead>
          <tr>
            <th class="th">Price (BTC)</th>
            <th class="th">Amount (ORXC)</th>
            <th class="th">Total (BTC)</th>
          </tr>
        </thead>

        <tbody>
          <OrderItem
            v-for="order in askOrders"
            :key="order.orderId"
            :order="order"
            :order-type="'ask'"
            @click="$emit('useBuyPrice', Number(order.coinRatePrice) / 1e8)"
          />
        </tbody>
      </table>
    </div>

    <div class="flex-1">
      <table class="w-full flex-1">
        <thead class="invisible">
          <tr>
            <th class="th">Price (BTC)</th>
            <th class="th">Amount (ORXC)</th>
            <th class="th">Total (BTC)</th>
          </tr>
        </thead>

        <tbody>
          <OrderItem
            v-for="order in bidOrders"
            :key="order.orderId"
            :order="order"
            :order-type="'bid'"
            @click="$emit('useSellPrice', Number(order.coinRatePrice) / 1e8)"
          />
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.th {
  @apply py-2 text-left text-sm font-normal text-zinc-500;
}
</style>
