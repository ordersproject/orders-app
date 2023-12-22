<!-- <template> -->
<template>
  <Dialog
    :open="isOpen"
    @close="setIsOpen"
    class="z-999 fixed inset-0 inline-flex items-center justify-center shadow-md"
  >
    <DialogPanel
      class="h-5/6 w-5/6 transform overflow-hidden rounded-2xl bg-neutral-800 p-6 text-left align-middle shadow-lg shadow-orange-300/10 transition-all"
    >
      <div class="font-bold text-orange-300">
        {{ selectedPair.fromSymbol.toUpperCase() }}/{{
          selectedPair.toSymbol.toUpperCase()
        }}
      </div>

      <div
        class="decoration-solid-5 mt-2 underline decoration-orange-300 underline-offset-8"
      >
        K-Line
      </div>

      <DialogTitle class="items-cente mt-4 flex w-1/3 justify-between">
        <button
          :class="[
            'rounded-lg',
            'py-0.5',
            'px-5',
            'bg-neutral-700',
            'text-center',
            item.selected ? 'text-orange-300' : 'text-zinc-400',
          ]"
          :data-headlessui-state="item.selected"
          v-for="item in interval"
        >
          {{ item.option }}
        </button>
      </DialogTitle>
      <div></div>
      <div ref="chartRef" class="z-50 mt-4 h-3/4 w-full bg-black"></div>
    </DialogPanel>
  </Dialog>

  <!-- <TransitionRoot appear :show="isOpen" as="template">
 

    <Dialog as="div" @close="closeModal" class="z-999 fixed inset-0">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <TransitionChild
          as="template"
          enter="duration-300 ease-out"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <DialogPanel
            class="h-full w-screen transform overflow-hidden rounded-2xl bg-zinc-900 p-6 text-left align-middle shadow-xl transition-all"
          >
            <DialogTitle
              as="h3"
              class="text-lg font-medium leading-6 text-gray-900"
            >
              Payment successful
            </DialogTitle>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                Your payment has been successfully submitted. We’ve sent you an
                email with all of the details of your order.
              </p>
            </div>

            <div class="mt-4">
              <button
                type="button"
                class="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                @click="closeModal"
              >
                Got it, thanks!
              </button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot> -->
</template>

<script setup lang="ts">
import { ref, inject, reactive, onMounted, nextTick, watch } from 'vue'

import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue'
import tradingPairs, {
  defaultPoolPair,
  selectedPairKey,
} from '@/data/trading-pairs'

import { createChart } from 'lightweight-charts'
import { getKline } from '@/queries/orders-api'
defineEmits(['update:openEchart'])
const props = defineProps(['isOpen'])
const chartRef = ref()
const selectedPair = inject(selectedPairKey, defaultPoolPair)

const interval = reactive([
  {
    option: '15m',
    selected: 'selected',
  },
  {
    option: '1h',
    selected: '',
  },
  {
    option: '4h',
    selected: '',
  },
  {
    option: '1d',
    selected: '',
  },
  {
    option: '1w',
    selected: '',
  },
])

watch(
  () => props.isOpen,
  (val: any) => {
    if (val) initKlines()
  }
)

function setIsOpen(value) {
  // isOpen.value = value
}

async function initKlines() {
  const chartOptions = {
    layout: {
      textColor: 'white',
      background: { type: 'gradient', color: '#171222' },
    },
    timeScale: {
      secondsVisible: false,
    },
    crosshair: {
      mode: 0,
    },
    grid: {
      vertLines: {
        color: 'rgba(138, 138, 138,0.3)',
      },
      horzLines: {
        color: 'rgba(138, 138, 138,0.3)',
      },
    },

    localization: {
      locale: 'en',
    },
  }

  setTimeout(async () => {
    chartRef.value.style.cursor = 'crosshair'
    const chart = createChart(chartRef.value, chartOptions)

    const candleStickData = await getKline()
    const mainSeries = chart.addCandlestickSeries()
    mainSeries.setData(candleStickData)
    //chart.timeScale().fitContent()
    chartRef.value = chart
  }, 2000)
  return
  const lineSeries = chart.addLineSeries({ color: '#2962FF' })
  const data2 = [
    { value: 12, time: 1642425322 },
    { value: 8, time: 1642511722 },
    { value: 10, time: 1642598122 },
    { value: 12, time: 1642684522 },
    { value: 13, time: 1642770922 },
    { value: 12, time: 1642857322 },
    { value: 14, time: 1642943722 },
    { value: 16, time: 1643030122 },
    { value: 11, time: 1643116522 },
    { value: 9, time: 1643202922 },
  ]
  lineSeries.setData(data2)
  const candlestickSeries = chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    // priceLineWidth: 3,
    // baseLineWidth:3
  })
  const data = [
    { open: 10, high: 10.63, low: 9.49, close: 9.55, time: 1642427876 },
    { open: 9.55, high: 10.3, low: 9.42, close: 9.94, time: 1642514276 },
    { open: 9.94, high: 10.17, low: 9.92, close: 9.78, time: 1642600676 },
    { open: 9.78, high: 10.59, low: 9.18, close: 9.51, time: 1642687076 },
    { open: 9.51, high: 10.46, low: 9.1, close: 10.17, time: 1642773476 },
    { open: 10.17, high: 10.96, low: 10.16, close: 10.47, time: 1642859876 },
    { open: 10.47, high: 11.39, low: 10.4, close: 10.81, time: 1642946276 },
    { open: 10.81, high: 11.6, low: 10.3, close: 10.75, time: 1643032676 },
    { open: 10.75, high: 11.6, low: 10.49, close: 10.93, time: 1643119076 },
    { open: 10.93, high: 11.53, low: 10.76, close: 10.96, time: 1643205476 },
  ]

  candlestickSeries.setData(data)

  chartRef.value = chart
}

