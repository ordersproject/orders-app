<script setup lang="ts">
import { Ref, computed, ref, watch } from 'vue'
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  RadioGroup,
  RadioGroupLabel,
  RadioGroupDescription,
  RadioGroupOption,
} from '@headlessui/vue'
import { useQuery } from '@tanstack/vue-query'
import { useNetworkStore } from '@/store'
import { FeebPlan, getFeebPlans } from '@/queries/proxy'

const customFeebPlan: Ref<FeebPlan> = ref({
  title: 'Custom',
  feeRate: 2,
  desc: 'Dicide the fee rate you want to use',
})
const networkStore = useNetworkStore()
const { data: feebPlans } = useQuery({
  queryKey: ['feebPlans', { network: networkStore.network }],
  queryFn: () => getFeebPlans({ network: networkStore.network }),
  select(plans) {
    plans.push(customFeebPlan.value)

    return plans
  },
})

const selectedFeebPlan: Ref<FeebPlan | undefined> = ref()
watch(feebPlans, (plans) => {
  if (!plans) return

  selectedFeebPlan.value = plans[1]
})

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
</script>

<template>
  <Popover class="relative text-sm text-zinc-300">
    <PopoverButton class="px-3 outline-none text-xs flex items-center gap-2">
      <span>Network</span>
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

      <span class="pl-2">Fee</span>
      <span class="text-orange-300 min-w-[32px]">
        {{ selectedFeebPlan?.title ?? '-' }}
      </span>
    </PopoverButton>

    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <PopoverPanel
        class="absolute z-10 right-0 mt-4 w-[400px] origin-top-right overflow-hidden rounded-md bg-zinc-800 shadow-md ring-1 ring-black ring-opacity-5 focus:outline-none px-4 shadow-orange-300/20"
      >
        <div class="divide-y divide-zinc-700">
          <div class="py-4">
            <div class="flex items-center justify-between">
              <div class="item-label">Network Traffic</div>

              <div class="font-bold" :class="trafficColorClass.text">
                {{ traffic }}
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
              <p class="mt-1">
                This affects the speed of your transactions. The higher the
                traffic, the higher the fee rate you need to pay to get your
                transaction confirmed in time.
              </p>
            </div>
          </div>

          <div class="py-4 flex flex-col items-stretch gap-2 justify-between">
            <div class="item-label">Choose Fee Rate Plan</div>

            <div class="grow">
              <RadioGroup v-model="selectedFeebPlan">
                <div class="space-y-2">
                  <RadioGroupOption
                    as="template"
                    v-for="plan in feebPlans"
                    :key="plan.title"
                    :value="plan"
                    v-slot="{ active, checked }"
                  >
                    <div
                      :class="[
                        active
                          ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-orange-300'
                          : '',
                        checked ? 'bg-orange-300/75 text-white ' : 'bg-black ',
                      ]"
                      class="relative flex cursor-pointer rounded-lg px-5 py-4 shadow-md focus:outline-none"
                    >
                      <div class="flex w-full items-center justify-between">
                        <div class="flex items-center">
                          <div class="text-sm">
                            <RadioGroupLabel
                              as="p"
                              :class="checked ? 'text-white' : 'text-zinc-300'"
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
                                {{ `${plan.feeRate} sat/vB` }}
                              </div>
                              <div class="">{{ plan.desc }}</div>
                            </RadioGroupDescription>
                          </div>
                        </div>
                        <div v-show="checked" class="shrink-0 text-white">
                          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none">
                            <circle
                              cx="12"
                              cy="12"
                              r="12"
                              fill="#fff"
                              fill-opacity="0.2"
                            />
                            <path
                              d="M7 13l3 3 7-7"
                              stroke="#fff"
                              stroke-width="1.5"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </RadioGroupOption>
                </div>
              </RadioGroup>
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
