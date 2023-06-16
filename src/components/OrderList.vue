<script lang="ts" setup>
import { useQuery } from '@tanstack/vue-query'
import OrderItem from './OrderItem.vue'
import { getMarketPrice, type Order } from '@/queries'
import { useNetworkStore } from '@/store'
import { cn } from '@/lib/helpers'

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
  <div class="flex flex-col">
    <div class="flex-1">
      <table class="w-full">
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
    </div>

    <div class="">
      <el-tooltip :content="`Market Price`" placement="right" effect="light">
        <span
          :class="
            cn('text-xl', marketPrice ? 'text-green-500' : 'text-zinc-500')
          "
        >
          {{ marketPrice?.toFixed(8) || '-' }}
        </span>
      </el-tooltip>
    </div>

    <div class="flex-1">
      <table class="w-full flex-1">
        <thead class="invisible">
          <tr>
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
    </div>
  </div>
</template>

<style scoped>
.th {
  @apply py-2 text-left text-sm font-normal text-zinc-500;
}
</style>
