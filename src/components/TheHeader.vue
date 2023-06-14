<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import logo from '@/assets/logo-new.png?url'
import unisatIcon from '@/assets/unisat-icon.png?url'
import { prettyAddress } from '@/lib/helpers'
import { ElMessage } from 'element-plus'
import { useAddressStore, useDummiesStore, useNetworkStore } from '@/store'
import type { Network } from '@/store'
import { useQuery } from '@tanstack/vue-query'
import { getAddress } from '@/queries'
import utils from '@/utils'
import { ShieldAlertIcon, CheckCircle2 } from 'lucide-vue-next'

const addressStore = useAddressStore()
const networkStore = useNetworkStore()
const dummiesStore = useDummiesStore()

onMounted(async () => {
  // check if unisat is available
  if (!window.unisat) {
    ElMessage.warning('Unisat not available')
  }

  // getNetwork
  const network: Network = await window.unisat.getNetwork()
  networkStore.set(network)
})

// connect / address related
async function connectWallet() {
  if (!window.unisat) {
    ElMessage.warning('Unisat not available')
    return
  }
  const connectRes = await window.unisat.requestAccounts()
  if (connectRes && connectRes.length) {
    // if it's a legacy address(1... or m..., n...), throw error
    if (
      connectRes[0].startsWith('1') ||
      connectRes[0].startsWith('m') ||
      connectRes[0].startsWith('n')
    ) {
      ElMessage.error('Please use a SegWit address')
      return
    }

    addressStore.set(connectRes[0])
  }
}

const { data: address } = useQuery({
  queryKey: ['address', { network: networkStore.network }],
  queryFn: async () => getAddress(),
  retry: 0,
})
const enabled = computed(() => !!address.value)
useQuery({
  queryKey: ['dummies', { network: networkStore.network }],
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
    ElMessage.warning('Unisat not available')
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
</script>

<template>
  <header class="flex items-center justify-between px-6 py-4">
    <h1 class="flex items-center gap-2">
      <img class="h-9" :src="logo" alt="Logo" />
    </h1>

    <div class="flex gap-2">
      <el-tooltip
        effect="light"
        placement="bottom"
        :content="`Click to switch to ${
          networkStore.network === 'testnet' ? 'livenet' : 'testnet'
        } `"
        v-if="addressStore.get"
      >
        <button
          class="h-10 cursor-pointer items-center divide-x divide-zinc-800 rounded-lg bg-black/90 px-4 text-sm text-zinc-300 transition hover:text-orange-300"
          @click="switchNetwork"
        >
          {{ networkStore.network }}
        </button>
      </el-tooltip>

      <button
        class="h-10 rounded-lg border-2 border-orange-300 px-4 transition hover:border-orange-400 hover:bg-orange-400"
        @click="connectWallet"
        v-if="!addressStore.get"
      >
        Connect Wallet
      </button>

      <div
        class="flex h-10 cursor-pointer items-center divide-x divide-zinc-800 rounded-lg bg-black/90 px-4"
        v-else
      >
        <div class="flex gap-2 pr-2" @click="copyAddress" title="copy address">
          <img class="h-5" :src="unisatIcon" alt="Unisat" />
          <span class="text-sm text-orange-300">
            {{ prettyAddress(addressStore.get) }}
          </span>
        </div>

        <!-- ready button -->
        <div class="pl-2" v-if="!dummiesStore.has">
          <el-tooltip effect="light" placement="bottom-end">
            <template #content>
              <h3 class="my-2 text-sm font-bold text-orange-300">
                Create 2 dummies UTXOs to begin
              </h3>
              <div
                class="mb-2 max-w-sm space-y-2 text-sm leading-relaxed text-zinc-300"
              >
                <p>
                  When using Orders.Exchange for the first time, it's necessary
                  to prepare two UTXOs of 600 satoshis as a prerequisite for the
                  transaction.
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
        <div class="pl-2" v-else>
          <CheckCircle2 class="h-5 text-orange-300" />
        </div>
      </div>
    </div>
  </header>
</template>
