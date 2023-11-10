<script lang="ts" setup>
import { useQueries, useQuery } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'
import { computed, watch } from 'vue'
import { LoaderIcon, ChevronsUpDownIcon } from 'lucide-vue-next'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'

import { prettyCoinDisplay } from '@/lib/formatters'
import { useAddressStore, useNetworkStore } from '@/store'
import { getBalance } from '@/queries/unisat'
import { getBrc20s } from '@/queries/orders-api'
import { selectPair } from '@/data/trading-pairs'

const networkStore = useNetworkStore()
const addressStore = useAddressStore()
const address = computed(() => addressStore.get)
const enabled = computed(() => !!addressStore.get)

const selectedPair = selectPair()

const { data: balance } = useQuery({
  queryKey: [
    'balance',
    { network: networkStore.network, address: address.value! },
  ],
  queryFn: () => getBalance(),
  enabled,
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
    <div v-if="balance !== undefined" class="group flex items-center gap-1">
      <Menu as="div" class="relative inline-block text-left">
        <div>
          <MenuButton
            class="inline-flex w-full items-center justify-center gap-x-1 rounded-md pl-3 shadow-sm"
          >
            <span>
              {{ prettyCoinDisplay(balance, 'BTC') }}
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
            class="absolute right-0 z-10 mt-4 w-56 origin-top-right divide-y divide-zinc-700 overflow-hidden rounded-md bg-zinc-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          >
            <MenuItem v-slot="{ active }">
              <div
                :class="[
                  'block px-6 py-4 transition-all',
                  active && 'bg-zinc-950',
                ]"
              >
                <div class="text-orange-300">BTC</div>
                <div class="mt-2 text-xs">
                  {{ prettyCoinDisplay(balance, 'BTC') }}
                </div>
              </div>
            </MenuItem>

            <MenuItem
              v-slot="{ active }"
              v-if="myBrc20s && myBrc20s.length"
              v-for="brc20 in myBrc20s"
              :key="brc20.token"
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
      <LoaderIcon class="h-5 animate-spin" />
    </span>
  </div>
</template>
