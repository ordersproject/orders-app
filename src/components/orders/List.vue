<script lang="ts" setup>
import { useQuery } from '@tanstack/vue-query'
import { computed, inject } from 'vue'

import { getFiatRate, getMarketPrice, type Order } from '@/queries/orders-api'
import { useNetworkStore } from '@/store'
import { defaultPair, selectedPairKey } from '@/data/trading-pairs'

import OrderItem from './Item.vue'
import { prettyBalance } from '@/lib/formatters'
import { calcFiatPrice, showFiat, unit, useBtcUnit } from '@/lib/helpers'
import Decimal from 'decimal.js'

const networkStore = useNetworkStore()

const props = withDefaults(
  defineProps<{
    askOrders?: Order[]
    bidOrders?: Order[]
  }>(),
  {
    askOrders: () => [],
    bidOrders: () => [],
  }
)
const rearrangedAskOrders = computed(() => {
  // extract all free orders and put them at the bottom
  const freeOrders = props.askOrders.filter((order) => order.freeState === 1)
  const nonFreeOrders = props.askOrders.filter((order) => order.freeState !== 1)

  return [...nonFreeOrders, ...freeOrders]
})

defineEmits(['useBuyPrice', 'useSellPrice'])

const selectedPair = inject(selectedPairKey, defaultPair)

const { data: marketPrice } = useQuery({
  queryKey: [
    'marketPrice',
    { network: networkStore.network, tick: selectedPair.fromSymbol },
  ],
  queryFn: () => getMarketPrice({ tick: selectedPair.fromSymbol }),
})

// fiat price
const { data: fiatRate } = useQuery({
  queryKey: ['fiatRate'],
  queryFn: getFiatRate,
})
</script>

<template>
  <div class="flex flex-col gap-y-4 max-h-[60vh]">
    <div class="nicer-scrollbar h-full overflow-y-scroll pr-1" id="askOrders">
      <table class="w-full">
        <thead>
          <tr class="">
            <th class="th th-sticky"></th>
            <th class="th th-sticky">Price ({{ unit }})</th>
            <th class="th-right th-sticky">
              <div class="flex items-center justify-end">
                <span>Amount</span>
                <span class="ml-2">
                  {{ '$' + selectedPair.fromSymbol.toUpperCase() }}
                </span>
                <img
                  :src="selectedPair.fromIcon"
                  class="h-4 rounded-full inline ml-1"
                />
              </div>
            </th>
            <th class="th-right th-sticky">
              <div class="flex items-center justify-end">
                <span>Total</span>
                <span class="ml-2">({{ unit }})</span>
                <img
                  :src="selectedPair.toIcon"
                  class="h-4 rounded-full inline ml-1"
                />
              </div>
            </th>
            <th class="th th-sticky"></th>
          </tr>
        </thead>

        <tbody v-if="askOrders.length">
          <OrderItem
            v-for="order in rearrangedAskOrders"
            :key="order.orderId"
            :order="order"
            :order-type="'ask'"
            @click="
              $emit('useBuyPrice', Number(order.coinRatePrice), order.orderId)
            "
          />
        </tbody>
      </table>
      <div
        class="flex h-3/4 w-full items-center justify-center"
        v-if="!askOrders.length"
      >
        <span class="text-zinc-500">No ask orders</span>
      </div>
    </div>

    <div class="">
      <el-tooltip :content="`Market Price`" placement="right" effect="light">
        <div class="inline-flex items-center">
          <span
            :class="[
              'text-lg',
              marketPrice ? 'text-green-500' : 'text-zinc-500',
            ]"
          >
            {{
              marketPrice
                ? prettyBalance(marketPrice, useBtcUnit) + ' ' + unit
                : '-'
            }}
          </span>
          <span
            class="text-xs text-zinc-500 pl-2"
            v-if="showFiat && fiatRate && marketPrice"
          >
            {{ '$' + calcFiatPrice(marketPrice, fiatRate) }}
          </span>
        </div>
      </el-tooltip>
    </div>

    <div class="nicer-scrollbar h-full overflow-y-scroll pr-1">
      <table class="-mt-8 w-full" v-if="bidOrders.length">
        <thead class="invisible">
          <tr class="">
            <th class="th"></th>
            <th class="th">Price ({{ unit }})</th>
            <th class="th-right">
              <div class="flex items-center justify-end">
                <span>Amount</span>
                <span class="ml-2">
                  {{ '$' + selectedPair.fromSymbol.toUpperCase() }}
                </span>
                <img
                  :src="selectedPair.fromIcon"
                  class="h-4 rounded-full inline ml-1"
                />
              </div>
            </th>
            <th class="th-right">
              <div class="flex items-center justify-end">
                <span>Total</span>
                <span class="ml-2">({{ unit }})</span>
                <img
                  :src="selectedPair.toIcon"
                  class="h-4 rounded-full inline ml-1"
                />
              </div>
            </th>
            <th class="th"></th>
          </tr>
        </thead>

        <tbody>
          <OrderItem
            v-for="order in bidOrders"
            :key="order.orderId"
            :order="order"
            :order-type="'bid'"
            @click="
              $emit('useSellPrice', Number(order.coinRatePrice), order.orderId)
            "
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

.th-sticky {
  @apply sticky top-0 bg-zinc-900;
}

.th-right {
  @apply pb-2 pt-0 text-right text-sm font-normal text-zinc-500;
}
</style>
