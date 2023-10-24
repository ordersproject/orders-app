<script lang="ts" setup>
import { Ref, computed, onMounted, provide, ref, watch } from 'vue'
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
  RadioGroupDescription,
} from '@headlessui/vue'
import {
  CheckIcon,
  ChevronsUpDownIcon,
  RefreshCcwIcon,
  XIcon,
  BookPlusIcon,
} from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { useQuery } from '@tanstack/vue-query'

import btcIcon from '@/assets/btc.svg?url'
import { prettyBalance, prettyBtcDisplay } from '@/lib/formatters'
import { sleep } from '@/lib/helpers'
import { calculateFee } from '@/lib/build-helpers'
import {
  buildAskLimit,
  buildBidLimit,
  buildSellTake,
} from '@/lib/order-builder'
import {
  getOrdiBalance,
  getBidCandidates,
  getOrders,
  getOneBrc20,
  getMarketPrice,
  type Order,
  type Brc20Transferable,
  type BidCandidate,
} from '@/queries/orders-api'
import { getFeebPlans, type FeebPlan } from '@/queries/proxy'
import { useAddressStore, useDummiesStore, useNetworkStore } from '@/store'
import { buildBuyTake } from '@/lib/order-builder'
import utils from '@/utils'
import whitelist from '@/lib/whitelist'

import OrderPanelHeader from './PanelHeader.vue'
import OrderList from './List.vue'
import OrderConfirmationModal from '../ConfirmationModal.vue'
import { selectPair, selectedPairKey } from '@/data/trading-pairs'
import { DEBUG } from '@/data/constants'

const unisat = window.unisat

const addressStore = useAddressStore()
const dummiesStore = useDummiesStore()
const networkStore = useNetworkStore()

const inWhitelist = computed(() => {
  return addressStore.get && whitelist.includes(addressStore.get)
})
const selectedPair = selectPair()
provide(selectedPairKey, selectedPair)

