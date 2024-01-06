<script lang="ts" setup>
import { Ref, computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useQuery } from '@tanstack/vue-query'
import { ShieldAlertIcon, CheckCircle2 } from 'lucide-vue-next'

import { prettyAddress } from '@/lib/formatters'
import { useDummiesStore } from '@/stores/dummies'
import { useNetworkStore, type Network } from '@/stores/network'
import { Wallet, useConnectionStore } from '@/stores/connection'
import utils from '@/utils'
import whitelist from '@/lib/whitelist'

import WalletMissingModal from './WalletMissingModal.vue'
import AssetsDisplay from './AssetsDisplay.vue'
import NetworkState from './NetworkState.vue'
import Notifications from './Notifications.vue'
import TheNavbar from './TheNavbar.vue'
import unisatIcon from '@/assets/unisat-icon.png?url'
import okxIcon from '@/assets/okx-icon.png?url'

const networkStore = useNetworkStore()
const dummiesStore = useDummiesStore()

const unisatAccountsChangedHandler = (accounts: string[]) => {
  if (useConnectionStore().last.wallet !== 'unisat') return

  ElMessage.warning({
    message: 'Unisat account changed. Refreshing page...',
    type: 'warning',
    onClose: () => {
      window.location.reload()
    },
  })
}
const okxAcountsChangedHandler = (accounts: string[]) => {
  if (useConnectionStore().last.wallet !== 'okx') return

  ElMessage.warning({
    message: 'Okx account changed. Refreshing page...',
    type: 'warning',
    onClose: () => {
      window.location.reload()
    },
  })
}

onMounted(async () => {
  if (window.unisat) {
    const unisat = window.unisat
    unisat.on('accountsChanged', unisatAccountsChangedHandler)

    // getNetwork
    // const network: Network = await unisat.getNetwork()
    const network: Network = 'livenet'
    const address = connectionStore.getAddress

    // if not in whitelist, switch to mainnet
    if (network !== 'livenet' && address && !whitelist.includes(address)) {
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

  if (window.okxwallet) {
    window.okxwallet.on('accountsChanged', okxAcountsChangedHandler)
  }
})
onBeforeUnmount(() => {
  // remove event listener
  window.unisat?.removeListener('accountsChanged', unisatAccountsChangedHandler)
  window.okxwallet?.removeListener('accountsChanged', okxAcountsChangedHandler)
})

// connect / address related
const connectionStore = useConnectionStore()
const { data: address } = useQuery({
  queryKey: ['address', { network: networkStore.network }],
  queryFn: async () =>
    connectionStore.sync().then((connection) => connection?.address),
  retry: 0,
  enabled: computed(() => connectionStore.connected),
})

const connectionsModalOpen = ref(false)
function popConnectionsModal() {
  connectionsModalOpen.value = true
}

const enabled = computed(() => !!address.value)
useQuery({
  queryKey: [
    'dummies',
    { network: networkStore.network, address: address.value },
  ],
  queryFn: async () =>
    utils.checkAndSelectDummies({
      checkOnly: true,
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

const walletIcon = computed(() => {
  const connection = connectionStore.last

  if (!connection) return null

  return connection.wallet === 'unisat' ? unisatIcon : okxIcon
})

function copyAddress() {
  // copy address value to clipboard
  const address = connectionStore.getAddress
  if (!address) return
  navigator.clipboard.writeText(address)
  ElMessage.success('Address copied to clipboard')
}

const walletMissingModalOpen = ref(false)
const missingWallet: Ref<Wallet> = ref('unisat')
function onWalletMissing(wallet: Wallet) {
  missingWallet.value = wallet
  walletMissingModalOpen.value = true
}
</script>

<template>
  <ConnectionsModal
    v-model:open="connectionsModalOpen"
    @wallet-missing="onWalletMissing"
  />
  <WalletMissingModal
    v-model:open="walletMissingModalOpen"
    :missing-wallet="missingWallet"
  />

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
        @click="popConnectionsModal"
        v-if="!connectionStore.connected"
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
            <img class="h-5" :src="walletIcon" alt="Unisat" v-if="walletIcon" />
            <span class="text-sm text-orange-300">
              {{ address ? prettyAddress(address, 4) : '-' }}
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
