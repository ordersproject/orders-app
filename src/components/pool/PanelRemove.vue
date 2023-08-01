<script lang="ts" setup>
import { defaultPair, selectedPoolPairKey } from '@/data/trading-pairs'
import { getMyPoolOrders, type PoolOrder } from '@/queries/pool'
import { useAddressStore, useNetworkStore } from '@/store'
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue'
import { useQuery } from '@tanstack/vue-query'
import { CheckIcon } from 'lucide-vue-next'
import { ChevronsUpDownIcon } from 'lucide-vue-next'
import { Ref, computed, inject, ref } from 'vue'

const selectedPair = inject(selectedPoolPairKey, defaultPair)
const addressStore = useAddressStore()
const enabled = computed(() => !!addressStore.get)

const { isLoading: isLoadingOrders, data: poolOrders } = useQuery({
  queryKey: [
    'PoolOrders',
    {
      address: addressStore.get as string,
      tick: selectedPair.fromSymbol,
    },
  ],
  queryFn: () =>
    getMyPoolOrders({
      address: addressStore.get as string,
      tick: selectedPair.fromSymbol,
    }),
  enabled,
})

const selectedOrder: Ref<undefined | PoolOrder> = ref(undefined)
</script>

<template>
  <div class="max-w-md mx-auto">
    <form action="" class="flex flex-col min-h-[40vh]">
      <Listbox as="div" v-model="selectedOrder" class="grow">
        <ListboxLabel
          class="block text-base font-medium leading-6 text-zinc-300"
        >
          My Liquidity Records
        </ListboxLabel>

        <div class="relative col-span-5 mt-4">
          <ListboxButton
            class="relative w-full rounded-md bg-zinc-800 py-2 pl-3 pr-10 text-left text-zinc-300 shadow-sm ring-1 ring-inset ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400 sm:text-sm sm:leading-6"
          >
            <span class="block truncate">
              {{ selectedOrder ? selectedOrder.orderId : '-' }}
            </span>
            <span
              class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"
            >
              <ChevronsUpDownIcon
                class="h-5 w-5 text-zinc-400"
                aria-hidden="true"
              />
            </span>
          </ListboxButton>

          <transition
            leave-active-class="transition ease-in duration-100"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <ListboxOptions
              class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-zinc-800 py-1 text-base shadow-lg ring-zinc-700 ring-1 ring-inset focus:outline-none sm:text-sm"
            >
              <ListboxOption
                v-if="!poolOrders?.length"
                :disabled="true"
                class="text-right text-zinc-500 text-sm py-2 px-4"
              >
                No Records
              </ListboxOption>

              <ListboxOption
                as="template"
                v-for="order in poolOrders"
                :key="order.orderId"
                :value="order"
                v-slot="{ active, selectedOrder }"
              >
                <li
                  :class="[
                    active ? 'bg-orange-300 text-orange-900' : 'text-zinc-300',
                    'relative  select-none py-2 pl-3 pr-9',
                  ]"
                >
                  <span
                    :class="[
                      selectedOrder ? 'font-semibold' : 'font-normal',
                      'block truncate',
                    ]"
                    >{{ order.orderId }}</span
                  >

                  <span
                    v-if="selectedOrder"
                    :class="[
                      active ? 'text-white' : 'text-orange-400',
                      'absolute inset-y-0 right-0 flex items-center pr-4',
                    ]"
                  >
                    <CheckIcon class="h-5 w-5" aria-hidden="true" />
                  </span>
                </li>
              </ListboxOption>
            </ListboxOptions>
          </transition>
        </div>
      </Listbox>

      <div class="flex justify-center">
        <button
          class="mx-auto bg-orange-300 w-full py-3 text-orange-950 rounded-md disabled:cursor-not-allowed disabled:opacity-30"
          :disabled="!selectedOrder"
        >
          Remove
        </button>
      </div>
    </form>
  </div>
</template>