async function generateCandlestickData() {}

onMounted(async () => {
  // window.addEventListener('resize', () => {
  //   chartRef.value.resize(window.innerWidth, window.innerHeight)
  // })
})

function closeModal() {
  // isOpen = false
}
</script>

<!-- <div ref="chartRef" class="chart"></div>

  <div @click="updateChart">update</div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { BarChart, LineChart } from 'echarts/charts'
import { createChart } from 'lightweight-charts'
import { ref, onMounted } from 'vue'
const chartRef = ref()



async function initKlines() {
  const chartOptions = {
    layout: {
      textColor: 'white',
      background: { type: 'gradient', color: '#171222' },
    },
    crosshair: {
      mode: 0,
    },
    grid: {
      vertLines: {
        color: 'rgba(138, 138, 138,0.3)',
      },
      horzLines: {
        color: 'rgba(138, 138, 138,0.3)',
      },
    },

    localization: {
      locale: 'en',
    },
  }
  chartRef.value.style.cursor = 'crosshair'
  const chart = createChart(chartRef.value, chartOptions)

  const candleStickData = generateCandlestickData()
  const mainSeries = chart.addCandlestickSeries()
  mainSeries.setData(candleStickData)
  chartRef.value = chart
  return
  const lineSeries = chart.addLineSeries({ color: '#2962FF' })
  const data2 = [
    { value: 12, time: 1642425322 },
    { value: 8, time: 1642511722 },
    { value: 10, time: 1642598122 },
    { value: 12, time: 1642684522 },
    { value: 13, time: 1642770922 },
    { value: 12, time: 1642857322 },
    { value: 14, time: 1642943722 },
    { value: 16, time: 1643030122 },
    { value: 11, time: 1643116522 },
    { value: 9, time: 1643202922 },
  ]
  lineSeries.setData(data2)
  const candlestickSeries = chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    // priceLineWidth: 3,
    // baseLineWidth:3
  })
  const data = [
    { open: 10, high: 10.63, low: 9.49, close: 9.55, time: 1642427876 },
    { open: 9.55, high: 10.3, low: 9.42, close: 9.94, time: 1642514276 },
    { open: 9.94, high: 10.17, low: 9.92, close: 9.78, time: 1642600676 },
    { open: 9.78, high: 10.59, low: 9.18, close: 9.51, time: 1642687076 },
    { open: 9.51, high: 10.46, low: 9.1, close: 10.17, time: 1642773476 },
    { open: 10.17, high: 10.96, low: 10.16, close: 10.47, time: 1642859876 },
    { open: 10.47, high: 11.39, low: 10.4, close: 10.81, time: 1642946276 },
    { open: 10.81, high: 11.6, low: 10.3, close: 10.75, time: 1643032676 },
    { open: 10.75, high: 11.6, low: 10.49, close: 10.93, time: 1643119076 },
    { open: 10.93, high: 11.53, low: 10.76, close: 10.96, time: 1643205476 },
  ]

  candlestickSeries.setData(data)

  chart.timeScale().fitContent()
  chartRef.value = chart
}

function updateChart() {}

onMounted(() => {
  initKlines()
  window.addEventListener('resize', () => {
    chartRef.value.resize(window.innerWidth, window.innerHeight)
  })
})
</script>

<style scoped>
.chart {
  padding-top: 200px;
  z-index: 99;
  width: 90vw;
  height: 350px;
  border-radius: 4px;
  opacity: 1;
  margin-left: 18px;
  margin-top: 12px;
  background: #171222;
}
</style> -->
