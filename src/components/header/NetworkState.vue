<script setup lang="ts">
import { Ref, computed, ref, watch } from 'vue'
import { get, useStorage } from '@vueuse/core'
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  RadioGroup,
  RadioGroupLabel,
  RadioGroupDescription,
  RadioGroupOption,
  PopoverOverlay,
} from '@headlessui/vue'
import { useQuery } from '@tanstack/vue-query'
import { CarIcon, CheckIcon, Loader2Icon } from 'lucide-vue-next'

import { useNetworkStore, useFeebStore } from '@/store'
import { FeebPlan, getFeebPlans } from '@/queries/proxy'
import { calcFiatPrice, unit, useBtcUnit } from '@/lib/helpers'
import { prettyBalance } from '@/lib/formatters'
import { getFiatRate } from '@/queries/orders-api'
import {
  BID_TX_SIZE,
  BUY_TX_SIZE,
  RELEASE_TX_SIZE,
  SELL_TX_SIZE,
  SEND_TX_SIZE,
} from '@/data/constants'

// custom feeb plan
const customFeeb = useStorage('customFeeb', 2)
const customFeebPlan: Ref<FeebPlan> = ref({
  title: 'Custom',
  feeRate: customFeeb,
  desc: '',
})
function updateCustomFeeb(e: any) {
  const target = e.target as HTMLInputElement
  const value = Number(target.value)

  if (Number.isNaN(value)) return

  customFeeb.value = value
}

// estimate miner fee for every actions
const transactionActions = [
  {
    title: 'Buy',
    size: BUY_TX_SIZE,
    equalitySymbol: '>=',
  },
  {
    title: 'Sell',
    size: SELL_TX_SIZE,
    equalitySymbol: '>=',
  },
  {
    title: 'Ask',
    size: 0,
  },
  {
    title: 'Bid',
    size: BID_TX_SIZE,
    equalitySymbol: '>=',
  },
]

const poolActions = [
  {
    title: 'Add BRC Liquidity',
    size: 0,
  },
  {
    title: 'Add 2-Way Liquidity',
    size: SEND_TX_SIZE,
    equalitySymbol: '>=',
  },
  {
    title: 'Remove Liquidity',
    size: 0,
  },
  {
    title: 'Release',
    size: RELEASE_TX_SIZE,
  },
  {
    title: 'Claim Reward',
    size: 0,
  },
]

function getPoolActionsPriceDisplay(
  actionSize: number,
  equalitySymbol: string = '>='
) {
  if (!selectedFeebPlan.value)
    return {
      inCrypto: '-',
      inFiat: '-',
    }

  const prefix = actionSize > 0 ? `${equalitySymbol} ` : ''
  const btcPriceDisplay =
    prettyBalance(
      actionSize * selectedFeebPlan.value.feeRate,
      get(useBtcUnit)
    ) +
    ' ' +
    unit.value

  const fiatPriceDisplay =
    fiatRate.value && actionSize > 0
      ? calcFiatPrice(
          actionSize * selectedFeebPlan.value.feeRate,
          get(fiatRate)
        )
      : ''

  return {
    inCrypto: prefix + btcPriceDisplay,
    inFiat: fiatPriceDisplay ? '$' + fiatPriceDisplay : '$0',
  }
}

const networkStore = useNetworkStore()
const { data: feebPlans, isLoading: isLoadingFeebPlans } = useQuery({
  queryKey: ['feebPlans', { network: networkStore.network }],
  queryFn: () => getFeebPlans({ network: networkStore.network }),
})
const selectableFeebPlans = computed(() => {
  if (!feebPlans.value) return

  return [...feebPlans.value, customFeebPlan.value]
})

const selectedFeebPlanTitle = useStorage('selectedFeebPlanTitle', 'Avg')
const selectedFeebPlan = computed(() => {
  if (!feebPlans.value) return

  if (selectedFeebPlanTitle.value === 'Custom') {
    return customFeebPlan.value
  }

  return feebPlans.value.find(
    (plan) => plan.title === selectedFeebPlanTitle.value
  )
})
// tell feebStore whenever selectedFeebPlan changes
const feebStore = useFeebStore()
watch(
  selectedFeebPlan,
  (plan) => {
    if (!plan) return
    if (!plan.feeRate) return

    feebStore.set(plan.feeRate)
  },
  { immediate: true, deep: true }
)

