<script lang="ts" setup>
import { useQuery } from '@tanstack/vue-query'

import { getMarketPrice, type Order } from '@/queries/orders-api'
import { useNetworkStore } from '@/store'
import { cn } from '@/lib/helpers'

import OrderItem from './OrderItem.vue'

const networkStore = useNetworkStore()

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

const { data: marketPrice } = useQuery({
  queryKey: ['marketPrice', { network: networkStore.network, tick: 'rdex' }],
  queryFn: () => getMarketPrice({ tick: 'rdex' }),
})
</script>

<template>
  <div class="flex flex-col gap-y-4">
    <div class="orders-container h-full overflow-y-scroll pr-1">
      <table class="w-full" v-if="askOrders.length">
        <thead>
          <tr>
            <th class="th">Price (BTC)</th>
            <th class="th">Amount (RDEX)</th>
            <th class="th">Total (BTC)</th>
            <th class="th"></th>
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

      <div class="flex h-full items-center justify-center" v-else>
        <span class="text-zinc-500">No ask orders</span>
      </div>
    </div>

    <div class="">
      <el-tooltip :content="`Market Price`" placement="right" effect="light">
        <span
          :class="
            cn('text-lg', marketPrice ? 'text-green-500' : 'text-zinc-500')
          "
        >
          {{ marketPrice?.toFixed(8) || '-' }}
        </span>
      </el-tooltip>
    </div>

    <div class="orders-container h-full overflow-y-scroll pr-1">
      <table class="-mt-8 w-full" v-if="bidOrders.length">
        <thead class="invisible">
          <tr class="">
            <th class="th">Price (BTC)</th>
            <th class="th">Amount (RDEX)</th>
            <th class="th">Total (BTC)</th>
            <th class="th"></th>
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

      <div class="flex h-full items-center justify-center" v-else>
        <span class="text-zinc-500">No bid orders</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.th {
  @apply pb-2 pt-0 text-left text-sm font-normal text-zinc-500;
}

.orders-container::-webkit-scrollbar {
  @apply h-2 w-2;
}

.orders-container::-webkit-scrollbar-track {
  @apply rounded-full bg-transparent;
}

.orders-container::-webkit-scrollbar-thumb {
  @apply rounded-full bg-zinc-700;
}

.orders-container::-webkit-scrollbar-thumb:hover {
  @apply bg-zinc-600;
}
</style>
