<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useQuery } from '@tanstack/vue-query'
import { ShieldAlertIcon, CheckCircle2 } from 'lucide-vue-next'

import unisatIcon from '@/assets/unisat-icon.png?url'
import { prettyAddress } from '@/lib/formatters'
import {
  useAddressStore,
  useDummiesStore,
  useNetworkStore,
  type Network,
} from '@/store'
import { getAddress, connect } from '@/queries/unisat'
import utils from '@/utils'
import whitelist from '@/lib/whitelist'

import UnisatModal from './UnisatModal.vue'
import AssetsDisplay from './AssetsDisplay.vue'
import NetworkState from './NetworkState.vue'
import Notifications from './Notifications.vue'
import TheNavbar from './TheNavbar.vue'

const addressStore = useAddressStore()
const networkStore = useNetworkStore()
const dummiesStore = useDummiesStore()

onMounted(async () => {
  if (window.unisat) {
    const unisat = window.unisat
    unisat.on('accountsChanged', (accounts: string[]) => {
      ElMessage.warning({
        message: 'Unisat account changed. Refreshing page...',
        type: 'warning',
        onClose: () => {
          window.location.reload()
        },
      })
    })

    // getNetwork
    const network: Network = await unisat.getNetwork()
    const address = addressStore.get

    // if not in whitelist, switch to mainnet
    if (network === 'testnet' && address && !whitelist.includes(address)) {
      const switchRes = await unisat.switchNetwork('livenet').catch(() => false)
      if (!switchRes) {
        ElMessage({
          message: 'Testnet is not available, please switch to livenet.',
          type: 'error',
          onClose: () => {
            // redirect to a blank page
            window.location.href = 'about:blank'
          },
        })
      }

      networkStore.set('livenet')
      return
    }
    networkStore.set(network)
  }
})
onBeforeUnmount(() => {
  // remove event listener
  window.unisat?.removeListener('accountsChanged', () => {})
})

// connect / address related
async function connectWallet() {
  if (!window.unisat) {
    unisatModalOpen.value = true
    return
  }

  await connect()
}

const { data: address } = useQuery({
  queryKey: ['address', { network: networkStore.network }],
  queryFn: async () => getAddress(),
  retry: 0,
})
const enabled = computed(() => !!address.value)
useQuery({
  queryKey: [
    'dummies',
    { network: networkStore.network, address: address.value },
  ],
  queryFn: async () =>
    utils.checkAndSelectDummies({
      checkOnly: true,
      addressParam: address.value,
    }),
  retry: 0,
  enabled,
})

async function switchNetwork() {
  if (!window.unisat) {
    ElMessage.warning('Please install the Unisat wallet extension first.')
    return
  }

  const network = networkStore.network === 'testnet' ? 'livenet' : 'testnet'
  const switchRes = await window.unisat.switchNetwork(network)
  if (switchRes) {
    networkStore.set(network)
  }

  // reload page
  window.location.reload()
}

function copyAddress() {
  // copy address value to clipboard
  if (!addressStore.get) return
  navigator.clipboard.writeText(addressStore.get)
  ElMessage.success('Address copied to clipboard')
}

const unisatModalOpen = ref(false)
</script>

<template>
  <UnisatModal v-model:open="unisatModalOpen" />

  <header class="flex items-center justify-between px-6 py-4 select-none">
    <TheNavbar />

    <div class="flex gap-2">
      <div class="hidden lg:block">
        <!-- <el-tooltip
          effect="light"
          placement="bottom"
          :content="`Click to switch to ${
            networkStore.network === 'testnet' ? 'livenet' : 'testnet'
          } `"
          v-if="addressStore.get && whitelist.includes(addressStore.get)"
        >
          <button
            class="h-10 cursor-pointer items-center rounded-lg bg-black/90 px-4 text-sm text-zinc-300 transition hover:text-orange-300"
            @click="switchNetwork"
          >
            {{ networkStore.network }}
          </button>
        </el-tooltip> -->
      </div>

      <button
        class="h-10 rounded-lg border-2 border-orange-300 px-4 transition hover:text-orange-950 hover:bg-orange-300"
        @click="connectWallet"
        v-if="!addressStore.get"
      >
        Connect Wallet
      </button>

      <div v-else class="flex items-center gap-2">
        <div
          class="flex h-10 items-center divide-x divide-zinc-700 rounded-lg bg-black/90 px-4"
        >
          <div
            class="lg:flex gap-2 pr-3 hidden cursor-pointer"
            @click="copyAddress"
            title="copy address"
          >
            <img class="h-5" :src="unisatIcon" alt="Unisat" />
            <span class="text-sm text-orange-300">
              {{ prettyAddress(addressStore.get, 4) }}
            </span>
          </div>

          <AssetsDisplay />

          <NetworkState />

          <!-- ready button -->
          <div class="pl-3" v-if="!dummiesStore.has">
            <el-tooltip effect="light" placement="bottom-end">
              <template #content>
                <h3 class="my-2 text-sm font-bold text-orange-300">
                  Create 2 dummies UTXOs to begin
                </h3>
                <div
                  class="mb-2 max-w-sm space-y-2 text-sm leading-relaxed text-zinc-300"
                >
                  <p>
                    When using Orders.Exchange for the first time, it's
                    necessary to prepare two UTXOs of 600 satoshis as a
                    prerequisite for the transaction.
                  </p>
                  <p>Click to complete this preparation.</p>
                </div>
              </template>
              <ShieldAlertIcon
                class="h-5 text-red-500"
                @click="utils.checkAndSelectDummies({})"
              />
            </el-tooltip>
          </div>
          <div class="pl-3" v-else>
            <CheckCircle2 class="h-5 text-orange-300" />
          </div>
        </div>

        <Notifications />
      </div>
    </div>
  </header>
</template>
