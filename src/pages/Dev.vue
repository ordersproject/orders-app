<script lang="ts" setup>
import { onMounted } from 'vue'

import { getUtxos2, getTxHex } from '@/queries/proxy'
import { useAddressStore, useBtcJsStore } from '@/store'
import * as bip39 from 'bip39'
import BIP32Factory from 'bip32'
import { Buffer } from 'buffer'
import { ECPairFactory } from 'ecpair'
import BtcHelpers from '@/lib/btc-helpers'
import { generateP2wshPayment } from '@/lib/order-pool-builder'

const btcJsStore = useBtcJsStore()

onMounted(async () => {
  const btcjs = window.bitcoin
  const secp256k1 = await import('tiny-secp256k1')
  btcjs.initEccLib(secp256k1)
  btcJsStore.set(btcjs)
  const bip32 = BIP32Factory(secp256k1)

  // init account
  const mnemonic =
    'attend cattle blanket flower before nose scare sweet someone spider kiss boil'
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const root = bip32.fromSeed(seed)
  const child1 = root.derivePath("m/86'/0'/0'/0/5")
  const child2 = root.derivePath("m/86'/0'/0'/0/6")

  const payment = btcjs.payments.p2wsh({
    redeem: btcjs.payments.p2ms({
      m: 2,
      pubkeys: [child1.publicKey, child2.publicKey],
    }),
  })

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

const createTx = async () => {
  const btcjs = window.bitcoin
  const secp256k1 = await import('tiny-secp256k1')
  btcjs.initEccLib(secp256k1)
  btcJsStore.set(btcjs)
  const bip32 = BIP32Factory(secp256k1)

  // init account
  const mnemonic =
    'attend cattle blanket flower before nose scare sweet someone spider kiss boil'
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const root = bip32.fromSeed(seed)
  const child1 = root.derivePath("m/86'/0'/0'/0/3")
  const child2 = root.derivePath("m/86'/0'/0'/0/4")

  const ms = btcjs.payments.p2wsh({
    redeem: btcjs.payments.p2ms({
      m: 2,
      pubkeys: [child1.publicKey, child2.publicKey],
    }),
  })

  const address = useAddressStore().get!
  // Add payment input
  const paymentUtxo = await getUtxos2(address).then((result) => {
    // choose the largest utxo
    const utxo = result.reduce((prev, curr) => {
      if (prev.satoshis > curr.satoshis) {
        return prev
      } else {
        return curr
      }
    })
    return utxo
  })

  if (!paymentUtxo) {
    throw new Error('no utxo')
  }

  // query rawTx of the utxo
  const rawTx = await getTxHex(paymentUtxo.txId)
  // decode rawTx
  const tx = btcjs.Transaction.fromHex(rawTx)

  // construct input
  const paymentInput = {
    hash: paymentUtxo.txId,
    index: paymentUtxo.outputIndex,
    witnessUtxo: tx.outs[paymentUtxo.outputIndex],
    sighashType: btcjs.Transaction.SIGHASH_ALL,
  }

  const psbt = new btcjs.Psbt({ network: btcjs.networks.bitcoin })
    .addInput(paymentInput)
    .addOutput({
      address: ms.address!,
      value: 1000,
    })

  const changeValue = paymentUtxo.satoshis - 1000 - 1600
  if (changeValue > 0) {
    psbt.addOutput({
      address: address,
      value: changeValue,
    })
  }

  const signRes = await window.unisat.signPsbt(psbt.toHex())
  const pushedRes = await window.unisat.pushPsbt(signRes)
  console.log({ pushedRes })

  // f113c1abbafb49fdfa9e8226fadb86ec820091e56e52a91ffa4572896569933e
}

const unlockMs = async () => {
  const btcjs = window.bitcoin
  const secp256k1 = await import('tiny-secp256k1')
  btcjs.initEccLib(secp256k1)
  btcJsStore.set(btcjs)
  const bip32 = BIP32Factory(secp256k1)
  const ECPair = ECPairFactory(secp256k1)

  // init account
  const mnemonic = import.meta.env.VITE_TEST_MNEMONIC
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const root = bip32.fromSeed(seed)
  const child1 = root.derivePath("m/86'/0'/0'/0/3")
  const child2 = root.derivePath("m/86'/0'/0'/0/4")

  const msTxHex = await getTxHex(
    'f113c1abbafb49fdfa9e8226fadb86ec820091e56e52a91ffa4572896569933e'
  )
  const msTx = btcjs.Transaction.fromHex(msTxHex)
  console.log({ msTx })

  const msPayment = btcjs.payments.p2wsh({
    redeem: btcjs.payments.p2ms({
      m: 2,
      pubkeys: [child1.publicKey, child2.publicKey],
    }),
  })

  const msInput = {
    hash: 'f113c1abbafb49fdfa9e8226fadb86ec820091e56e52a91ffa4572896569933e',
    index: 0,
    witnessUtxo: msTx.outs[0],
    witnessScript: msPayment.redeem!.output,
  }

  // Add payment input
  const address = useAddressStore().get!
  const paymentUtxo = await getUtxos2(address).then((result) => {
    // choose the largest utxo
    const utxo = result.reduce((prev, curr) => {
      if (prev.satoshis > curr.satoshis) {
        return prev
      } else {
        return curr
      }
    })
    return utxo
  })

  if (!paymentUtxo) {
    throw new Error('no utxo')
  }
  // query rawTx of the utxo
  const rawTx = await getTxHex(paymentUtxo.txId)
  // decode rawTx
  const tx = btcjs.Transaction.fromHex(rawTx)

  const changeValue = paymentUtxo.satoshis - 800

  const signedPsbt = new btcjs.Psbt()
    .addInput(msInput)
    .addInput({
      hash: paymentUtxo.txId,
      index: paymentUtxo.outputIndex,
      witnessUtxo: tx.outs[paymentUtxo.outputIndex],
      tapInternalKey: child1.publicKey.slice(1, 33),
    })
    .addOutput({
      address: address,
      value: changeValue,
    })
    .signInput(0, child1)
    .signInput(0, child2)
    .signInput(1, BtcHelpers.tweakSigner(child1))

  // const finalized = unlockPsbt.finalizeAllInputs()
  // const signed = await window.unisat.signPsbt(signedPsbt.toHex())
  // const signedPsbt = btcjs.Psbt.fromHex(signed)
  console.log({ signedPsbt })
  const finalized = signedPsbt.finalizeAllInputs()

  console.log({ finalized })
  const pushed = await window.unisat.pushPsbt(finalized.toHex())

  console.log({ pushed })
}

const generateMsAddress = async () => {
  console.log('hi')
  await generateP2wshPayment()
}
</script>

<template>
  <button class="border p-2" @click="createTx">生成多签输出</button>
  <button class="border p-2 ml-4" @click="unlockMs">解锁多签</button>
  <button class="border p-2 ml-4" @click="generateMsAddress">
    生成多签地址
  </button>
</template>
