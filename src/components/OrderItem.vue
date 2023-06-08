<script lang="ts" setup>
import { computed } from 'vue'
import type { Order } from '@/queries'

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
  </tr>
</template>

<style scoped>
.td {
  @apply py-1 text-left font-normal;
}
</style>
