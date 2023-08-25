<script lang="ts" setup>
import { computed } from 'vue'
import { XCircleIcon, BadgeCheckIcon } from 'lucide-vue-next'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'

import { useAddressStore } from '@/store'
import { cancelOrder, type Order } from '@/queries/orders-api'
import { prettyBalance } from '@/lib/helpers'

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
    <td
      class="td"
      :class="{
        'text-red-500': orderType === 'ask',
        'text-green-500': orderType === 'bid',
      }"
    >
      <span v-if="isFreeOrder" class="">0.00000000</span>
      <span v-else>
        {{ prettyBalance(order.coinRatePrice) }}
      </span>
    </td>
    <td class="td">{{ order.coinAmount }}</td>
    <td class="td">
      <template v-if="isFreeOrder">
        <span
          class="rounded bg-green-700/30 px-2 py-1 text-xs font-bold text-green-500"
        >
          FREE
        </span>
      </template>

      <span v-else>{{ prettyBalance(order.amount) }}</span>
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
</style>