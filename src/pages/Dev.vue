<script lang="ts" setup>
import { onMounted } from 'vue'

import { getUtxos2, getTxHex } from '@/queries/proxy'
import { useAddressStore, useBtcJsStore } from '@/store'

const btcJsStore = useBtcJsStore()

async function send2() {
  const btcjs = window.bitcoin
  const secp256k1 = await import('tiny-secp256k1')
  btcjs.initEccLib(secp256k1)
  btcJsStore.set(btcjs)

  const psbtRaw =
    '70736274ff0100fdf8010200000005a9bae892e2c30c55ffbe553166d697978037b5439354cf90cd5e2536e4d90d300000000000ffffffffa9bae892e2c30c55ffbe553166d697978037b5439354cf90cd5e2536e4d90d300100000000ffffffff97d00b58505019d6841aa9cd7ca53df50098c2f7bf05df29c472befd4e456da90000000000ffffffff2144c0d5b89c7ff97a3cccb7474c2afe34e7b7f6ef02a7b08cf7326df4216d020100000000ffffffffb9789db7771e090e859596694b7b7a9c57a814211332889ef6f1d448026eab820300000000ffffffff07b00400000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca220200000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4cac02b000000000000160014f26957622882a010e696e6f3ece6c36c0896e8a8d0070000000000002251207091db2e0151dd9068a4d360364e7e8453edb5b408f21d704e66892de6f6c901580200000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca580200000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4cabb1400000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca000000000001012b580200000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca010843014171d4f1849b8f2b3d658026539b83d51136ac196557e389f75ef9d5f647f475a3a05f592534a019e07fd483828048f7e3c46e10bda2d20fc38f18ba9400a50429810001012b580200000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca0108430141ed894c0a62e9e9e68021af63a408b6d904f5e8e7073259a9c5dcfe5819793bee05f11ed9519c4e075f86ce3b3778ef4345ccd68e260c8cffef9232cf272fb955810001011f220200000000000016001446ba16238318eaae01f48b18f7870f19b4dc877901086b0247304402200d57f0398e605c72a9d63f39eeca4d2d09de0f59081dfdd6cdee33cc3ced7eb702201e96c2f8491599ddc0e66055d342d6e8a7bd020f80e367c83faea841c443e5d6832102298cd92d6050172b08c07773a607f7b04fa6ee06021e53dc88ac14f8cc0ab2e80001012bfb5100000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca01084301416419d5884fcdf9a08f0dd861c2299fa53be3812fb38eafd29e9bb36a75448875ac2714e80b7674fb6e346b3781f30c156b80110962369ac22430e164fa8fff0d810001011fd827000000000000160014f26957622882a010e696e6f3ece6c36c0896e8a801086b024730440220162dade78a55de2e421fd6657fd6bcc046c08a2adc181b8c38c22789aa05e744022001880d31e84fd631f357c2ded8c236e2effd98c16ed06e57f47a5d1dbd7aa73d812102a220b0b188cbdb080d59542590c1dea53035a7274b3b1cb97fc84f83496b8f500000000000000000'

  const psbt = btcjs.Psbt.fromHex(psbtRaw)

  console.log({ psbt })

  // add final postponed input
  // const postponer = 3000
  // const address = useAddressStore().get!
  // const closestUtxo = await getUtxos2(address).then((utxos) =>
  //   utxos.reduce((prev, curr) => {
  //     const prevDiff = Math.abs(prev.satoshis - postponer)
  //     const currDiff = Math.abs(curr.satoshis - postponer)
  //     return currDiff < prevDiff && curr.satoshis >= postponer ? curr : prev
  //   }, utxos[0])
  // )
  // console.log({ closestUtxo })
  // const preTxHex = await getTxHex(closestUtxo.txId)
  // const preTx = btcjs.Transaction.fromHex(preTxHex)

  // psbt.addInput({
  //   hash: closestUtxo.txId,
  //   index: closestUtxo.outputIndex,
  //   witnessUtxo: preTx.outs[closestUtxo.outputIndex],
  //   sighashType:
  //     btcjs.Transaction.SIGHASH_ALL | btcjs.Transaction.SIGHASH_ANYONECANPAY,
  // })
  // const psbtHex = psbt.toHex()
  // const signed = await window.unisat.signPsbt(psbtHex)
  // console.log({ signed })
  const signed = psbtRaw

  const pushRes = await window.unisat.pushPsbt(signed)
  console.log({ pushRes })
}