const traffic = computed(() => {
  if (!feebPlans.value) return '-'

  const avgFeeRate = feebPlans.value[1].feeRate

  if (avgFeeRate < 10) return 'Low'
  if (avgFeeRate < 20) return 'Normal'
  if (avgFeeRate < 50) return 'Busy'

  return 'Extremely Busy'
})
const trafficColorClass = computed(() => {
  switch (traffic.value) {
    case 'Low':
      return {
        text: 'text-green-500',
        bg: 'bg-green-500',
        secondaryBg: 'bg-green-400',
      }
    case 'Normal':
      return {
        text: 'text-yellow-500',
        bg: 'bg-yellow-500',
        secondaryBg: 'bg-yellow-400',
      }
    case 'Busy':
    case 'Extremely Busy':
      return {
        text: 'text-red-500',
        bg: 'bg-red-500',
        secondaryBg: 'bg-red-400',
      }
    default:
      return {
        text: 'text-zinc-500',
        bg: 'bg-zinc-500',
        secondaryBg: 'bg-zinc-400',
      }
  }
})
// cars symbol
const colorCarsCount = computed(() => {
  if (!feebPlans.value) return 0

  switch (traffic.value) {
    case 'Low':
      return 1
    case 'Normal':
      return 2
    case 'Busy':
      return 3
    case 'Extremely Busy':
      return 4
    default:
      return 0
  }
})
const delayedControl = ref(false)
function onSwitchShow(open: boolean) {
  if (open) {
    delayedControl.value = false
  } else {
    setTimeout(() => {
      delayedControl.value = true
    }, 500)
  }
}

// fiat price
const { data: fiatRate } = useQuery({
  queryKey: ['fiatRate'],
  queryFn: getFiatRate,
})
</script>

