<script lang="ts" setup>
import { computed } from 'vue'
import type { Order } from '@/queries'
import { useAddressStore } from '@/store'
import { XCircleIcon } from 'lucide-vue-next'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { cancelOrder } from '@/queries'
import { ElMessage } from 'element-plus'

const address = useAddressStore().address

const props = defineProps<{
  order: Order
  orderType: 'ask' | 'bid'
}>()

const prettyPrice = computed(() => {
  // 将字符串化为带小数点的数字
  return (Number(props.order.coinRatePrice) / 1e8).toFixed(8)
})

const prettyTotalAmount = computed(() => {
  // 将字符串化为带小数点的数字
  return (Number(props.order.amount) / 1e8).toFixed(8)
})

const isMyOrder = computed(() => {
  if (props.orderType === 'ask') {
    return props.order.sellerAddress === address
  }

  return props.order.buyerAddress === address
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
    <td
      class="td"
      :class="{
        'text-red-500': orderType === 'ask',
        'text-green-500': orderType === 'bid',
      }"
    >
      {{ prettyPrice }}
    </td>
    <td class="td">{{ order.coinAmount }}</td>
    <td class="td">{{ prettyTotalAmount }}</td>
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
