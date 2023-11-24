<script lang="ts" setup>
import { computed } from 'vue'
import { XCircleIcon, BadgeCheckIcon } from 'lucide-vue-next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'

import { useAddressStore } from '@/store'
import { cancelOrder, type Order, getFiatRate } from '@/queries/orders-api'
import { prettyBalance } from '@/lib/formatters'
import { calcFiatPrice, showFiat, useBtcUnit } from '@/lib/helpers'
import Decimal from 'decimal.js'

const address = useAddressStore().address

const props = defineProps<{
  order: Order
  orderType: 'ask' | 'bid'
}>()

const isMyOrder = computed(() => {
  if (props.orderType === 'ask') {
    return props.order.sellerAddress === address
  }

  return props.order.buyerAddress === address
})
const isFreeOrder = computed(() => {
  return props.orderType === 'ask' && props.order.freeState === 1
})

const queryClient = useQueryClient()
const { mutate } = useMutation({
  mutationFn: cancelOrder,
  onSuccess: () => {
    ElMessage.success('Order canceled')
    const queryKey = props.orderType === 'ask' ? 'askOrders' : 'bidOrders'
    queryClient.invalidateQueries([queryKey])
  },
  onError: (err: any) => {
    ElMessage.error(err.message)
  },
})
async function onCancel() {
  mutate({ orderId: props.order.orderId })
}

// fiat price
const { data: fiatRate } = useQuery({
  queryKey: ['fiatRate'],
  queryFn: getFiatRate,
})
</script>

<template>
  <tr class="cursor-pointer">
    <td class="td">
      <el-tooltip
        content="This order is official and free to take."
        placement="right"
        effect="light"
        v-if="isFreeOrder"
      >
        <BadgeCheckIcon class="box-content h-4 w-4 pr-2 text-orange-300" />
      </el-tooltip>
    </td>
    <td class="td flex items-center gap-2">
      <span
        class="flex items-center"
        :class="{
          'text-red-500': orderType === 'ask',
          'text-green-500': orderType === 'bid',
        }"
      >
        <span v-if="isFreeOrder" class="">0</span>
        <span v-else>
          {{ prettyBalance(order.coinRatePrice, useBtcUnit) }}
        </span>
      </span>

      <span class="text-xs text-zinc-500" v-if="showFiat && fiatRate">
        {{ '$' + calcFiatPrice(order.coinRatePrice, fiatRate) }}
      </span>
    </td>

    <td class="td-right">{{ order.coinAmount }}</td>

    <td class="td-right">
      <template v-if="isFreeOrder">
        <span
          class="rounded bg-green-700/30 px-2 py-1 text-xs font-bold text-green-500"
        >
          FREE
        </span>
      </template>

      <span v-else class="inline-grid grid-cols-5 items-center gap-1">
        <span :class="showFiat && fiatRate ? 'col-span-3' : 'col-span-5'">{{
          prettyBalance(order.amount, useBtcUnit)
        }}</span>

        <span
          class="text-xs text-zinc-500 col-span-2"
          v-if="showFiat && fiatRate"
        >
          {{ '$' + calcFiatPrice(order.amount, fiatRate) }}
        </span>
      </span>
    </td>

    <td class="td">
      <div class="flex h-full w-full items-center justify-center">
        <button @click.stop="onCancel" title="Cancel Order" v-if="isMyOrder">
          <XCircleIcon
            class="h-4 w-4 text-zinc-500 transition hover:text-zinc-300"
          />
        </button>
      </div>
    </td>
  </tr>
</template>

<style scoped>
.td {
  @apply py-1 text-left font-normal;
}

.td-right {
  @apply py-1 text-right font-normal;
}
</style>
