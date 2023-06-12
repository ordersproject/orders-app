<script lang="ts" setup>
import { Ref, computed, onMounted, ref, watch } from 'vue'
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
  XMarkIcon,
} from '@heroicons/vue/20/solid'
import { Loader } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { useQuery } from '@tanstack/vue-query'

import btcIcon from '@/assets/btc.svg?url'
import ordiIcon from '@/assets/ordi.svg?url'
import ordiBtcLogo from '@/assets/ordi-btc.svg?url'
import { calculateFee, getTxHex, prettyBalance, sleep } from '@/lib/helpers'
import {
  DUMMY_UTXO_VALUE,
  SERVICE_LIVENET_ADDRESS,
  SERVICE_TESTNET_ADDRESS,
} from '@/lib/constants'
import {
  buildAskLimit,
  buildBidLimit,
  buildSellTake,
} from '@/lib/order-builder'
import {
  getOrdiBalance,
  getBidCandidates,
  BidCandidate,
  pushBidOrder,
  pushAskOrder,
  pushBuyTake,
  pushSellTake,
  getUtxos2,
  getFeebPlans,
  getOrders,
  Order,
  FeebPlan,
} from '@/queries'
import OrderList from './OrderList.vue'
import {
  useAddressStore,
  useBtcJsStore,
  useDummiesStore,
  useNetworkStore,
} from '@/store'
import { buildBuyTake } from '@/lib/order-builder'

const unisat = window.unisat

const btcJsStore = useBtcJsStore()
const addressStore = useAddressStore()
const dummiesStore = useDummiesStore()
const networkStore = useNetworkStore()

const { data: askOrders } = useQuery({
  queryKey: ['askOrders', { network: networkStore.network }],
  queryFn: () =>
    getOrders({ type: 'ask', network: networkStore.network, sort: 'asc' }),
  placeholderData: [],
})
const { data: bidOrders } = useQuery({
  queryKey: ['bidOrders', { network: networkStore.network }],
  queryFn: () =>
    getOrders({ type: 'bid', network: networkStore.network, sort: 'desc' }),
  placeholderData: [],
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
  const secp256k1 = await import('tiny-secp256k1')
  btcjs.initEccLib(secp256k1)
  btcJsStore.set(btcjs)

  // update balance
  await updateBalance()
})

const takeModeTab = ref(0)
function changeTakeModeTab(index: number) {
  takeModeTab.value = index
}

const selectedBuyOrders: Ref<Order[]> = ref([])
const selectedSellOrders: Ref<Order[]> = ref([])

const candidateBuyOrders = computed(() => {
  if (useBuyPrice.value === 0) return []
  if (!askOrders.value) return []

  return askOrders.value
    .filter((item) => {
      return Number(item.coinRatePrice) / 1e8 === useBuyPrice.value
    })
    .slice(0, 1)
})
const candidateSellOrders = computed(() => {
  if (useSellPrice.value === 0) return []
  if (!bidOrders.value) return []

  return bidOrders.value
    .filter((item) => {
      return Number(item.coinRatePrice) / 1e8 === useSellPrice.value
    })
    .slice(0, 1)
})

const selectedBuyCoinAmount = computed(() => {
  return selectedBuyOrders.value.reduce((acc, cur) => {
    return acc + Number(cur.coinAmount)
  }, 0)
})
const selectedSellCoinAmount = computed(() => {
  return selectedSellOrders.value.reduce((acc, cur) => {
    return acc + Number(cur.coinAmount)
  }, 0)
})

const { data: feebPlans } = useQuery({
  queryKey: ['feebPlans', { network: networkStore.network }],
  queryFn: () => getFeebPlans({ network: networkStore.network }),
})
const selectedFeebPlan: Ref<FeebPlan | undefined> = ref()
watch(feebPlans, (plans) => {
  if (!plans) return

  selectedFeebPlan.value = plans[0]
})

const buyFees = computed(() => {
  if (!selectedBuyCoinAmount.value) return 0
  if (!selectedFeebPlan.value) return 0

  const ordersCount = selectedBuyOrders.value.length

  return calculateFee(selectedFeebPlan.value.feeRate, 4, 6) * ordersCount
})
const sellFees = computed(() => {
  if (!selectedSellCoinAmount.value) return 0
  if (!selectedFeebPlan.value) return 0

  const ordersCount = selectedSellOrders.value.length

  return calculateFee(selectedFeebPlan.value.feeRate, 4, 6) * ordersCount // TODO
})

