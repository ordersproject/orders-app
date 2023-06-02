<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import logoIcon from '@/assets/logo-icon.png?url'
import logoText from '@/assets/logo-text.svg?url'
import logo from '@/assets/logo.svg?url'
import unisatIcon from '@/assets/unisat-icon.png?url'
import { calculateFee, getTxHex, getUtxos, prettyAddress } from '@/lib/helpers'
import { ElMessage } from 'element-plus'
import {
  useAddressStore,
  useDummiesStore,
  useBtcJsStore,
  DummyUtxo,
  useNetworkStore,
} from '@/store'
import type { Network } from '@/store'
import { DUMMY_UTXO_VALUE, EXTREME_FEEB, MIN_FEEB } from '@/lib/constants'
import { Buffer } from 'buffer'

const address = useAddressStore()
const dummiesStore = useDummiesStore()
const btcjsStore = useBtcJsStore()
const networkStore = useNetworkStore()

onMounted(async () => {
  // check if unisat is available
  if (!window.unisat) {
    ElMessage.warning('Unisat not available')
  }

  // try to get current address
  const addresses = await window.unisat.getAccounts()
  console.log({ addresses })
  if (addresses && addresses.length) {
    address.set(addresses[0])

    await checkDummies()
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
    address.set(connectRes[0])

    await checkDummies()
  }
}

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
  if (!address.get) return
  navigator.clipboard.writeText(address.get)
  ElMessage.success('Address copied to clipboard')
}

const checkingDummies = ref(false)
async function checkDummies() {
  if (!address.get) return

  checkingDummies.value = true
  // find out if there are two dummy utxos for the construction of psbt
  const candidates = await getUtxos(address.get!).then((utxos) => {
    console.log({ utxos })
    // only take two dummy utxos
    return utxos
      .filter((utxo) => utxo.satoshis === DUMMY_UTXO_VALUE)
      .slice(0, 2)
  })
  if (candidates.length === 2) {
    const dummyUtxos: DummyUtxo[] = []

    // set dummy utxos
    for (const candidate of candidates) {
      const txHex = await getTxHex(candidate.txId)
      const dummy = {
        ...candidate,
        txHex,
      }
      dummyUtxos.push(dummy)
    }

    dummiesStore.set(dummyUtxos)
  } else {
    ElMessage.warning(
      'Please generate 2 dummy utxos to your address to continue'
    )
  }

  checkingDummies.value = false
}

async function createDummies() {
  if (!address.get) return

  const paymentUtxo = await getUtxos(address.get!).then((utxos) => {
    console.log({ utxos })
    // only take two dummy utxos
    return utxos.filter(
      (utxo) => utxo.satoshis >= DUMMY_UTXO_VALUE * 2 + 1000
    )[0]
  })

  if (!paymentUtxo) {
    ElMessage.warning(
      'Please generate 2 dummy utxos to your address to continue'
    )
    return
  }

  const btcjs = btcjsStore.get!
  const dummiesPsbt = new btcjs.Psbt({
    network: btcjs.networks[networkStore.btcNetwork],
  })
  dummiesPsbt.addInput({
    hash: paymentUtxo.txId,
    index: paymentUtxo.outputIndex,
    witnessUtxo: {
      script: Buffer.from(paymentUtxo.scriptPk, 'hex'),
      value: paymentUtxo.satoshis,
    },
  })

  dummiesPsbt.addOutput({ address: address.get, value: DUMMY_UTXO_VALUE })
  dummiesPsbt.addOutput({ address: address.get, value: DUMMY_UTXO_VALUE })

  const fee = calculateFee(
    MIN_FEEB, // minimum feeb
    1,
    2 // already taken care of the exchange output bytes calculation
  )
  const changeValue = paymentUtxo.satoshis - DUMMY_UTXO_VALUE * 2 - fee

  dummiesPsbt.addOutput({ address: address.get, value: changeValue })

  // push
  const signed = await window.unisat.signPsbt(dummiesPsbt.toHex())
  const pushedTxid = await window.unisat.pushPsbt(signed)

  // extract txHex
  const signedToPsbt = btcjs.Psbt.fromHex(signed, {
    network: btcjs.networks[networkStore.btcNetwork],
  })
  const txHex = signedToPsbt.extractTransaction().toHex()
  const dummies: DummyUtxo[] = [
    {
      txId: pushedTxid,
      scriptPk: paymentUtxo.scriptPk,
      satoshis: DUMMY_UTXO_VALUE,
      outputIndex: 0,
      addressType: 2,
      txHex,
    },
    {
      txId: pushedTxid,
      scriptPk: paymentUtxo.scriptPk,
      satoshis: DUMMY_UTXO_VALUE,
      outputIndex: 1,
      addressType: 2,
      txHex,
    },
  ]
  dummiesStore.set(dummies)

  ElMessage.success('Dummies created. You are ready to go!')
}
</script>

<template>
  <header class="flex items-center justify-between px-6 py-4">
    <h1 class="flex items-center gap-2">
      <!-- <img class="h-8 w-8" :src="logoIcon" alt="Logo" />
      <img class="h-5" :src="logoText" alt="Logo" /> -->
      <img class="h-7" :src="logo" alt="Logo" />
    </h1>

    <div class="flex gap-2">
      <button
        class="h-10 cursor-pointer items-center divide-x divide-zinc-800 rounded-lg bg-black/90 px-4 text-sm text-zinc-300 transition hover:text-orange-300"
        v-if="address.get"
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
        v-if="!address.get"
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
            {{ prettyAddress(address.get) }}
          </span>
        </div>

        <!-- ready button -->
        <div class="pl-2" v-if="!dummiesStore.has">
          <button
            class="rounded bg-orange-500/50 px-2 py-1 text-xs"
            @click="createDummies"
            v-if="!checkingDummies"
          >
            Get Ready
          </button>

          <span class="text-xs text-orange-300" v-else>
            Checking Dummies...
          </span>
        </div>
      </div>
    </div>
  </header>
</template>
