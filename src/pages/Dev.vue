<script lang="ts" setup>
import { onMounted } from 'vue'

// import { getUtxos, getTxHex } from '@/queries/proxy'
import { useBtcJsStore } from '@/store'
// import * as bip39 from 'bip39'
import BIP32Factory from 'bip32'

const btcJsStore = useBtcJsStore()

onMounted(async () => {
  // gotta trigger deploy again
  const btcjs = window.bitcoin
  const secp256k1 = await import('tiny-secp256k1')
  btcjs.initEccLib(secp256k1)
  btcJsStore.set(btcjs)
  const bip32 = BIP32Factory(secp256k1)
  // init account
  const mnemonic = import.meta.env.VITE_TEST_MNEMONIC
  // const seed = bip39.mnemonicToSeedSync(mnemonic)
  // const root = bip32.fromSeed(seed)
  // const child1 = root.derivePath("m/86'/0'/0'/0/5")
  // const child2 = root.derivePath("m/86'/0'/0'/0/6")
  // const payment = btcjs.payments.p2wsh({
  //   redeem: btcjs.payments.p2ms({
  //     m: 2,
  //     pubkeys: [child1.publicKey, child2.publicKey],
  //   }),
  // })
  // const wshInput = {
  //   hash: payment.redeem.output,
  //   index: 0,
  //   witnessUtxo: {
  //     script: payment.output,
  //     value: 100000,
  //   },
  //   witnessScript: payment.redeem!.output,
  // }
  // const psbt = new btcjs.Psbt().addInput()
})

const createTx = async () => {}

const unlockMs = async () => {}

const generateMsAddress = async () => {
  console.log('hi')
  // await generateP2wshPayment()
}
</script>

<template>
  <button class="border p-2" @click="createTx">生成多签输出</button>
  <button class="border p-2 ml-4" @click="unlockMs">解锁多签</button>
  <button class="border p-2 ml-4" @click="generateMsAddress">
    生成多签地址
  </button>
</template>