const prettyBuyFees = computed(() => {
  if (!buyFees.value) return '0'

  const feeInBtc = buyFees.value / 1e8

  return `≈${feeInBtc.toFixed(8)} BTC`
})
const prettySellFees = computed(() => {
  if (!sellFees.value) return '0'

  const feeInBtc = sellFees.value / 1e8

  return `≈${feeInBtc.toFixed(8)} BTC`
})

const useBuyPrice = ref(0)
const useSellPrice = ref(0)

function setUseBuyPrice(price: number) {
  takeModeTab.value = 0
  useBuyPrice.value = price
}
function setUseSellPrice(price: number) {
  takeModeTab.value = 1
  useSellPrice.value = price
}

// watch use price change, update selected orders
watch(useBuyPrice, (price) => {
  if (price === 0 || !askOrders.value) {
    selectedBuyOrders.value = []
  } else {
    selectedBuyOrders.value = candidateBuyOrders.value.filter((item) => {
      return Number(item.coinRatePrice) / 1e8 === price
    })
  }
})
watch(useSellPrice, (price) => {
  if (price === 0 || !bidOrders.value) {
    selectedSellOrders.value = []
  } else {
    selectedSellOrders.value = candidateSellOrders.value.filter((item) => {
      return Number(item.coinRatePrice) / 1e8 === price
    })
  }
})

async function buildOrder() {
  setIsOpen(true)
  isBuilding.value = true
  let buildRes: any

  if (isLimitExchangeMode.value) {
    if (limitExchangeType.value === 'bid') {
      if (!selectedBidCandidate.value) return

      buildRes = await buildBidLimit({
        total: Math.round(
          bidExchangePrice.value *
            Number(selectedBidCandidate.value.coinAmount) *
            1e8
        ),
        coinAmount: Number(selectedBidCandidate.value.coinAmount),
        inscriptionId: selectedBidCandidate.value.inscriptionId,
        inscriptionNumber: selectedBidCandidate.value.inscriptionNumber,
      })
    } else {
      buildRes = await buildAskLimit({
        total: askExchangePrice.value * askExchangeOrdiAmount.value * 1e8,
        amount: askExchangeOrdiAmount.value,
      })
    }
  } else {
    if (takeModeTab.value === 0) {
      // buy
      if (!selectedBuyOrders.value.length) return

      buildRes = await buildBuyTake({
        order: selectedBuyOrders.value[0],
        feeb: selectedFeebPlan.value?.feeRate || 1,
      })
    } else if (takeModeTab.value === 1) {
      // sell
      if (!selectedSellOrders.value.length) return

      const total = selectedSellOrders.value.reduce((acc, cur) => {
        return acc + Number(cur.amount)
      }, 0)

      const sellTake = await buildSellTake({
        total,
        amount: selectedSellCoinAmount.value,
      }).catch(async (err) => {
        await sleep(500)

        console.log({ err })
        ElMessage.error(err.message)
        setIsOpen(false)
        builtInfo.value = undefined
        isLimitExchangeMode.value = false
      })

      buildRes = {
        ...sellTake,
        orderId: selectedSellOrders.value[0].orderId,
        amount: selectedSellOrders.value[0].coinAmount.toString(),
      }
    }
  }

  isBuilding.value = false

  if (!buildRes) return
  builtInfo.value = buildRes
  return
}

function discardOrder() {
  setIsOpen(false)
  builtInfo.value = undefined
}

