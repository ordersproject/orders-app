<script lang="ts" setup>
import { Ref, computed, onMounted, ref, watch } from 'vue'
import OrderList from './OrderList.vue'
import ordiBtcLogo from '@/assets/ordi-btc.svg?url'
import {
  useAddressStore,
  useBtcJsStore,
  useDummiesStore,
  useNetworkStore,
} from '@/store'
import {
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  RadioGroup,
  RadioGroupLabel,
  RadioGroupOption,
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@headlessui/vue'
import {
  CheckIcon,
  ChevronUpDownIcon,
  ArrowPathIcon,
} from '@heroicons/vue/20/solid'
import btcIcon from '@/assets/btc.svg?url'
import ordiIcon from '@/assets/ordi.svg?url'
import {
  SimpleUtxo,
  calculateFee,
  getTxHex,
  getUtxos,
  prettyBalance,
} from '@/lib/helpers'
import { DUMMY_UTXO_VALUE, ORD_UTXO_VALUE } from '@/lib/constants'
import { ElMessage } from 'element-plus'

const unisat = window.unisat

export type PsbtWrapper = {
  id: string
  psbtRaw: string
  createdAt: number
  address: string
  coinAmount: number
  coinRatePrice: string
  amount: number
}
const btcJsStore = useBtcJsStore()
const addressStore = useAddressStore()
const dummiesStore = useDummiesStore()
const networkStore = useNetworkStore()

const endpoint = `https://api.ordbook.io/book/brc20/orders?orderState=1&net=${networkStore.ordersNetwork}`
const btcjs = window.bitcoin

const sellPsbtWrappers: Ref<PsbtWrapper[]> = ref([])
fetch(endpoint).then(async (res) => {
  const jsoned = await res.json()
  if (jsoned.data && jsoned.data.results) {
    sellPsbtWrappers.value = jsoned.data.results.filter((item: any) => !!item)
  }
})

const balance = ref(0)
async function updateBalance() {
  if (!unisat) return

  const balanceRes = await unisat.getBalance()
  if (balanceRes && balanceRes.total) {
    balance.value = balanceRes.total
  }
}
onMounted(async () => {
  const btcjs = window.bitcoin
  console.log({ btcjs })
  const secp256k1 = await import('tiny-secp256k1')
  btcjs.initEccLib(secp256k1)
  btcJsStore.set(btcjs)

  // update balance
  await updateBalance()
})

const selectedOrders: Ref<PsbtWrapper[]> = ref([])
const candidateOrders = computed(() => {
  if (usePrice.value === 0) return []

  return sellPsbtWrappers.value
    .filter((item) => {
      return Number(item.coinRatePrice) / 1e8 === usePrice.value
    })
    .slice(0, 1)
})

const selectedCoinAmount = computed(() => {
  return selectedOrders.value.reduce((acc, cur) => {
    return acc + Number(cur.coinAmount)
  }, 0)
})

const feebPlanList = [
  {
    feeb: 11,
    speed: 'Slow',
    label: 'extreme',
    estimate: 'About 1h',
  },
  {
    feeb: 33,
    speed: 'Avg',
    label: 'medium',
    estimate: 'About 30min',
  },
  {
    feeb: 46,
    speed: 'Fast',
    label: 'fast',
    estimate: 'About 10min',
  },
]
const selectedFeebPlan = ref(feebPlanList[0])

const fees = computed(() => {
  if (!selectedCoinAmount.value) return 0

  const ordersCount = selectedOrders.value.length

  return calculateFee(selectedFeebPlan.value.feeb, 4, 6) * ordersCount
})

const prettyFees = computed(() => {
  if (!fees.value) return '0'

  const feeInBtc = fees.value / 1e8

  return `≈${feeInBtc.toFixed(8)} BTC`
})

function handleChangeUsePrice(price: number) {
  usePrice.value = price
}

const usePrice = ref(0)
// watch use price change, update selected orders
watch(usePrice, (price) => {
  console.log({ price })
  if (price === 0) {
    selectedOrders.value = []
  } else {
    selectedOrders.value = sellPsbtWrappers.value.filter((item) => {
      return Number(item.coinRatePrice) / 1e8 <= price
    })
  }
})

// buy
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
  const order = selectedOrders.value[0]

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
  const ordValue = sellPsbt.data.inputs[0].witnessUtxo!.value
  const ordOutput = {
    address,
    value: ordValue,
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
    selectedFeebPlan.value.feeb,
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

    // notify update psbt status
    const updateEndpoint = `https://api.ordbook.io/book/brc20/order/update`
    const updateRes = await fetch(updateEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        net: networkStore.ordersNetwork,
        orderId: order.id,
        orderState: 2,
        psbtRaw: signed,
      }),
    })
  }
}