const { data: askOrders } = useQuery({
  queryKey: [
    'askOrders',
    { network: networkStore.network, tick: selectedPair.fromSymbol },
  ],
  queryFn: () =>
    getOrders({
      type: 'ask',
      network: networkStore.network,
      sort: 'desc',
      tick: selectedPair.fromSymbol,
    }),
  placeholderData: [],
})
const { data: bidOrders } = useQuery({
  queryKey: [
    'bidOrders',
    { network: networkStore.network, tick: selectedPair.fromSymbol },
  ],
  queryFn: () =>
    getOrders({
      type: 'bid',
      network: networkStore.network,
      sort: 'desc',
      tick: selectedPair.fromSymbol,
    }),
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
      return (
        Number(item.coinRatePrice) / 1e8 === useBuyPrice.value &&
        item.orderId === useBuyOrderId.value
      )
    })
    .slice(0, 1)
})
const candidateSellOrders = computed(() => {
  if (useSellPrice.value === 0) return []
  if (!bidOrders.value) return []

  return bidOrders.value
    .filter((item) => {
      return (
        Number(item.coinRatePrice) / 1e8 === useSellPrice.value &&
        item.orderId === useSellOrderId.value
      )
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

  selectedFeebPlan.value = plans[1]
})

const buyFees = computed(() => {
  if (!selectedBuyCoinAmount.value) return 0
  if (!selectedFeebPlan.value) return 0

  const ordersCount = selectedBuyOrders.value.length

  return calculateFee(selectedFeebPlan.value.feeRate, 4, 6) * ordersCount
})
const sellFees = computed(() => {
  return 0
})

const prettyBuyFees = computed(() => {
  if (!buyFees.value) return '0'

  const feeInBtc = buyFees.value / 1e8

  return `≈ ${feeInBtc.toFixed(8)} BTC`
})
const prettySellFees = computed(() => {
  if (!sellFees.value) return '0'

  const feeInBtc = sellFees.value / 1e8

  return `≈ ${feeInBtc.toFixed(8)} BTC`
})

const useBuyPrice = ref(0)
const useSellPrice = ref(0)
const useBuyOrderId = ref()
const useSellOrderId = ref()

function setUseBuyPrice(price: number, orderId: string) {
  takeModeTab.value = 0
  useBuyPrice.value = price
  useBuyOrderId.value = orderId
}
function setUseSellPrice(price: number, orderId: string) {
  takeModeTab.value = 1
  useSellPrice.value = price
  useSellOrderId.value = orderId
}

// watch use BuyOrderId change, update selected orders
watch(useBuyOrderId, (buyOrderId) => {
  if (!buyOrderId || !askOrders.value) {
    selectedBuyOrders.value = []
  } else {
    selectedBuyOrders.value = candidateBuyOrders.value
  }
})
watch(useSellOrderId, (sellOrderId) => {
  if (!sellOrderId || !bidOrders.value) {
    selectedSellOrders.value = []
  } else {
    selectedSellOrders.value = candidateSellOrders.value
  }
})

const buildProcessTip = ref('Building Transaction...')
async function buildOrder() {
  setIsOpen(true)
  isBuilding.value = true
  let buildRes: any

  if (!dummiesStore.has) {
    // build dummies first
    buildProcessTip.value = 'Building dummy UTXOs for the first transaction. '
    try {
      await utils.checkAndSelectDummies({})
    } catch (e: any) {
      ElMessage.error(e.message)
      setIsOpen(false)
      builtInfo.value = undefined
      isLimitExchangeMode.value = false
      return
    }
  }

  buildProcessTip.value = 'Building Transaction...'

  try {
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
          selectedPair,
          poolOrderId: selectedBidCandidate.value.poolOrderId,
        })
      } else {
        buildRes = await buildAskLimit({
          total: Math.round(
            askExchangePrice.value * askLimitBrcAmount.value * 1e8
          ),
          amount: askLimitBrcAmount.value,
          selectedPair,
        })
      }
    } else {
      if (takeModeTab.value === 0) {
        // buy
        if (!selectedBuyOrders.value.length) return

        buildRes = await buildBuyTake({
          order: selectedBuyOrders.value[0],
          feeb: selectedFeebPlan.value?.feeRate || 1,
          selectedPair,
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
          selectedPair,
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
  } catch (error: any) {
    ElMessage.error(error.message)
    setIsOpen(false)
    builtInfo.value = undefined
    isLimitExchangeMode.value = false

    if (DEBUG) throw error
  }

  isBuilding.value = false

  if (!buildRes) return
  console.log({ buildRes })
  builtInfo.value = buildRes
  return
}

async function goInscribe() {
  await window.unisat.inscribeTransfer(selectedPair.fromSymbol)
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
const limitExchangeType: Ref<'bid' | 'ask'> = ref('ask')
const { data: marketPrice } = useQuery({
  queryKey: [
    'marketPrice',
    { network: networkStore.network, tick: selectedPair.fromSymbol },
  ],
  queryFn: () => getMarketPrice({ tick: selectedPair.fromSymbol }),
})

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
const askLimitBrcAmount = computed(() => {
  if (networkStore.network === 'testnet') {
    return askExchangeOrdiAmount.value
  }

  if (!selectedAskCandidate.value) return 0

  return Number(selectedAskCandidate.value.amount)
})
const askTotalExchangePrice = computed(() => {
  return (askExchangePrice.value * askLimitBrcAmount.value).toFixed(8)
})
const canPlaceAskOrder = computed(() => {
  return askExchangePrice.value > 0 && askLimitBrcAmount.value > 0
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
const { data: myBrc20Info } = useQuery({
  queryKey: [
    'myBrc20Info',
    {
      address: addressStore.get,
      network: networkStore.network,
      tick: selectedPair.fromSymbol,
    },
  ],
  queryFn: () =>
    getOneBrc20({
      address: addressStore.get!,
      tick: selectedPair.fromSymbol,
    }),

  enabled: computed(
    () => networkStore.network !== 'testnet' && !!addressStore.get
  ),
})
const selectedAskCandidate: Ref<Brc20Transferable | undefined> = ref()

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

const usePool = selectedPair.hasPool
const { data: bidCandidates } = useQuery({
  queryKey: [
    'bidCandidates',
    {
      address: addressStore.get,
      network: networkStore.network,
      symbol: selectedPair.fromSymbol,
    },
  ],
  queryFn: () =>
    getBidCandidates(networkStore.network, selectedPair.fromSymbol, usePool),
})
const selectedBidCandidate: Ref<BidCandidate | undefined> = ref()
</script>

<template>
  <div class="rounded-xl border border-zinc-300">
    <OrderPanelHeader v-model:is-limit-exchange-mode="isLimitExchangeMode" />

    <!-- table -->
    <div class="flex items-start gap-x-8 p-8">
      <OrderList
        :askOrders="askOrders"
        :bidOrders="bidOrders"
        class="flex-1 self-stretch"
        @use-buy-price="(price: number, orderId: string) => setUseBuyPrice(price, orderId)"
        @use-sell-price="(price: number, orderId: string) => setUseSellPrice(price, orderId)"
      />

      <!-- operate panel -->
      <div class="flex-1" v-if="isLimitExchangeMode">
        <div
          class="-mx-4 -mt-4 rounded-lg bg-zinc-800 p-4 shadow-md shadow-orange-300/20"
        >
          <div class="relative">
            <h3 class="font-sm text-center font-bold text-orange-300">
              Create Limit Order
            </h3>

            <!-- close button -->
            <button
              class="absolute right-0 top-0"
              @click="isLimitExchangeMode = false"
            >
              <XIcon class="h-6 w-6 text-zinc-300" aria-hidden="true" />
            </button>
          </div>

          <!-- tabs -->
          <TabGroup
            class="mt-8"
            as="div"
            @change="limitExchangeType = $event === 0 ? 'bid' : 'ask'"
            :default-index="1"
          >
            <TabList
              class="flex items-center justify-center gap-4"
              v-slot="{ selectedIndex }"
            >
              <Tab
                :class="[
                  'w-28 rounded py-2',
                  selectedIndex === 0
                    ? 'bg-green-500 text-white'
                    : 'bg-zinc-700 text-zinc-300',
                  { 'cursor-not-allowed': !inWhitelist },
                ]"
                :disabled="!inWhitelist"
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
                    v-if="marketPrice"
                    @click="
                      bidExchangePrice = Number((marketPrice * 0.99).toFixed(8))
                    "
                    title="Use market price"
                  >
                    {{ `Market Price: ${marketPrice.toFixed(8)} BTC` }}
                  </div>
                </div>

                <!-- estimate -->
                <!-- <div class="mt-2 text-right text-sm">≈$12.99</div> -->

                <!-- amount -->
                <div class="mt-4 rounded-md border border-zinc-500 p-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center">
                      <img
                        :src="selectedPair.fromIcon"
                        alt="btc icon"
                        class="h-6 w-6 rounded-full"
                      />
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
                          <span class="uppercase">{{
                            selectedPair.fromSymbol
                          }}</span>
                          <ChevronsUpDownIcon
                            class="h-5 w-5"
                            aria-hidden="true"
                          />
                        </span>
                      </ListboxButton>

                      <ListboxOptions
                        class="absolute z-10 mt-4 max-h-60 w-full translate-x-2 overflow-auto rounded-md border border-zinc-500 bg-zinc-900 p-2 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                      >
                        <ListboxOption
                          v-if="!bidCandidates?.length"
                          :disabled="true"
                          class="text-right text-zinc-500 text-sm py-2"
                        >
                          No liquidity currently.
                        </ListboxOption>
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
                            :title="bidCandidate?.poolOrderId"
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

                            <!-- liquidity race status  -->
                            <span class="relative flex h-2 w-2 ml-4">
                              <span
                                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 blur-xs bg-green-400"
                                v-if="bidCandidate.bidCount === 0"
                              ></span>
                              <span
                                class="relative inline-flex rounded-full h-2 w-2"
                                :class="{
                                  'bg-green-500': bidCandidate.bidCount === 0,
                                  'bg-yellow-500':
                                    bidCandidate.bidCount > 0 &&
                                    bidCandidate.bidCount < 5,
                                  'bg-red-500': bidCandidate.bidCount >= 5,
                                }"
                              ></span>
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
                        ? 'bg-orange-300 text-orange-950'
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
                        :value="askExchangePrice.toFixed(8)"
                        @input="(event: any) => (askExchangePrice = parseFloat(event.target.value))"
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
                    v-if="marketPrice"
                    @click="
                      askExchangePrice = Number((marketPrice * 1.01).toFixed(8))
                    "
                    title="Use market price"
                  >
                    {{ `Market Price: ${marketPrice.toFixed(8)} BTC` }}
                  </div>
                </div>

                <!-- estimate -->
                <!-- <div class="mt-2 text-right text-sm">≈$12.99</div> -->

                <!-- amount -->
                <div class="mt-4 rounded-md border border-zinc-500 p-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center">
                      <img
                        :src="selectedPair.fromIcon"
                        alt="btc icon"
                        class="h-6 w-6 rounded-full"
                      />
                      <span class="ml-2 text-zinc-500">Amount</span>
                    </div>

                    <div
                      class="relative max-w-[67%] grow"
                      v-if="networkStore.network === 'testnet'"
                    >
                      <input
                        type="text"
                        class="w-full rounded bg-zinc-700 py-2 pl-2 pr-16 text-right placeholder-zinc-500 outline-none"
                        :placeholder="selectedPair.fromSymbol"
                        v-model.number="askExchangeOrdiAmount"
                      />
                      <span
                        class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 uppercase"
                      >
                        {{ selectedPair.fromSymbol }}
                      </span>
                    </div>

                    <Listbox
                      v-model="selectedAskCandidate"
                      v-else
                      as="div"
                      class="relative max-w-[67%] grow"
                    >
                      <ListboxButton
                        class="relative w-full cursor-default rounded bg-zinc-700 py-2 pl-3 pr-20 text-right text-sm focus:outline-none"
                      >
                        <span class="block truncate">
                          {{ selectedAskCandidate?.amount || '-' }}
                        </span>

                        <span
                          class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"
                        >
                          <span class="uppercase">
                            {{ selectedPair.fromSymbol }}
                          </span>
                          <ChevronsUpDownIcon
                            class="h-5 w-5"
                            aria-hidden="true"
                          />
                        </span>
                      </ListboxButton>

                      <ListboxOptions
                        class="absolute z-10 mt-4 max-h-60 w-full translate-x-2 overflow-auto rounded-md border border-zinc-500 bg-zinc-900 p-2 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                      >
                        <ListboxOption
                          v-for="askCandidate in myBrc20Info?.transferBalanceList"
                          v-slot="{ active, selected }"
                          as="template"
                          :key="askCandidate.inscriptionId"
                          :value="askCandidate"
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
                              {{ askCandidate.amount }}
                            </span>
                          </li>
                        </ListboxOption>

                        <ListboxOption
                          as="template"
                          v-slot="{ active, selected }"
                          @click="goInscribe"
                        >
                          <li
                            :class="[
                              'flex cursor-pointer items-center justify-between rounded border-t border-zinc-700 p-2 text-zinc-300 transition',
                              { 'bg-orange-500/20 text-orange-300': active },
                            ]"
                          >
                            <BookPlusIcon
                              class="mr-2 h-5 w-5"
                              aria-hidden="true"
                            />
                            <span>Inscribe Transfer</span>
                          </li>
                        </ListboxOption>
                      </ListboxOptions>
                    </Listbox>
                  </div>

                  <div
                    class="cursor-pointer pt-2 text-right text-xs text-zinc-500"
                    v-if="networkStore.network === 'testnet'"
                    @click="askExchangeOrdiAmount = ordiBalance || 0"
                    :title="`Sell all ${selectedPair.fromSymbol.toUpperCase()}`"
                  >
                    {{
                      `Balance: ${ordiBalance} ${selectedPair.fromSymbol.toUpperCase()}`
                    }}
                  </div>
                </div>

                <!-- how to -->
                <div
                  class="mt-4 text-right text-xs text-zinc-400 underline underline-offset-2 transition hover:text-orange-300"
                >
                  <a
                    href="https://canary-sailor-7ad.notion.site/How-to-place-an-ASK-order-faedef7a12134b57a40962b06d75c024"
                    target="_blank"
                  >
                    How to place an ASK order?
                  </a>
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
                        ? 'bg-orange-300 text-orange-950'
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
                  <img
                    :src="selectedPair.fromIcon"
                    alt="btc icon"
                    class="h-6 w-6 rounded-full"
                  />
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
                      <span class="uppercase">{{
                        selectedPair.fromSymbol
                      }}</span>
                      <ChevronsUpDownIcon class="h-5 w-5" aria-hidden="true" />
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
                  Buy {{ selectedPair.fromSymbol.toUpperCase() }}
                </button>

                <div
                  class="mt-4 flex items-center justify-center gap-x-2 text-center text-sm"
                >
                  <span class="text-zinc-500">Available</span>
                  <span class="text-zinc-300">
                    {{ `${prettyBalance(balance)} BTC` }}
                  </span>
                  <button @click="updateBalance">
                    <RefreshCcwIcon
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
                  <img
                    :src="selectedPair.fromIcon"
                    alt="btc icon"
                    class="h-6 w-6 rounded-full"
                  />
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
                      <span class="uppercase">{{
                        selectedPair.fromSymbol
                      }}</span>
                      <ChevronsUpDownIcon class="h-5 w-5" aria-hidden="true" />
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
              <!-- brc-20 availability -->
              <!-- <div
                class="z-[-1] -mt-1 overflow-hidden rounded-lg bg-zinc-950 text-xs text-zinc-500"
              >
                <div class="px-6 py-2">
                  <h4 class="text-sm">Balance</h4>

                  <div class="mt-4">
                    <div class="">Available: 2000</div>
                    <div class="">Transferable: 2000</div>
                  </div>
                </div>
              </div> -->

              <!-- sell -->
              <div class="mt-12">
                <!-- feeb select -->
                <RadioGroup
                  v-model="selectedFeebPlan"
                  v-if="feebPlans"
                  class="mt-4"
                >
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
                            class="mb-2 text-sm font-bold"
                          >
                            {{ feebPlan.title }}
                          </RadioGroupLabel>

                          <RadioGroupDescription
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
                  Sell {{ selectedPair.fromSymbol.toUpperCase() }}
                </button>

                <div
                  class="mt-4 flex items-center justify-center gap-x-2 text-center text-sm"
                >
                  <span class="text-zinc-500">Available</span>
                  <span class="text-zinc-300">
                    {{ `${prettyBtcDisplay(balance)}` }}
                  </span>
                  <button @click="updateBalance">
                    <RefreshCcwIcon
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
    <OrderConfirmationModal
      v-model:is-open="isOpen"
      v-model:is-building="isBuilding"
      v-model:built-info="builtInfo"
      v-model:is-limit-exchange-mode="isLimitExchangeMode"
      :build-process-tip="buildProcessTip"
    />
  </div>
</template>