async function submitOrder() {
  // 1. sign
  const signed = await unisat.signPsbt(builtInfo.value!.order.toHex())
  let pushed: any

  console.log({ signed })

  // 2. push
  switch (builtInfo.value!.type) {
    case 'buy':
      await pushBuyTake({
        psbtRaw: signed,
        network: networkStore.ordersNetwork,
        orderId: builtInfo.value.orderId,
      })
      break
    case 'sell':
      pushed = await pushSellTake({
        psbtRaw: signed,
        network: networkStore.ordersNetwork,
        orderId: builtInfo.value.orderId,
        address: addressStore.get!,
        value: builtInfo.value.value,
        amount: builtInfo.value.amount,
      })
      break
    case 'bid':
      pushed = await pushBidOrder({
        psbtRaw: signed,
        network: networkStore.ordersNetwork,
        address: addressStore.get!,
        tick: 'orxc',
        feeb: builtInfo.value.feeb,
        fee: builtInfo.value.fee,
        total: builtInfo.value.total,
        using: builtInfo.value.using,
        orderId: builtInfo.value.orderId,
      })
      break
    case 'ask':
      await pushAskOrder({
        psbtRaw: signed,
        network: networkStore.ordersNetwork,
        address: addressStore.get!,
        tick: 'orxc',
        amount: builtInfo.value.amount,
      })
      break
  }

  console.log({ pushed })

  // 3. update dummies

  // 4. close modal
  setIsOpen(false)
  builtInfo.value = undefined
  isLimitExchangeMode.value = false
}