// confirm modal
const isOpen = ref(false)
function setIsOpen(value: boolean) {
  isOpen.value = value
}
</script>

<template>
  <div class="rounded-xl border border-zinc-300">
    <!-- header -->
    <div
      class="flex items-center justify-center gap-2 border-b border-zinc-300 py-3"
    >
      <img :src="ordiBtcLogo" class="h-8" />
      <span class="font-bold">ORDI-BTC</span>
    </div>

    <!-- table -->
    <div class="flex items-start gap-x-8 p-8">
      <OrderList
        :sellPsbtWrappers="sellPsbtWrappers"
        class="flex-1"
        @use-price="(price) => handleChangeUsePrice(price)"
      />

      <!-- operate panel -->
      <div class="flex-1">
        <!-- tabs -->
        <TabGroup>
          <TabList class="flex items-center justify-center gap-4">
            <Tab class="w-28 rounded bg-green-600 py-2">Buy</Tab>
            <Tab disabled class="w-28 rounded bg-zinc-800 py-2 text-zinc-600"
              >Sell</Tab
            >
          </TabList>
          <TabPanels class="mt-8">
            <TabPanel class="">
              <div
                class="flex items-center justify-between rounded-md border border-zinc-500 p-2"
              >
                <div class="flex items-center">
                  <img :src="btcIcon" alt="btc icon" class="h-6 w-6" />
                  <span class="ml-2 text-zinc-500">Price</span>
                </div>

                <div class="relative max-w-[67%] grow">
                  <input
                    type="text"
                    class="w-full rounded bg-zinc-700 py-2 pl-2 pr-12 text-right placeholder-zinc-500 outline-none"
                    placeholder="BTC"
                    v-model.number="usePrice"
                  />
                  <span
                    class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"
                  >
                    BTC
                  </span>
                </div>
              </div>

              <!-- estimate -->
              <!-- <div class="mt-2 text-right text-sm">≈$12.99</div> -->

              <!-- amount -->
              <div
                class="mt-4 flex items-center justify-between rounded-md border border-zinc-500 p-2"
              >
                <div class="flex items-center">
                  <img :src="ordiIcon" alt="btc icon" class="h-6 w-6" />
                  <span class="ml-2 text-zinc-500">Amount</span>
                </div>

                <Listbox
                  v-model="selectedOrders"
                  multiple
                  as="div"
                  class="relative max-w-[67%] grow"
                >
                  <ListboxButton
                    class="relative w-full cursor-default rounded bg-zinc-700 py-2 pl-3 pr-20 text-right text-sm focus:outline-none"
                  >
                    <span class="block truncate">
                      {{ selectedCoinAmount }}
                    </span>

                    <span
                      class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"
                    >
                      <span>ORDI</span>
                      <ChevronUpDownIcon class="h-5 w-5" aria-hidden="true" />
                    </span>
                  </ListboxButton>

                  <ListboxOptions
                    class="absolute z-10 mt-4 max-h-60 w-full translate-x-2 overflow-auto rounded-md border border-zinc-500 bg-zinc-900 p-2 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                  >
                    <ListboxOption
                      v-for="psbt in candidateOrders"
                      v-slot="{ active, selected }"
                      as="template"
                      :key="psbt.id"
                      :value="psbt"
                    >
                      <li
                        class="relative flex cursor-pointer items-center justify-between rounded py-2 pl-10 pr-2 transition"
                        :class="active && 'bg-orange-500/20'"
                      >
                        <span
                          v-if="selected"
                          class="absolute inset-y-0 left-0 flex items-center pl-3 text-orange-300"
                        >
                          <CheckIcon class="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span class="text-sm text-zinc-500">
                          {{ Number(psbt.coinRatePrice) / 1e8 }}
                        </span>
                        <span :class="selected && 'text-orange-300'">
                          {{ psbt.coinAmount }}
                        </span>
                      </li>
                    </ListboxOption>
                  </ListboxOptions>
                </Listbox>
              </div>

              <!-- buy -->
              <div class="mt-12">
                <!-- feeb select -->
                <RadioGroup v-model="selectedFeebPlan">
                  <RadioGroupLabel class="text-xs text-zinc-500">
                    Select Fee Rate
                  </RadioGroupLabel>
                  <div class="mt-2 flex justify-center gap-4">
                    <RadioGroupOption
                      as="template"
                      v-slot="{ checked, active }"
                      :key="feebPlan.feeb"
                      :value="feebPlan"
                      v-for="feebPlan in feebPlanList"
                    >
                      <div
                        :class="[
                          active
                            ? 'ring-2 ring-white ring-opacity-60 ring-offset-2 ring-offset-orange-300'
                            : '',
                          checked
                            ? 'bg-orange-300/80 text-white'
                            : 'bg-zinc-800 ',
                        ]"
                        class="relative flex-1 cursor-pointer rounded-lg px-5 py-4 text-center text-xs shadow-md focus:outline-none"
                      >
                        <div class="">
                          <RadioGroupLabel
                            as="p"
                            :class="
                              checked ? 'text-orange-100' : 'text-zinc-300'
                            "
                            class="mb-2 text-center text-sm font-bold"
                          >
                            {{ feebPlan.speed }}
                          </RadioGroupLabel>

                          <RadioGroupDescription
                            as="div"
                            :class="
                              checked ? 'text-orange-100' : 'text-zinc-500'
                            "
                          >
                            <div>{{ `${feebPlan.feeb} sat/vB` }}</div>
                            <div class="mt-1">{{ feebPlan.estimate }}</div>
                          </RadioGroupDescription>
                        </div>
                      </div>
                    </RadioGroupOption>
                  </div>
                </RadioGroup>

                <div class="mt-4 flex items-center justify-between text-sm">
                  <span class="text-zinc-500">Fees</span>
                  <span class="text-zinc-300">{{ prettyFees }}</span>
                </div>

                <button
                  class="mt-4 w-full rounded-md py-4 font-bold"
                  :class="
                    selectedOrders.length
                      ? 'bg-green-500 text-white'
                      : 'bg-zinc-700 text-zinc-500'
                  "
                  @click="setIsOpen(true)"
                  :disabled="!selectedOrders.length"
                >
                  Buy ORDI
                </button>

                <div
                  class="mt-4 flex items-center justify-center gap-x-2 text-center text-sm"
                >
                  <span class="text-zinc-500">Available</span>
                  <span class="text-zinc-300">
                    {{ `${prettyBalance(balance)} BTC` }}
                  </span>
                  <button @click="updateBalance">
                    <ArrowPathIcon
                      class="h-4 w-4 text-zinc-300"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </TabPanel>

            <TabPanel>sell panel</TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </div>

    <!-- modal -->
    <Dialog :open="isOpen" @close="setIsOpen(false)">
      <div class="fixed inset-0 bg-black/50 backdrop-blur"></div>

      <div class="fixed inset-0 overflow-y-auto text-zinc-300">
        <div
          class="flex min-h-full items-center justify-center p-4 text-center"
        >
          <DialogPanel
            class="w-full max-w-md transform overflow-hidden rounded-2xl bg-zinc-800 p-6 align-middle shadow-lg shadow-orange-200/10 transition-all"
          >
            <DialogTitle class="text-lg">Confirmation</DialogTitle>

            <DialogDescription as="div" class="mt-4">
              <p class="text-sm text-zinc-500">
                Please confirm the transactions.
              </p>
            </DialogDescription>

            <div class="mt-8 flex items-center justify-center gap-4">
              <button
                @click="setIsOpen(false)"
                class="w-24 rounded border border-zinc-700 py-2 text-zinc-500"
              >
                Cancel
              </button>
              <button
                @click="buy"
                class="w-24 rounded border border-zinc-500 py-2"
              >
                Confirm
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  </div>
</template>
