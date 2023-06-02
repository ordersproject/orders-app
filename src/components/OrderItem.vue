<script lang="ts" setup>
import { computed } from 'vue'
import type { PsbtWrapper } from './OrderPanel.vue'
import {
  useBtcJsStore,
  useAddressStore,
  useDummiesStore,
  useNetworkStore,
} from '@/store'
import { calculateFee, getTxHex, getUtxos } from '@/lib/helpers'
import { ElMessage } from 'element-plus'
import { DUMMY_UTXO_VALUE, ORD_UTXO_VALUE, EXTREME_FEEB } from '@/lib/constants'
import { Buffer } from 'buffer'

export type SimpleUtxo = {
  txId: string
  scriptPk: string
  satoshis: number
  outputIndex: number
  addressType: any
}

const props = defineProps<{
  order: PsbtWrapper
}>()
const unisat = window.unisat

const prettyPrice = computed(() => {
  // 将字符串化为带小数点的数字
  return Number(props.order.coinRatePrice) / 1e8
})

const prettyTotalAmount = computed(() => {
  // 将字符串化为带小数点的数字
  return Number(props.order.amount) / 1e8
})

const btcJsStore = useBtcJsStore()
const addressStore = useAddressStore()
const dummiesStore = useDummiesStore()
const networkStore = useNetworkStore()

async function buy() {
  if (!btcJsStore.get) {
    return
  }

  if (!addressStore.get) {
    ElMessage.error('Please connect to wallet first')
    return
  }
  if (!dummiesStore.has) {
    ElMessage.error('Please generate 2 dummy utxos to your address to continue')
    return
  }

  const address = addressStore.get
  const btcjs = btcJsStore.get
  const order = props.order

  const sellPsbt = btcjs.Psbt.fromHex(order.psbtRaw, {
    network: btcjs.networks[networkStore.btcNetwork],
  })

  console.log({ sellPsbt })

  const buyPsbt = new btcjs.Psbt({
    network: btcjs.networks[networkStore.btcNetwork],
  })
  let totalInput = 0

  // Step 1: add 2 dummy inputs
  const dummyUtxos = dummiesStore.get!
  for (const dummyUtxo of dummyUtxos) {
    const dummyTx = btcjs.Transaction.fromHex(dummyUtxo.txHex)
    console.log({ outs: dummyTx.outs })
    const dummyInput = {
      hash: dummyUtxo.txId,
      index: dummyUtxo.outputIndex,
      witnessUtxo: dummyTx.outs[dummyUtxo.outputIndex],
      sighashType: btcjs.Transaction.SIGHASH_ALL,
    }
    buyPsbt.addInput(dummyInput)
    totalInput += dummyUtxo.satoshis
  }

  // Step 2: add placeholder 0-indexed output
  buyPsbt.addOutput({
    address,
    value: DUMMY_UTXO_VALUE * 2,
  })

  // Step 3: add ordinal output
  const ordOutput = {
    address,
    value: ORD_UTXO_VALUE,
  }
  buyPsbt.addOutput(ordOutput)

  // Step 4: sellerInput, in
  const sellerInput = {
    hash: sellPsbt.txInputs[0].hash,
    index: sellPsbt.txInputs[0].index,
    witnessUtxo: sellPsbt.data.inputs[0].witnessUtxo,
    finalScriptWitness: sellPsbt.data.inputs[0].finalScriptWitness,
  }
  // sellerInput.tapInternalKey = toXOnly(
  //   sellTx
  //     .toBuffer()
  //     .constructor(
  //       '020fe598fac756a0558a1d3571b3c9fc53a54b958bda38cfbbc018dfa4a2e46aeb',
  //       'hex'
  //     )
  // )

  buyPsbt.addInput(sellerInput)
  totalInput += sellerInput.witnessUtxo!.value

  // Step 5: sellerOutput, in
  const sellerOutput = sellPsbt.txOutputs[0]
  buyPsbt.addOutput(sellerOutput)

  // TODO: Step 6: publisher fee

  // Step 7: add 2 dummies output for future use
  buyPsbt.addOutput({
    address,
    value: DUMMY_UTXO_VALUE,
  })
  buyPsbt.addOutput({
    address,
    value: DUMMY_UTXO_VALUE,
  })
  const newDummiesIndex = [
    buyPsbt.txOutputs.length - 2,
    buyPsbt.txOutputs.length - 1,
  ]

  // Step 8: add payment input
  const paymentUtxo = await getUtxos(address).then((result: SimpleUtxo[]) => {
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

  buyPsbt.addInput(paymentInput)
  totalInput += paymentInput.witnessUtxo.value

  // Step 9: add change output
  const fee = calculateFee(
    EXTREME_FEEB, // minimum feeb
    buyPsbt.txInputs.length,
    buyPsbt.txOutputs.length // already taken care of the exchange output bytes calculation
  )

  const totalOutput = buyPsbt.txOutputs.reduce(
    (partialSum, a) => partialSum + a.value,
    0
  )
  const changeValue = totalInput - totalOutput - fee

  console.log({ changeValue, totalInput, totalOutput, fee })

  buyPsbt.addOutput({
    address,
    value: changeValue,
  })

  // sign
  const signed = await unisat.signPsbt(buyPsbt.toHex())
  console.log({ signed })

  // push
  const pushTxId = await unisat.pushPsbt(signed)
  console.log({ pushTxId })

  // if pushed successfully, update the Dummies
  if (pushTxId) {
    const signedToPsbt = btcjs.Psbt.fromHex(signed, {
      network: btcjs.networks[networkStore.btcNetwork],
    })
    const txHex = signedToPsbt.extractTransaction().toHex()
    const newDummies = [
      {
        txId: pushTxId,
        scriptPk: paymentUtxo.scriptPk,
        satoshis: DUMMY_UTXO_VALUE,
        outputIndex: newDummiesIndex[0],
        addressType: 2,
        txHex,
      },
      {
        txId: pushTxId,
        scriptPk: paymentUtxo.scriptPk,
        satoshis: DUMMY_UTXO_VALUE,
        outputIndex: newDummiesIndex[1],
        addressType: 2,
        txHex,
      },
    ]

    dummiesStore.set(newDummies)
  }
}
</script>

<template>
  <tr class="cursor-pointer">
    <td class="td text-red-500">{{ prettyPrice }}</td>
    <td class="td">{{ order.coinAmount }}</td>
    <td class="td">{{ prettyTotalAmount }}</td>
    <!-- <td class="td">
      <button class="rounded-md bg-green-500 px-4 py-1 text-white" @click="buy">
        buy
      </button>
    </td> -->
  </tr>
</template>

<style scoped>
.td {
  @apply py-1 text-left font-normal;
}
</style>