// buy
async function buildBuyTakeDeprecated() {
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
  const order = selectedBuyOrders.value[0]

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

  buyPsbt.addInput(sellerInput)
  totalInput += sellerInput.witnessUtxo!.value

  // Step 5: sellerOutput, in
  const sellerOutput = sellPsbt.txOutputs[0]
  buyPsbt.addOutput(sellerOutput)

  // Step 6: service fee
  const serviceAddress =
    networkStore.btcNetwork === 'bitcoin'
      ? SERVICE_LIVENET_ADDRESS
      : SERVICE_TESTNET_ADDRESS
  const serviceFee = Math.max(2000, sellPsbt.txOutputs[0].value * 0.01)
  buyPsbt.addOutput({
    address: serviceAddress,
    value: serviceFee,
  })

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

  buyPsbt.addInput(paymentInput)
  totalInput += paymentInput.witnessUtxo.value

  // Step 9: add change output
  const fee = calculateFee(
    selectedFeebPlan.value?.feeRate || 1,
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

  return {
    order: buyPsbt,
    type: 'buy',
    price: order.coinRatePrice,
    fromAmount: order.amount,
    fromSymbol: 'BTC',
    toAmount: order.coinAmount,
    toSymbol: 'ORDI',
    feeb: selectedFeebPlan.value?.feeRate || 1,
    fee,
    serviceFee,
    totalSpent: order.amount + fee + serviceFee,
  }

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
        satoshis: DUMMY_UTXO_VALUE,
        outputIndex: newDummiesIndex[0],
        addressType: 2,
        txHex,
      },
      {
        txId: pushTxId,
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
        orderId: order.orderId,
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
const isBuilding = ref(false)
const builtInfo = ref()

// limit exchange mode
const isLimitExchangeMode = ref(false)
const limitExchangeType: Ref<'bid' | 'ask'> = ref('bid')
const marketPrice = ref(0.00000154)

const bidExchangePrice = ref(0)
const bidTotalExchangePrice = computed(() => {
  if (!!!selectedBidCandidate.value) return '0'

  return (
    bidExchangePrice.value * Number(selectedBidCandidate.value.coinAmount)
  ).toFixed(8)
})

const canPlaceBidOrder = computed(() => {
  return bidExchangePrice.value > 0 && !!selectedBidCandidate.value
})

const askExchangePrice = ref(0)
const askExchangeOrdiAmount = ref(0)
const askTotalExchangePrice = computed(() => {
  return (askExchangePrice.value * askExchangeOrdiAmount.value).toFixed(8)
})
const canPlaceAskOrder = computed(() => {
  return askExchangePrice.value > 0 && askExchangeOrdiAmount.value > 0
})
const { data: ordiBalance } = useQuery({
  queryKey: [
    'ordiBalance',
    {
      address: addressStore.get,
      network: networkStore.network,
    },
  ],
  queryFn: () => getOrdiBalance(addressStore.get!, networkStore.network),
})
const { data: btcBalance } = useQuery({
  queryKey: [
    'btcBalance',
    {
      address: addressStore.get,
      network: networkStore.network,
    },
  ],
  queryFn: () => {
    if (!addressStore.get) return 0

    type BalanceResult = {
      total: number
      unconfirmed: number
      confirmed: number
    }
    return unisat.getBalance().then((res: BalanceResult) => res.total)
  },
})
const { data: bidCandidates } = useQuery({
  queryKey: [
    'bidCandidates',
    {
      address: addressStore.get,
      network: networkStore.network,
    },
  ],
  queryFn: () => getBidCandidates(networkStore.network, 'orxc'),
})
const selectedBidCandidate: Ref<BidCandidate | undefined> = ref()
</script>

<template>
  <div class="rounded-xl border border-zinc-300">
    <!-- header -->
    <div
      class="grid grid-cols-6 items-center justify-between border-b border-zinc-300 px-4 py-2"
    >
      <!-- empty placeholder -->
      <div class="col-span-2"></div>

      <!-- title -->
      <div class="col-span-2 flex items-center justify-center gap-2">
        <img :src="ordiBtcLogo" class="h-8" />
        <span class="font-bold">ORXC-BTC</span>
      </div>

      <!-- limit exchange button -->
      <div class="col-span-2 flex justify-end">
        <button
          class="col-span-2 rounded-md border px-4 py-2 text-sm transition hover:border-orange-300 hover:bg-orange-300 hover:text-white"
          :class="
            isLimitExchangeMode
              ? 'border-orange-300 bg-orange-300 text-orange-900'
              : 'border-zinc-300 text-zinc-300'
          "
          @click="isLimitExchangeMode = !isLimitExchangeMode"
        >
          Limit Exchange
        </button>
      </div>
    </div>

    <!-- table -->
    <div class="flex items-start gap-x-8 p-8">
      <OrderList
        :askOrders="askOrders"
        :bidOrders="bidOrders"
        class="flex-1 self-stretch"
        @use-buy-price="(price: number) => setUseBuyPrice(price)"
        @use-sell-price="(price: number) => setUseSellPrice(price)"
      />

      <!-- operate panel -->
      <div class="flex-1" v-if="isLimitExchangeMode">
        <div
          class="-mx-4 -mt-4 rounded-lg bg-zinc-800 p-4 shadow-md shadow-orange-300/20"
        >
          <div class="relative">
            <h3 class="font-sm text-center font-bold text-orange-300">
              Create Limit Exchange Order
            </h3>

            <!-- close button -->
            <button
              class="absolute right-0 top-0"
              @click="isLimitExchangeMode = false"
            >
              <XMarkIcon class="h-6 w-6 text-zinc-300" aria-hidden="true" />
            </button>
          </div>

          <!-- tabs -->
          <TabGroup
            class="mt-8"
            as="div"
            @change="limitExchangeType = $event === 0 ? 'bid' : 'ask'"
          >
            <TabList
              class="flex items-center justify-center gap-4"
              v-slot="{ selectedIndex }"
            >
              <Tab
                class="w-28 rounded py-2"
                :class="
                  selectedIndex === 0
                    ? 'bg-green-500 text-white'
                    : 'bg-zinc-700 text-zinc-300'
                "
              >
                Bid
              </Tab>
              <Tab
                class="w-28 rounded py-2 text-white"
                :class="
                  selectedIndex === 1
                    ? 'bg-red-500 text-white'
                    : 'bg-zinc-700 text-zinc-300'
                "
                >Ask</Tab
              >
            </TabList>

            <TabPanels class="mt-8">
              <!-- bid panel -->
              <TabPanel class="">
                <div class="rounded-md border border-zinc-500 p-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center">
                      <img :src="btcIcon" alt="btc icon" class="h-6 w-6" />
                      <span class="ml-2 text-zinc-500">Price</span>
                    </div>

                    <div class="relative max-w-[67%] grow">
                      <input
                        type="text"
                        class="w-full rounded bg-zinc-700 py-2 pl-2 pr-16 text-right placeholder-zinc-500 outline-none"
                        placeholder="BTC"
                        :value="bidExchangePrice.toFixed(8)"
                        @input="(event: any) => (bidExchangePrice = parseFloat(event.target.value))"
                      />
                      <span
                        class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"
                      >
                        BTC
                      </span>
                    </div>
                  </div>

                  <div
                    class="cursor-pointer pt-2 text-right text-xs text-zinc-500"
                    @click="
                      bidExchangePrice = Number((marketPrice * 0.99).toFixed(8))
                    "
                    title="Use market price"
                  >
                    {{ `Market Price: ${marketPrice} BTC` }}
                  </div>
                </div>

                <!-- estimate -->
                <!-- <div class="mt-2 text-right text-sm">≈$12.99</div> -->

                <!-- amount -->
                <div class="mt-4 rounded-md border border-zinc-500 p-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center">
                      <img :src="ordiIcon" alt="btc icon" class="h-6 w-6" />
                      <span class="ml-2 text-zinc-500">Amount</span>
                    </div>

                    <Listbox
                      v-model="selectedBidCandidate"
                      as="div"
                      class="relative max-w-[67%] grow"
                    >
                      <ListboxButton
                        class="relative w-full cursor-default rounded bg-zinc-700 py-2 pl-3 pr-20 text-right text-sm focus:outline-none"
                      >
                        <span class="block truncate">
                          {{ selectedBidCandidate?.coinAmount || '-' }}
                        </span>

                        <span
                          class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"
                        >
                          <span>ORDI</span>
                          <ChevronUpDownIcon
                            class="h-5 w-5"
                            aria-hidden="true"
                          />
                        </span>
                      </ListboxButton>

                      <ListboxOptions
                        class="absolute z-10 mt-4 max-h-60 w-full translate-x-2 overflow-auto rounded-md border border-zinc-500 bg-zinc-900 p-2 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                      >
                        <ListboxOption
                          v-for="bidCandidate in bidCandidates"
                          v-slot="{ active, selected }"
                          as="template"
                          :key="bidCandidate.inscriptionId"
                          :value="bidCandidate"
                        >
                          <li
                            class="relative flex cursor-pointer items-center justify-end rounded py-2 pl-10 pr-2 transition"
                            :class="active && 'bg-orange-500/20'"
                          >
                            <span
                              v-if="selected"
                              class="absolute inset-y-0 left-0 flex items-center pl-3 text-orange-300"
                            >
                              <CheckIcon class="h-5 w-5" aria-hidden="true" />
                            </span>

                            <span :class="selected && 'text-orange-300'">
                              {{ bidCandidate.coinAmount }}
                            </span>
                          </li>
                        </ListboxOption>
                      </ListboxOptions>
                    </Listbox>
                  </div>
                </div>

                <!-- buy -->
                <div class="mt-36">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-zinc-500">Total</span>
                    <span class="text-zinc-300">
                      {{ `${bidTotalExchangePrice} BTC` }}
                    </span>
                  </div>

                  <div class="mt-2 flex items-center justify-between text-sm">
                    <span class="text-zinc-500">Balance</span>
                    <span class="text-zinc-300">
                      {{ `${prettyBalance(btcBalance)} BTC` }}
                    </span>
                  </div>

                  <button
                    class="mt-4 w-full rounded-md py-4 font-bold"
                    :class="
                      canPlaceBidOrder
                        ? 'bg-orange-300 text-orange-900'
                        : 'bg-zinc-700 text-zinc-500'
                    "
                    @click="buildOrder"
                    :disabled="!canPlaceBidOrder"
                  >
                    Place Bid Order
                  </button>
                </div>
              </TabPanel>

              <!-- ask panel -->
              <TabPanel class="">
                <div class="rounded-md border border-zinc-500 p-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center">
                      <img :src="btcIcon" alt="btc icon" class="h-6 w-6" />
                      <span class="ml-2 text-zinc-500">Price</span>
                    </div>

                    <div class="relative max-w-[67%] grow">
                      <input
                        type="text"
                        class="w-full rounded bg-zinc-700 py-2 pl-2 pr-16 text-right placeholder-zinc-500 outline-none"
                        placeholder="BTC"
                        v-model.number="askExchangePrice"
                      />
                      <span
                        class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"
                      >
                        BTC
                      </span>
                    </div>
                  </div>

                  <div
                    class="cursor-pointer pt-2 text-right text-xs text-zinc-500"
                    @click="
                      askExchangePrice = Number((marketPrice * 1.01).toFixed(8))
                    "
                    title="Use market price"
                  >
                    {{ `Market Price: ${marketPrice} BTC` }}
                  </div>
                </div>

                <!-- estimate -->
                <!-- <div class="mt-2 text-right text-sm">≈$12.99</div> -->

                <!-- amount -->
                <div class="mt-4 rounded-md border border-zinc-500 p-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center">
                      <img :src="ordiIcon" alt="btc icon" class="h-6 w-6" />
                      <span class="ml-2 text-zinc-500">Amount</span>
                    </div>

                    <div class="relative max-w-[67%] grow">
                      <input
                        type="text"
                        class="w-full rounded bg-zinc-700 py-2 pl-2 pr-16 text-right placeholder-zinc-500 outline-none"
                        placeholder="Ordi"
                        v-model.number="askExchangeOrdiAmount"
                      />
                      <span
                        class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"
                      >
                        ORDI
                      </span>
                    </div>
                  </div>

                  <div
                    class="cursor-pointer pt-2 text-right text-xs text-zinc-500"
                    @click="askExchangeOrdiAmount = ordiBalance || 0"
                    title="Sell all ORDI"
                  >
                    {{ `Balance: ${ordiBalance} ORDI` }}
                  </div>
                </div>

                <!-- buy -->
                <div class="mt-36">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-zinc-500">Total</span>
                    <span class="text-zinc-300">
                      {{ `${askTotalExchangePrice} BTC` }}
                    </span>
                  </div>

                  <button
                    class="mt-4 w-full rounded-md py-4 font-bold"
                    :class="
                      canPlaceAskOrder
                        ? 'bg-orange-300 text-orange-900'
                        : 'bg-zinc-700 text-zinc-500'
                    "
                    @click="buildOrder"
                    :disabled="!canPlaceAskOrder"
                  >
                    Place Ask Order
                  </button>
                </div>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>

      <div class="flex-1" v-else>
        <!-- tabs -->
        <TabGroup :selectedIndex="takeModeTab" @change="changeTakeModeTab">
          <TabList
            class="flex items-center justify-center gap-4"
            v-slot="{ selectedIndex }"
          >
            <Tab
              class="w-28 rounded py-2"
              :class="
                selectedIndex === 0
                  ? 'bg-green-500 text-white'
                  : 'bg-zinc-700 text-zinc-300'
              "
            >
              Buy
            </Tab>
            <Tab
              class="w-28 rounded py-2 text-white"
              :class="
                selectedIndex === 1
                  ? 'bg-red-500 text-white'
                  : 'bg-zinc-700 text-zinc-300'
              "
            >
              Sell
            </Tab>
          </TabList>

          <TabPanels class="mt-8">
            <!-- buy panel -->
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
                    :value="useBuyPrice.toFixed(8)"
                    @input="(event: any) => (useBuyPrice = parseFloat(event.target.value))"
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
                  v-model="selectedBuyOrders"
                  multiple
                  as="div"
                  class="relative max-w-[67%] grow"
                >
                  <ListboxButton
                    class="relative w-full cursor-default rounded bg-zinc-700 py-2 pl-3 pr-20 text-right text-sm focus:outline-none"
                  >
                    <span class="block truncate">
                      {{ selectedBuyCoinAmount }}
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
                      v-for="psbt in candidateBuyOrders"
                      v-slot="{ active, selected }"
                      as="template"
                      :key="psbt.orderId"
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
                <RadioGroup v-model="selectedFeebPlan" v-if="feebPlans">
                  <RadioGroupLabel class="text-xs text-zinc-500">
                    Select Fee Rate
                  </RadioGroupLabel>
                  <div class="mt-2 flex justify-center gap-4">
                    <RadioGroupOption
                      as="template"
                      v-slot="{ checked, active }"
                      :key="feebPlan.title"
                      :value="feebPlan"
                      v-for="feebPlan in feebPlans"
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
                            {{ feebPlan.title }}
                          </RadioGroupLabel>

                          <RadioGroupDescription
                            as="div"
                            :class="
                              checked ? 'text-orange-100' : 'text-zinc-500'
                            "
                          >
                            <div>{{ `${feebPlan.feeRate} sat/vB` }}</div>
                            <div class="mt-1">{{ feebPlan.desc }}</div>
                          </RadioGroupDescription>
                        </div>
                      </div>
                    </RadioGroupOption>
                  </div>
                </RadioGroup>

                <div class="mt-4 flex items-center justify-between text-sm">
                  <span class="text-zinc-500">Fees</span>
                  <span class="text-zinc-300">{{ prettyBuyFees }}</span>
                </div>

                <button
                  class="mt-4 w-full rounded-md py-4 font-bold"
                  :class="
                    selectedBuyOrders.length
                      ? 'bg-green-500 text-white'
                      : 'bg-zinc-700 text-zinc-500'
                  "
                  @click="buildOrder"
                  :disabled="!selectedBuyOrders.length"
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

            <!-- sell panel -->
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
                    :value="useSellPrice.toFixed(8)"
                    @input="(event: any) => (useSellPrice = parseFloat(event.target.value))"
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
                  v-model="selectedSellOrders"
                  multiple
                  as="div"
                  class="relative max-w-[67%] grow"
                >
                  <ListboxButton
                    class="relative w-full cursor-default rounded bg-zinc-700 py-2 pl-3 pr-20 text-right text-sm focus:outline-none"
                  >
                    <span class="block truncate">
                      {{ selectedSellCoinAmount }}
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
                      v-for="psbt in candidateSellOrders"
                      v-slot="{ active, selected }"
                      as="template"
                      :key="psbt.orderId"
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
                          {{ (Number(psbt.coinRatePrice) / 1e8).toFixed(8) }}
                        </span>
                        <span :class="selected && 'text-orange-300'">
                          {{ psbt.coinAmount }}
                        </span>
                      </li>
                    </ListboxOption>
                  </ListboxOptions>
                </Listbox>
              </div>

              <!-- sell -->
              <div class="mt-12">
                <!-- feeb select -->
                <RadioGroup v-model="selectedFeebPlan" v-if="feebPlans">
                  <RadioGroupLabel class="text-xs text-zinc-500">
                    Select Fee Rate
                  </RadioGroupLabel>
                  <div class="mt-2 flex justify-center gap-4">
                    <RadioGroupOption
                      as="template"
                      v-slot="{ checked, active }"
                      :key="feebPlan.title"
                      :value="feebPlan"
                      v-for="feebPlan in feebPlans"
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
                            {{ feebPlan.title }}
                          </RadioGroupLabel>

                          <RadioGroupDescription
                            as="div"
                            :class="
                              checked ? 'text-orange-100' : 'text-zinc-500'
                            "
                          >
                            <div>{{ `${feebPlan.feeRate} sat/vB` }}</div>
                            <div class="mt-1">{{ feebPlan.desc }}</div>
                          </RadioGroupDescription>
                        </div>
                      </div>
                    </RadioGroupOption>
                  </div>
                </RadioGroup>

                <div class="mt-4 flex items-center justify-between text-sm">
                  <span class="text-zinc-500">Fees</span>
                  <span class="text-zinc-300">{{ prettySellFees }}</span>
                </div>

                <button
                  class="mt-4 w-full rounded-md py-4 font-bold"
                  :class="
                    selectedSellOrders.length
                      ? 'bg-green-500 text-white'
                      : 'bg-zinc-700 text-zinc-500'
                  "
                  @click="buildOrder"
                  :disabled="!selectedSellOrders.length"
                >
                  Sell ORDI
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

            <DialogDescription as="div" class="mt-4 text-sm">
              <div
                class="mt-4 flex items-center justify-center gap-2 text-zinc-300"
                v-if="isBuilding"
              >
                <Loader class="h-4 w-4 animate-spin-slow" />
                <span>Building Transaction...</span>
              </div>

              <div class="" v-else-if="builtInfo">
                <div class="flex items-center gap-2">
                  <span class="text-zinc-500">Order Type</span>
                  <span class="font-bold uppercase text-orange-300">
                    {{ builtInfo.type }}
                  </span>
                </div>

                <div class="mt-4"></div>
              </div>
            </DialogDescription>

            <div
              class="mt-8 flex items-center justify-center gap-4"
              v-if="builtInfo"
            >
              <button
                @click="discardOrder"
                class="w-24 rounded border border-zinc-700 py-2 text-zinc-500"
              >
                Cancel
              </button>
              <button
                @click="submitOrder"
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
