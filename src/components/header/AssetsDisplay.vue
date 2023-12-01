<script lang="ts" setup>
import { useQueries, useQuery } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'
import { computed, watch } from 'vue'
import { ChevronsUpDownIcon, Loader2Icon } from 'lucide-vue-next'
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/vue'

import { prettyBalance, prettyCoinDisplay } from '@/lib/formatters'
import { useAddressStore, useNetworkStore } from '@/store'
import { getBalance } from '@/queries/unisat'
import { getBrc20s } from '@/queries/orders-api'
import { useExcludedBalanceQuery } from '@/queries/excluded-balance'
import { unit, useBtcUnit } from '@/lib/helpers'
import { HelpCircleIcon } from 'lucide-vue-next'

const networkStore = useNetworkStore()
const addressStore = useAddressStore()
const address = computed(() => addressStore.get)
const enabled = computed(() => !!addressStore.get)

const { data: balance } = useQuery({
  queryKey: [
    'balance',
    { network: networkStore.network, address: address.value! },
  ],
  queryFn: () => getBalance(),
  enabled,
})

const { data: excludedBalance } = useExcludedBalanceQuery(address, enabled)

const availableBalanceRatioColor = computed(() => {
  if (excludedBalance.value === undefined || balance.value === undefined) {
    return ''
  }

  const ratio = excludedBalance.value / balance.value

  if (ratio < 0.5) {
    return 'text-red-500'
  }

  if (ratio < 0.8) {
    return 'text-yellow-500'
  }

  return 'text-green-500'
})

// watch if balance is existed but less than 1200 satoshis
// if so, show warning
watch(
  () => balance.value,
  (newBalance) => {
    if (newBalance !== undefined && newBalance < 1200) {
      ElMessage.warning(
        'Your BTC balance is not enough to start a transaction. Please deposit some BTC to your address.'
      )
    }
  }
)

const { data: myBrc20s } = useQuery({
  queryKey: [
    'myBrc20s',
    {
      address: addressStore.get!,
      network: networkStore.network,
    },
  ],
  queryFn: () => getBrc20s({ address: addressStore.get! }),

  enabled: computed(
    () => networkStore.network !== 'testnet' && !!addressStore.get
  ),
})
</script>

<template>
  <div class="text-sm text-zinc-300">
    <div
      v-if="excludedBalance !== undefined && balance !== undefined"
      class="group flex items-center gap-1"
    >
      <Menu as="div" class="relative inline-block text-left">
        <div>
          <MenuButton
            class="inline-flex w-full items-center justify-center gap-x-1 rounded-md px-3 shadow-sm"
          >
            <span>
              {{ prettyBalance(excludedBalance, useBtcUnit) }} {{ unit }}
            </span>
            <span class="text-xs" :class="availableBalanceRatioColor">
              ({{ ((excludedBalance / balance) * 100).toFixed(0) }}%)
            </span>

            <div class="flex h-4 w-4 items-center justify-center">
              <ChevronsUpDownIcon
                class="h-3 w-3 transition-all duration-200 ease-in-out group-hover:h-4 group-hover:w-4"
              />
            </div>
          </MenuButton>
        </div>

        <transition
          enter-active-class="transition ease-out duration-100"
          enter-from-class="transform opacity-0 scale-95"
          enter-to-class="transform opacity-100 scale-100"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="transform opacity-100 scale-100"
          leave-to-class="transform opacity-0 scale-95"
        >
          <MenuItems
            class="absolute right-0 z-10 mt-4 w-80 origin-top-right divide-y divide-zinc-700 overflow-hidden rounded-md bg-zinc-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          >
            <MenuItem v-slot="{ active }" disabled>
              <div
                :class="[
                  'block px-6 py-4 transition-all',
                  active && 'bg-zinc-950',
                ]"
              >
                <div class="text-orange-300">BTC</div>
                <div class="flex items-center mt-2 justify-between">
                  <div class="text-xs text-zinc-500">Available Balance</div>
                  <div class="text-xs">
                    {{ prettyBalance(excludedBalance, useBtcUnit) }} {{ unit }}
                  </div>
                </div>

                <div class="flex items-center mt-1 justify-between">
                  <div class="text-xs text-zinc-500">Total Balance</div>
                  <div class="text-xs">
                    {{ prettyBalance(balance, useBtcUnit) }} {{ unit }}
                  </div>
                </div>

                <!-- usable % -->
                <div class="flex items-center mt-1 justify-between">
                  <div class="text-xs text-zinc-500">Avaiable BTC %</div>
                  <div class="text-xs" :class="availableBalanceRatioColor">
                    {{ ((excludedBalance / balance) * 100).toFixed(2) }}%
                  </div>
                </div>

                <Disclosure>
                  <DisclosureButton
                    class="py-2 text-xs mt-2 underline inline-flex items-center gap-1"
                  >
                    <HelpCircleIcon class="h-4 w-4 text-orange-300" />
                    Why can I only use part of my BTC?
                  </DisclosureButton>
                  <transition
                    enter-active-class="transition duration-100 ease-out"
                    enter-from-class="transform scale-95 opacity-0"
                    enter-to-class="transform scale-100 opacity-100"
                    leave-active-class="transition duration-75 ease-out"
                    leave-from-class="transform scale-100 opacity-100"
                    leave-to-class="transform scale-95 opacity-0"
                  >
                    <DisclosurePanel
                      class="text-gray-300 text-xs bg-black rounded-md p-2 -mx-2"
                    >
                      <p class="">
                        There are 2 parts of your overall BTC balance that you
                        don't want to spend.
                      </p>
                      <p class="mt-1">
                        1. Those that actually contain BRC-20 / Ordinals.
                      </p>
                      <p class="mt-1">
                        2. Those that are placed in orders (bid / liquidity).
                      </p>
                      <p class="mt-1 text-orange-300">
                        Plus, currently we only select part of your BTC UTXOs to
                        spend in each transaction to minimize the transaction
                        fee.
                      </p>
                    </DisclosurePanel>
                  </transition>
                </Disclosure>
              </div>
            </MenuItem>

            <MenuItem
              v-slot="{ active }"
              v-if="myBrc20s && myBrc20s.length"
              v-for="brc20 in myBrc20s"
              :key="brc20.token"
              disabled
            >
              <div
                :class="[
                  'block px-6 py-4 transition-all',
                  active && 'bg-zinc-950',
                ]"
              >
                <div class="text-orange-300 uppercase">${{ brc20.token }}</div>
                <div class="mt-2 space-y-1 text-xs">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-zinc-500">Available</span>
                    <span class="text-right">
                      {{
                        prettyCoinDisplay(
                          brc20.availableBalance,
                          '$' + brc20.token
                        )
                      }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-zinc-500">Transferable</span>
                    <span class="text-right">
                      {{
                        prettyCoinDisplay(
                          brc20.transferBalance,
                          '$' + brc20.token
                        )
                      }}
                    </span>
                  </div>
                </div>
              </div>
            </MenuItem>
          </MenuItems>
        </transition>
      </Menu>
    </div>

    <span v-else>
      <Loader2Icon class="h-5 animate-spin" />
    </span>
  </div>
</template>
