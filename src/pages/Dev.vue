<script lang="ts" setup>
import { getTxHex } from '@/lib/helpers'
import { getUtxos2 } from '@/queries'
import { useAddressStore, useBtcJsStore } from '@/store'
import { onMounted, ref } from 'vue'

const btcJsStore = useBtcJsStore()

onMounted(async () => {
  const btcjs = window.bitcoin
  const secp256k1 = await import('tiny-secp256k1')
  btcjs.initEccLib(secp256k1)
  btcJsStore.set(btcjs)

  const psbtRaw =
    '70736274ff0100fdcf0102000000045cee3273cd36c19b2e091e176783eae25bd0db39a20745525fc64768dea7a2460000000000ffffffff5cee3273cd36c19b2e091e176783eae25bd0db39a20745525fc64768dea7a2460100000000ffffffff5f9190b97402b1af80b163b5e6f62ef3f7f196026277138796259fa053f0eb480100000000ffffffff5cee3273cd36c19b2e091e176783eae25bd0db39a20745525fc64768dea7a2460200000000ffffffff07b00400000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca200300000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4cab0400000000000001600148bd33914d24ace50844f645b3f33f86637d86871d0070000000000002251207091db2e0151dd9068a4d360364e7e8453edb5b408f21d704e66892de6f6c901580200000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca580200000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4cab41300000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca000000000001012b580200000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca01084301415d849771729489df6455f59a3722b4b2a8f8901bce341677ab524809b15b23995521fd1ff49439bb2582e0f35014ec6d93caa2c933c3a75ea0741f6d569f64be810001012b580200000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca010843014197f814dc00eb14089dca10d8b4f31a0f8513a5a716bbfc31f32e1226155213de823e268e9416ea0b635150c4c2d29f574f6946ab8a91dcb82c77b2de1ed2b79d810001011f20030000000000001600140e46dec74c69182c0f6af93fa7bc98b9ed4b5dcc01086c024830450221008a51e3320200df93d876db40693f14651e195dbd1916d6109aca865e3bd001a902205ef06332ab8a2cb5ddc706718d2f592a57ffc3f8f3f448cd33cb1f3db8e83ae383210357559347b2c40e7dd0a086767d9456b4f95c6129bef1e68c44d8f491d407f26b0001012ba85900000000000022512064729335d854ed8b52c83f02d7695630167de3f0bda3d511dfe881dd4d4aa4ca01084301417c4bf41008c8888a3042601562c073778077cc4110882902a161d46784f47442eb8505a31d9de15bd1cb4be818fc2ebc587e835f8092c6130992fdee37f1c683810000000000000000'

  const psbt = btcjs.Psbt.fromHex(psbtRaw)

  console.log({ psbt })

  // add final postponed input
  const postponer = 3000
  const address = useAddressStore().get!
  const closestUtxo = await getUtxos2(address).then((utxos) =>
    utxos.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev.satoshis - postponer)
      const currDiff = Math.abs(curr.satoshis - postponer)
      return currDiff < prevDiff && curr.satoshis >= postponer ? curr : prev
    }, utxos[0])
  )
  console.log({ closestUtxo })
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
