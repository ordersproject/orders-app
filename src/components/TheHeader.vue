<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import logo from '@/assets/logo.svg?url'
import unisatIcon from '@/assets/unisat-icon.png?url'
import { prettyAddress } from '@/lib/helpers'
import { ElMessage } from 'element-plus'
import { useAddressStore, useDummiesStore, useNetworkStore } from '@/store'
import type { Network } from '@/store'
import { useQuery } from '@tanstack/vue-query'
import { getAddress } from '@/queries'
import utils from '@/utils'
import { HelpCircle } from 'lucide-vue-next'
import { CheckCircle2 } from 'lucide-vue-next'

const addressStore = useAddressStore()
const networkStore = useNetworkStore()
const dummiesStore = useDummiesStore()

onMounted(async () => {
  // check if unisat is available
  if (!window.unisat) {
    ElMessage.warning('Unisat not available')
  }

  // try to get current address
  // const addresses = await window.unisat.getAccounts()
  // if (addresses && addresses.length) {
  //   address.set(addresses[0])
  // }

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
  queryFn: async () => utils.checkAndSelectDummies(true, address.value),
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
      <img class="h-7" :src="logo" alt="Logo" />
    </h1>

    <div class="flex gap-2">
      <button
        class="h-10 cursor-pointer items-center divide-x divide-zinc-800 rounded-lg bg-black/90 px-4 text-sm text-zinc-300 transition hover:text-orange-300"
        v-if="addressStore.get"
        :title="`Switch to ${
          networkStore.network === 'testnet' ? 'livenet' : 'testnet'
        }`"
        @click="switchNetwork"
      >
        {{ networkStore.network }}
      </button>

      <button
        class="h-10 rounded-lg border-2 border-orange-300 px-4 transition hover:border-orange-400 hover:bg-orange-400"
        @click="connectWallet"
        v-if="!addressStore.get"
      >
        Connect Wallet
      </button>

      <div
        class="flex h-10 cursor-pointer items-center divide-x divide-zinc-800 rounded-lg bg-black/90 px-4"
        title="copy address"
        v-else
      >
        <div class="flex gap-2 pr-2" @click="copyAddress">
          <img class="h-5" :src="unisatIcon" alt="Unisat" />
          <span class="text-sm text-orange-300">
            {{ prettyAddress(addressStore.get) }}
          </span>
        </div>

        <!-- ready button -->
        <div class="pl-2" v-if="!dummiesStore.has">
          <HelpCircle
            class="h-5 text-zinc-500"
            @click="utils.checkAndSelectDummies"
          />
        </div>
        <div class="pl-2" v-else>
          <CheckCircle2 class="h-5 text-orange-300" />
        </div>
      </div>
    </div>
  </header>
</template>
