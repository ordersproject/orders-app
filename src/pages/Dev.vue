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

const debugTx = async () => {
  const psbtHex =
    '70736274ff0100fdf8010200000005bcd594fbf4bf17f7c9163fcdff47e3e898afd0c418cecd890885829c3de8bb840400000000ffffffffbcd594fbf4bf17f7c9163fcdff47e3e898afd0c418cecd890885829c3de8bb840500000000ffffffffcb0ac1baef3832716b1ae45e7b9f460285a60f52179f158b8975baf61c9b8a820000000000ffffffffee1915c3cf75f3759521aecfc73c92fc91751094fa507984ce2f4db627e14efc0000000000ffffffff15eb4cdba5b6a7e77cd90921af61aa632d2cd4d714cedfcfc9fd1229fcdb52930300000000ffffffff07b0040000000000002251201578fe8a54b0015cfa17117da49bb5bda0a6fcc85320d67e80d79f3070b3f79b22020000000000002251201578fe8a54b0015cfa17117da49bb5bda0a6fcc85320d67e80d79f3070b3f79ba00f000000000000220020dcb178067422003159cc87190495ebc3643f181b63dbee9d5bab935bc5dd7b1cd0070000000000001600147007164318558a6f0effa7da884dba25af1a769d58020000000000002251201578fe8a54b0015cfa17117da49bb5bda0a6fcc85320d67e80d79f3070b3f79b58020000000000002251201578fe8a54b0015cfa17117da49bb5bda0a6fcc85320d67e80d79f3070b3f79b40080100000000002251201578fe8a54b0015cfa17117da49bb5bda0a6fcc85320d67e80d79f3070b3f79b000000000001012b58020000000000002251201578fe8a54b0015cfa17117da49bb5bda0a6fcc85320d67e80d79f3070b3f79b01084301414c41b24d53cf950092cadb16b25cda1547bc178f3d32ff00b6842a19c2f039361ba8af3038b25ebae51de52b5d74da7819d3371caa342c607b336c21c1bf2f86810001012b58020000000000002251201578fe8a54b0015cfa17117da49bb5bda0a6fcc85320d67e80d79f3070b3f79b01084301412063ed2ea8039ce35e8339d4a5ee1d1ea6e29bfb4cb97a50f4e31f570a5ae1ac4811ae6943dce47e93e7a16ede8037d841243e1c6d707a634c371fd2a8cef432810001012b22020000000000002251205a52b80cecb3385052645deddef2d062ce6b971fbf07f5cc036b60e762c4baff0108430141e11f28b2f8ff59ed8847b0b0e26b0e51c26777b6f52bbe13583255a278854a5f8d6e2a51ff0dfa90fb397ddff919cbd73211b5ea84161bd3acca9f1d954c902d830001012b80380100000000002251201578fe8a54b0015cfa17117da49bb5bda0a6fcc85320d67e80d79f3070b3f79b0108420140408bc56beda015435f4076c018ea4f950941118b7bc0c27533cbfd51c8ddc5879f7c47fe09dceda7bc98d78a578412ac314d71a2feb47b3f0030f500d11f010d0001011fd00700000000000016001482533c393d63fd1db3508b65f05b3da6cf80b6aa01086c02483045022100f3b39549d62f7d0df33ddcc3758871c81df4379eb72c56a1c8d5a7ad28df02ea022039d6c5af8393a37263c4bd2397d6d4bffb602c99e9b838d2e483987939234ae381210210340dd2347d8027ed9c46f7d502c4d5075b63498fb1f19722ff91ebc95573920000000000000000'
  await window.unisat.signPsbt(psbtHex)
}
</script>

<template>
  <button class="border p-2" @click="createTx">生成多签输出</button>
  <button class="border p-2 ml-4" @click="unlockMs">解锁多签</button>
  <button class="border p-2 ml-4" @click="generateMsAddress">
    生成多签地址
  </button>
  <button class="border p-2 ml-4" @click="debugTx">Debug Tx</button>
</template>