onMounted(async () => {
  return
  const btcjs = window.bitcoin
  const secp256k1 = await import('tiny-secp256k1')
  btcjs.initEccLib(secp256k1)
  btcJsStore.set(btcjs)

  const psbtRaw =
    '70736274ff0100fdcf010200000004a9bae892e2c30c55ffbe553166d697978037b5439354cf90cd5e2536e4d90d300000000000ffffffffa9bae892e2c30c55ffbe553166d697978037b5439354cf90cd5e2536e4d90d300100000000ffffffff97d00b58505019d6841aa9cd7ca53df50098c2f7bf05df29c472befd4e456da90000000000ffffffff2144c0d5b89c7ff97a3cccb7474c2afe34e7b7f6ef02a7b08cf7326df4216d020100000000ffffffff07b00400000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca220200000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4cac02b000000000000160014f26957622882a010e696e6f3ece6c36c0896e8a8d0070000000000002251207091db2e0151dd9068a4d360364e7e8453edb5b408f21d704e66892de6f6c901580200000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca580200000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4cabb1400000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca000000000001012b580200000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca010843014171d4f1849b8f2b3d658026539b83d51136ac196557e389f75ef9d5f647f475a3a05f592534a019e07fd483828048f7e3c46e10bda2d20fc38f18ba9400a50429810001012b580200000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca0108430141ed894c0a62e9e9e68021af63a408b6d904f5e8e7073259a9c5dcfe5819793bee05f11ed9519c4e075f86ce3b3778ef4345ccd68e260c8cffef9232cf272fb955810001011f220200000000000016001446ba16238318eaae01f48b18f7870f19b4dc877901086b0247304402200d57f0398e605c72a9d63f39eeca4d2d09de0f59081dfdd6cdee33cc3ced7eb702201e96c2f8491599ddc0e66055d342d6e8a7bd020f80e367c83faea841c443e5d6832102298cd92d6050172b08c07773a607f7b04fa6ee06021e53dc88ac14f8cc0ab2e80001012bfb5100000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca01084301416419d5884fcdf9a08f0dd861c2299fa53be3812fb38eafd29e9bb36a75448875ac2714e80b7674fb6e346b3781f30c156b80110962369ac22430e164fa8fff0d810000000000000000'

  const psbt = btcjs.Psbt.fromHex(psbtRaw)

  console.log({ psbt })

  // add final postponed input
  const postponer = 10200
  const address = useAddressStore().get!
  const closestUtxo = await getUtxos2(address).then((utxos) =>
    utxos.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev.satoshis - postponer)
      const currDiff = Math.abs(curr.satoshis - postponer)
      return currDiff < prevDiff && curr.satoshis >= postponer ? curr : prev
    }, utxos[0])
  )
  const preTxHex = await getTxHex(closestUtxo.txId)
  const preTx = btcjs.Transaction.fromHex(preTxHex)

  psbt.addInput({
    hash: closestUtxo.txId,
    index: closestUtxo.outputIndex,
    witnessUtxo: preTx.outs[closestUtxo.outputIndex],
    sighashType:
      btcjs.Transaction.SIGHASH_ALL | btcjs.Transaction.SIGHASH_ANYONECANPAY,
  })
  const psbtHex = psbt.toHex()
  const signed = await window.unisat.signPsbt(psbtHex)
  console.log({ signed })

  const pushRes = await window.unisat.pushPsbt(signed)
  console.log({ pushRes })
})
</script>

<template>Hello</template>