<template>
  <Popover class="relative text-sm text-zinc-300" v-slot="{ open }">
    <PopoverButton
      class="px-3 outline-none text-xs flex items-center gap-2 hover:scale-105"
      @click="onSwitchShow(open)"
    >
      <span class="">Network</span>
      <span class="relative flex h-2 w-2">
        <span
          class="animate-ping-slow absolute inline-flex h-full w-full rounded-full opacity-75"
          :class="trafficColorClass.secondaryBg"
        ></span>
        <span
          class="relative inline-flex rounded-full h-2 w-2"
          :class="trafficColorClass.bg"
        ></span>
      </span>

      <span class="pl-2">Gas</span>
      <span class="min-w-[60px]" v-if="isLoadingFeebPlans">
        <Loader2Icon class="text-zinc-500 h-4 w-4 mx-auto animate-spin" />
      </span>

      <span class="text-orange-300 text-left min-w-[60px]" v-else>
        {{
          selectedFeebPlan
            ? `${selectedFeebPlan.title} ${selectedFeebPlan.feeRate}`
            : '-'
        }}
      </span>
    </PopoverButton>

    <PopoverOverlay class="fixed inset-0 z-10 bg-black/50" />

    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <PopoverPanel
        class="absolute z-10 right-0 mt-4 w-[720px] origin-top-right overflow-hidden rounded-md bg-zinc-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none px-4 shadow-orange-300/20"
      >
        <div class="divide-y-2 divide-zinc-700">
          <div class="py-4">
            <div class="flex items-center justify-between">
              <div class="item-label">BTC Network Traffic</div>

              <div class="flex items-center gap-4">
                <transition
                  enter-active-class="transition duration-1000 ease-out"
                  enter-from-class="-translate-x-9 opacity-50"
                  enter-to-class="translate-x-0 opacity-100"
                >
                  <div class="flex gap-1" v-show="delayedControl">
                    <CarIcon
                      class="h-6 w-6"
                      :class="trafficColorClass.text"
                      aria-hidden="true"
                      v-for="i in Array.from({ length: colorCarsCount })"
                    />
                    <!-- gray cars -->
                    <CarIcon
                      class="h-6 w-6 text-zinc-700"
                      aria-hidden="true"
                      v-for="i in Array.from({ length: 4 - colorCarsCount })"
                    />
                  </div>
                </transition>

                <div class="font-bold py-1" :class="trafficColorClass.text">
                  {{ traffic }}
                </div>
              </div>
            </div>

            <div class="text-zinc-500 mt-4 text-xs">
              <p>
                BTC network traffic is
                <span
                  class="font-bold text-xs bg-black py-1 px-2 rounded whitespace-nowrap"
                  :class="[trafficColorClass.text]"
                >
                  {{ traffic }}
                </span>
                now.
              </p>
              <p class="mt-2">
                This affects the confirm speed of your transactions. The higher
                the traffic, the higher the fee rate you need to pay to get your
                transaction confirmed in time.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-5 divide-x-2 divide-zinc-700 py-4">
            <div
              class="flex flex-col items-stretch gap-4 justify-between pr-4 col-span-2"
            >
              <div class="item-label leading-none">Choose Gas Plan</div>

              <div class="grow">
                <RadioGroup name="feebPlan" v-model="selectedFeebPlanTitle">
                  <div class="space-y-4">
                    <RadioGroupOption
                      as="template"
                      v-for="plan in selectableFeebPlans"
                      :key="plan.title"
                      :value="plan.title"
                      v-slot="{ active, checked }"
                    >
                      <div
                        :class="[
                          active
                            ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-orange-300'
                            : '',
                          checked
                            ? 'bg-orange-300/75 text-white '
                            : 'bg-black ',
                        ]"
                        class="relative flex cursor-pointer rounded-lg px-5 py-4 shadow-md focus:outline-none"
                      >
                        <div class="flex w-full items-center justify-between">
                          <div class="flex items-center">
                            <div class="text-sm">
                              <RadioGroupLabel
                                as="p"
                                :class="
                                  checked ? 'text-white' : 'text-zinc-300'
                                "
                                class="font-medium"
                              >
                                {{ plan.title }}
                              </RadioGroupLabel>

                              <RadioGroupDescription
                                as="span"
                                :class="
                                  checked ? 'text-orange-100' : 'text-zinc-500'
                                "
                                class="inline"
                              >
                                <div class="mt-1">
                                  <div
                                    class="flex gap-1 items-center mb-1"
                                    v-if="plan.title.toLowerCase() === 'custom'"
                                  >
                                    <input
                                      type="text"
                                      class="bg-transparent text-sm w-8 border-0 outline-none border-b !border-zinc-500 py-0.5 px-0 focus:ring-0 focus:ring-transparent text-center"
                                      :class="
                                        checked ? 'text-white' : 'text-zinc-300'
                                      "
                                      :value="customFeeb"
                                      name="customFeeb"
                                      @input="
                                        (event) => updateCustomFeeb(event)
                                      "
                                    />

                                    <span>
                                      {{ `sat/vB` }}
                                    </span>
                                  </div>

                                  <span v-else>
                                    {{ `${plan.feeRate} sat/vB` }}
                                  </span>
                                </div>
                                <div class="">{{ plan.desc }}</div>
                              </RadioGroupDescription>
                            </div>
                          </div>
                          <div v-show="checked" class="shrink-0 text-white">
                            <CheckIcon
                              class="h-6 w-6 rounded-full bg-white/40 p-1"
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                      </div>
                    </RadioGroupOption>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div class="pl-4 col-span-3">
              <div class="item-label align-top leading-none">Estimated Gas</div>

              <div class="mt-4">
                <h3 class="text-zinc-500">Transaction Actions</h3>
                <div class="mt-3 divide divide-y-2 divide-zinc-700">
                  <div
                    class="flex items-center justify-between py-1.5"
                    v-for="action in transactionActions"
                    :key="action.title"
                  >
                    <div class="text-orange-300">
                      {{ action.title }}
                    </div>

                    <div class="text-right flex gap-4">
                      <div class="font-bold">
                        {{
                          getPoolActionsPriceDisplay(
                            action.size,
                            action?.equalitySymbol
                          ).inCrypto
                        }}
                        <div class="pl-2 text-zinc-500 text-xs">
                          {{ getPoolActionsPriceDisplay(action.size).inFiat }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <h3 class="text-zinc-500 mt-8">Pool Actions</h3>
                <div class="mt-3 divide divide-y-2 divide-zinc-700">
                  <div
                    class="flex items-center justify-between py-1.5"
                    v-for="action in poolActions"
                    :key="action.title"
                  >
                    <div class="text-orange-300">
                      {{ action.title }}
                    </div>

                    <div class="text-right flex gap-4">
                      <div class="font-bold">
                        {{
                          getPoolActionsPriceDisplay(
                            action.size,
                            action?.equalitySymbol
                          ).inCrypto
                        }}
                        <div class="pl-2 text-zinc-500 text-xs">
                          {{ getPoolActionsPriceDisplay(action.size).inFiat }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverPanel>
    </transition>
  </Popover>
</template>

<style scoped>
.item-label {
  @apply text-zinc-300 shrink-0;
}

.item-value {
  @apply text-right text-zinc-300;
}
</style>
