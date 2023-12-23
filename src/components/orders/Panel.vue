<script lang="ts" setup>
import { Ref, computed, provide, ref, watch } from 'vue'
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
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/vue'
import {
  CheckIcon,
  ChevronsUpDownIcon,
  XIcon,
  BookPlusIcon,
  ChevronRightIcon,
} from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { useQuery } from '@tanstack/vue-query'
import Decimal from 'decimal.js'
import { get } from '@vueuse/core'

import { prettyBalance } from '@/lib/formatters'
import { sleep, unit, useBtcUnit } from '@/lib/helpers'
import { calculateFee } from '@/lib/build-helpers'
import {
  buildAskLimit,
  buildBidLimit,
  buildSellTake,
  buildBuyTake,
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
import { useConnectionStore, useFeebStore, useNetworkStore } from '@/stores'
import { selectPair, selectedPairKey } from '@/data/trading-pairs'
import { DEBUG, SELL_TX_SIZE } from '@/data/constants'

import btcIcon from '@/assets/btc.svg?url'
import OrderPanelHeader from './PanelHeader.vue'
import OrderList from './List.vue'
import OrderConfirmationModal from '../ConfirmationModal.vue'

const connectionStore = useConnectionStore()
const address = connectionStore.getAddress
const networkStore = useNetworkStore()
const feebStore = useFeebStore()

const selectedPair = selectPair()
provide(selectedPairKey, selectedPair)

const { data: askOrders, isFetched: isFetchedAskOrders } = useQuery({
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
// watch ask orders data
// when it finish loaded, scroll to the bottom
watch(
  isFetchedAskOrders,
  (isFetchedAskOrders) => {
    if (!isFetchedAskOrders) return

    setTimeout(() => {
      const el = document.getElementById('askOrders')
      if (el) {
        el.scrollTop = el.scrollHeight
      }
    }, 100)
  },
  { immediate: true }
)

const takeModeTab = ref(0)
function changeTakeModeTab(index: number) {
  takeModeTab.value = index
}

function deviatePrice(price: number, deviator: number): number {
  return new Decimal(price * deviator).toDP(new Decimal(price).dp()).toNumber()
}

const selectedBuyOrders: Ref<Order[]> = ref([])
const selectedSellOrders: Ref<Order[]> = ref([])

const candidateBuyOrders = computed(() => {
  if (useBuyPrice.value === 0) return []
  if (!askOrders.value) return []

  return askOrders.value
    .filter((item) => {
      return (
        Number(item.coinRatePrice) === useBuyPrice.value &&
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
        Number(item.coinRatePrice) === useSellPrice.value &&
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

const buyTotal = computed(() => {
  if (!selectedBuyCoinAmount.value) return 0

  return (
    prettyBalance(
      selectedBuyCoinAmount.value * useBuyPrice.value,
      get(useBtcUnit)
    ) +
    ' ' +
    get(unit)
  )
})

const buyFees = computed(() => {
  if (!selectedBuyCoinAmount.value) return 0
  if (!feebStore.get) return 0

  const ordersCount = selectedBuyOrders.value.length

  return calculateFee(feebStore.get, 4, 6) * ordersCount
})
const sellFees = computed(() => {
  if (!feebStore.get) return 0

  return SELL_TX_SIZE * feebStore.get
})

const prettyBuyFees = computed(() => {
  if (!buyFees.value) return '0'

  const feeInBtc = buyFees.value

  return `≈ ${prettyBalance(feeInBtc, get(useBtcUnit))} ${get(unit)}`
})
const prettySellFees = computed(() => {
  if (!sellFees.value) return '0'

  const feeInBtc = sellFees.value

  return `≈ ${prettyBalance(feeInBtc, get(useBtcUnit))} ${get(unit)}`
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
  const feeb = feebStore.get
  if (!feeb) {
    throw new Error('Choose a fee rate first.')
  }

  setIsOpen(true)
  isBuilding.value = true
  let buildRes: any

  buildProcessTip.value = 'Building Transaction...'

  try {
    if (isLimitExchangeMode.value) {
      if (limitExchangeType.value === 'bid') {
        if (!selectedBidCandidate.value) return
        console.log({
          bidExchangePrice: bidExchangePrice.value,
          selectedBidCandidate: selectedBidCandidate.value,
          total: Math.round(
            bidExchangePrice.value *
              Number(selectedBidCandidate.value.coinAmount)
          ),
        })

        // v2 update: 2-step build
        // 1. build the schema of the transaction and report the schema to the server
        const preBuildRes = await buildBidLimit({
          total: Math.round(
            bidExchangePrice.value *
              Number(selectedBidCandidate.value.coinAmount)
          ),
          coinAmount: Number(selectedBidCandidate.value.coinAmount),
          inscriptionId: selectedBidCandidate.value.inscriptionId,
          inscriptionNumber: selectedBidCandidate.value.inscriptionNumber,
          selectedPair,
          poolOrderId: selectedBidCandidate.value.poolOrderId,
        })
        buildRes = preBuildRes

        console.log({ preBuildRes })
      } else {
        buildRes = await buildAskLimit({
          total: Math.round(askExchangePrice.value * askLimitBrcAmount.value),
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
  const adapter = connectionStore.adapter

  await adapter?.inscribe(selectedPair.exactName)
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

  return Math.round(
    bidExchangePrice.value * Number(selectedBidCandidate.value.coinAmount)
  )
})

const canPlaceBidOrder = computed(() => {
  return bidExchangePrice.value > 0 && !!selectedBidCandidate.value
})

const askExchangePrice = ref(0)
const updateExchangePrice = (price: number, type: 'ask' | 'bid') => {
  if (typeof price === 'string') {
    price = Number(price)
  }
  if (isNaN(price)) {
    price = 0
  }
  if (useBtcUnit.value) {
    price = new Decimal(price).times(1e8).toNumber()
  }

  if (type === 'ask') {
    askExchangePrice.value = price
  } else {
    bidExchangePrice.value = price
  }
}
const askExchangeOrdiAmount = ref(0)
const askLimitBrcAmount = computed(() => {
  if (networkStore.network === 'testnet') {
    return askExchangeOrdiAmount.value
  }

  if (!selectedAskCandidate.value) return 0

  return Number(selectedAskCandidate.value.amount)
})
const askTotalExchangePrice = computed(() => {
  return Math.round(askExchangePrice.value * askLimitBrcAmount.value)
})
const canPlaceAskOrder = computed(() => {
  return askExchangePrice.value > 0 && askLimitBrcAmount.value > 0
})
const { data: ordiBalance } = useQuery({
  queryKey: [
    'ordiBalance',
    {
      address,
      network: networkStore.network,
    },
  ],
  queryFn: () => getOrdiBalance(address, networkStore.network),
})
const { data: myBrc20Info } = useQuery({
  queryKey: [
    'myBrc20Info',
    {
      address,
      network: networkStore.network,
      tick: selectedPair.fromSymbol,
    },
  ],
  queryFn: () =>
    getOneBrc20({
      address,
      tick: selectedPair.fromSymbol,
    }),

  enabled: computed(() => networkStore.network !== 'testnet' && !!address),
})
const selectedAskCandidate: Ref<Brc20Transferable | undefined> = ref()

const usePool = selectedPair.hasPool || selectedPair.usePool || false
const { data: bidCandidates } = useQuery({
  queryKey: [
    'bidCandidates',
    {
      address,
      network: networkStore.network,
      symbol: selectedPair.fromSymbol,
    },
  ],
  queryFn: () =>
    getBidCandidates(networkStore.network, selectedPair.fromSymbol, usePool),
})
// filter out the bid candidates that is less than the price user input
const usableBidCandidates = computed(() => {
  if (!bidCandidates.value) return []

  return bidCandidates.value.filter((item) => {
    return item.coinRatePrice > bidExchangePrice.value
  })
})
const unusableBidCandidates = computed(() => {
  if (!bidCandidates.value) return []

  return bidCandidates.value.filter((item) => {
    return item.coinRatePrice < bidExchangePrice.value
  })
})
const selectedBidCandidate: Ref<BidCandidate | undefined> = ref()
// watch for bid exchange price change, remove selected bid candidate if the price is higher than the bid exchange price
watch(bidExchangePrice, (price) => {
  if (!selectedBidCandidate.value) return

  if (selectedBidCandidate.value.coinRatePrice < price) {
    selectedBidCandidate.value = undefined
  }
})
</script>

<template>
  <div
    class="rounded-xl shadow-lg shadow-orange-300/10 border-2 border-orange-200/20 hover:shadow-orange-300/20 min-h-[75vh] flex flex-col"
  >
    <OrderPanelHeader v-model:is-limit-exchange-mode="isLimitExchangeMode" />

    <!-- table -->
    <div class="grid gap-x-8 p-8 grid-cols-5 flex-1">
      <OrderList
        :askOrders="askOrders"
        :bidOrders="bidOrders"
        class="col-span-3 self-stretch"
        @use-buy-price="(price: number, orderId: string) => setUseBuyPrice(price, orderId)"
        @use-sell-price="(price: number, orderId: string) => setUseSellPrice(price, orderId)"
      />

      <!-- operate panel -->
      <div class="col-span-2 flex flex-col" v-if="isLimitExchangeMode">
        <div
          class="-mx-4 -mt-4 rounded-lg bg-zinc-800 p-4 shadow-md shadow-orange-300/20 flex-1 flex flex-col"
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
            class="mt-8 flex-1 flex flex-col"
            as="div"
            @change="limitExchangeType = $event === 0 ? 'bid' : 'ask'"
            :default-index="limitExchangeType === 'bid' ? 0 : 1"
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
                ]"
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

            <TabPanels class="mt-8 flex-1">
              <!-- bid panel -->
              <TabPanel class="h-full flex flex-col justify-between">
                <div class="grow relative">
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
                          :placeholder="unit"
                          :value="
                            useBtcUnit
                              ? new Decimal(bidExchangePrice)
                                  .dividedBy(1e8)
                                  .toDP()
                                  .toFixed()
                              : bidExchangePrice
                          "
                          @input="(event: any) => updateExchangePrice(event.target.value, 'bid')"
                        />
                        <span
                          class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"
                        >
                          {{ unit }}
                        </span>
                      </div>
                    </div>

                    <div
                      class="cursor-pointer pt-2 text-right text-xs text-zinc-500"
                      v-if="marketPrice"
                      @click="
                        bidExchangePrice = deviatePrice(marketPrice!, 0.99)
                      "
                      title="Use market price"
                    >
                      {{
                        `Market Price: ${prettyBalance(
                          marketPrice,
                          useBtcUnit
                        )} ${unit}`
                      }}
                    </div>
                  </div>

                  <!-- estimate -->

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
                        class="max-w-[67%] grow"
                      >
                        <ListboxButton
                          class="relative w-full rounded bg-zinc-700 py-2 pl-3 pr-20 text-right text-sm focus:outline-none"
                        >
                          <span class="block truncate">
                            {{ selectedBidCandidate?.coinAmount || '-' }}
                          </span>

                          <span
                            class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"
                          >
                            <span class="uppercase"
                              >${{ selectedPair.fromSymbol }}</span
                            >
                            <ChevronsUpDownIcon
                              class="h-5 w-5"
                              aria-hidden="true"
                            />
                          </span>
                        </ListboxButton>

                        <ListboxOptions
                          class="absolute z-10 mt-4 max-h-60 w-full left-0 overflow-auto rounded-md border border-zinc-500 bg-zinc-800 p-2 pr-4 text-sm focus:outline-none grid grid-cols-2 gap-2"
                        >
                          <ListboxOption
                            v-if="!bidCandidates?.length"
                            :disabled="true"
                            class="text-right text-zinc-500 text-sm py-2 col-span-2"
                          >
                            No liquidity provided.
                          </ListboxOption>

                          <div
                            class="col-span-2 text-zinc-300 px-2 py-1"
                            v-else
                          >
                            Select Liquidity
                          </div>
                          <div
                            class="col-span-2 text-zinc-500 px-2 text-sm"
                            v-if="usableBidCandidates.length <= 0"
                          >
                            🥹 No liquidity is available since the liquidity used
                            must have a price higher than current market price.
                          </div>
                          <ListboxOption
                            v-for="bidCandidate in usableBidCandidates"
                            v-slot="{ active, selected }"
                            as="template"
                            :key="bidCandidate.inscriptionId"
                            :value="bidCandidate"
                          >
                            <li
                              class="relative flex cursor-pointer items-center justify-between rounded py-2 pl-2 pr-10 transition bg-black"
                              :class="[
                                active && 'bg-orange-500/20',
                                selected && 'shadow-md shadow-orange-300/30',
                              ]"
                              :title="bidCandidate?.poolOrderId"
                            >
                              <div class="flex items-center">
                                <!-- liquidity race status  -->
                                <span class="relative flex h-2 w-2 mr-4">
                                  <span
                                    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 blur-xs"
                                    v-if="bidCandidate.bidCount === 0"
                                  ></span>
                                  <span
                                    class="relative inline-flex rounded-full h-2 w-2"
                                    :class="{
                                      'bg-green-500':
                                        bidCandidate.bidCount === 0,
                                      'bg-yellow-500':
                                        bidCandidate.bidCount > 0 &&
                                        bidCandidate.bidCount < 5,
                                      'bg-red-500': bidCandidate.bidCount >= 5,
                                    }"
                                  ></span>
                                </span>

                                <div class="space-y-0.5">
                                  <div :class="selected && 'text-orange-300'">
                                    {{ bidCandidate.coinAmount }}
                                  </div>
                                </div>
                              </div>

                              <span
                                v-if="selected"
                                class="absolute inset-y-0 right-0 flex items-center pr-3 text-orange-300"
                              >
                                <CheckIcon class="h-5 w-5" aria-hidden="true" />
                              </span>
                            </li>
                          </ListboxOption>

                          <Disclosure
                            as="div"
                            class="mt-4 col-span-2"
                            v-if="unusableBidCandidates.length > 0"
                          >
                            <DisclosureButton
                              class="text-left mb-2 text-zinc-300 pl-2 flex items-center gap-1"
                              v-slot="{ open }"
                            >
                              <span>
                                Unusable Liquidity ({{
                                  unusableBidCandidates.length
                                }})
                              </span>
                              <ChevronRightIcon
                                :class="[
                                  'h-4 w-4 text-zinc-400 transform duration-200',
                                  open && 'rotate-90',
                                ]"
                                aria-hidden="true"
                              />
                            </DisclosureButton>

                            <DisclosurePanel class="grid grid-cols-2 gap-2">
                              <ListboxOption
                                v-for="bidCandidate in unusableBidCandidates"
                                v-slot="{ active, selected }"
                                as="template"
                                :key="bidCandidate.inscriptionId"
                                :value="bidCandidate"
                                :disabled="true"
                              >
                                <li
                                  class="relative flex cursor-not-allowed items-center justify-between rounded py-2 pl-2 pr-10 transition bg-black opacity-30"
                                  :title="bidCandidate?.poolOrderId"
                                >
                                  <div class="flex items-center">
                                    <!-- liquidity race status  -->
                                    <span class="relative flex h-2 w-2 mr-4">
                                      <span
                                        class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 blur-xs"
                                        v-if="bidCandidate.bidCount === 0"
                                      ></span>
                                      <span
                                        class="relative inline-flex rounded-full h-2 w-2"
                                        :class="{
                                          'bg-green-500':
                                            bidCandidate.bidCount === 0,
                                          'bg-yellow-500':
                                            bidCandidate.bidCount > 0 &&
                                            bidCandidate.bidCount < 5,
                                          'bg-red-500':
                                            bidCandidate.bidCount >= 5,
                                        }"
                                      ></span>
                                    </span>

                                    <div class="space-y-0.5">
                                      <div
                                        :class="selected && 'text-orange-300'"
                                      >
                                        {{ bidCandidate.coinAmount }}
                                      </div>
                                    </div>
                                  </div>

                                  <span
                                    v-if="selected"
                                    class="absolute inset-y-0 right-0 flex items-center pr-3 text-orange-300"
                                  >
                                    <CheckIcon
                                      class="h-5 w-5"
                                      aria-hidden="true"
                                    />
                                  </span>
                                </li>
                              </ListboxOption>
                            </DisclosurePanel>
                          </Disclosure>
                        </ListboxOptions>
                      </Listbox>
                    </div>
                  </div>
                </div>

                <div class="">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-zinc-500">Total</span>
                    <span class="text-zinc-300">
                      {{
                        `${prettyBalance(
                          bidTotalExchangePrice,
                          useBtcUnit
                        )} ${unit}`
                      }}
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
              <TabPanel class="h-full flex flex-col justify-between">
                <div class="">
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
                          :placeholder="unit"
                          :value="
                            useBtcUnit
                              ? new Decimal(askExchangePrice)
                                  .dividedBy(1e8)
                                  .toDP()
                                  .toFixed()
                              : askExchangePrice
                          "
                          @input="(event: any) => updateExchangePrice(event.target.value, 'ask')"
                        />
                        <span
                          class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"
                        >
                          {{ unit }}
                        </span>
                      </div>
                    </div>

                    <div
                      class="cursor-pointer pt-2 text-right text-xs text-zinc-500"
                      v-if="marketPrice"
                      @click="
                        askExchangePrice = deviatePrice(marketPrice!, 1.01)
                      "
                      title="Use market price"
                    >
                      {{
                        `Market Price: ${prettyBalance(
                          marketPrice,
                          useBtcUnit
                        )} ${unit}`
                      }}
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
                          :placeholder="'$' + selectedPair.fromSymbol"
                          v-model.number="askExchangeOrdiAmount"
                        />
                        <span
                          class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 uppercase"
                        >
                          ${{ selectedPair.fromSymbol }}
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
                              ${{ selectedPair.fromSymbol }}
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
                      :title="`Sell all $${selectedPair.fromSymbol.toUpperCase()}`"
                    >
                      {{
                        `Balance: ${ordiBalance} $${selectedPair.fromSymbol.toUpperCase()}`
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
                </div>

                <!-- buy -->
                <div class="">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-zinc-500">Total</span>
                    <span class="text-zinc-300">
                      {{
                        `${prettyBalance(
                          askTotalExchangePrice,
                          useBtcUnit
                        )} ${unit}`
                      }}
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

      <div class="col-span-2 flex flex-col" v-else>
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

          <TabPanels class="mt-8 flex-1">
            <!-- buy panel -->
            <TabPanel class="flex flex-col justify-between h-full">
              <div class="">
                <div
                  class="flex items-center justify-between rounded-md border border-zinc-500 p-2"
                >
                  <div class="flex items-center">
                    <img :src="btcIcon" alt="btc icon" class="h-6 w-6" />
                    <span class="ml-2 text-zinc-500">Price</span>
                  </div>

                  <div class="relative max-w-[67%] grow">
                    <div class="w-full py-2 pl-2 pr-12 text-right outline-none">
                      {{ prettyBalance(useBuyPrice, useBtcUnit) }}
                    </div>
                    <span
                      class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"
                    >
                      {{ unit }}
                    </span>
                  </div>
                </div>

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
                        <span class="uppercase"
                          >${{ selectedPair.fromSymbol }}</span
                        >
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
                            {{
                              prettyBalance(
                                Number(psbt.coinRatePrice),
                                useBtcUnit
                              )
                            }}
                            {{ unit }}
                          </span>
                          <span :class="selected && 'text-orange-300'">
                            {{ psbt.coinAmount }}
                          </span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </Listbox>
                </div>
              </div>

              <!-- buy -->
              <div class="">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-zinc-500">Total</span>
                  <span class="text-zinc-300">{{ buyTotal }}</span>
                </div>

                <div class="flex items-center justify-between text-sm">
                  <span class="text-zinc-500">Gas</span>
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
                  Buy ${{ selectedPair.fromSymbol.toUpperCase() }}
                </button>
              </div>
            </TabPanel>

            <!-- sell panel -->
            <TabPanel class="flex flex-col justify-between h-full">
              <div class="">
                <div
                  class="flex items-center justify-between rounded-md border border-zinc-500 p-2"
                >
                  <div class="flex items-center">
                    <img :src="btcIcon" alt="btc icon" class="h-6 w-6" />
                    <span class="ml-2 text-zinc-500">Price</span>
                  </div>

                  <div class="relative max-w-[67%] grow">
                    <div class="w-full py-2 pl-2 pr-12 text-right outline-none">
                      {{ prettyBalance(useSellPrice, useBtcUnit) }}
                    </div>
                    <span
                      class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"
                    >
                      {{ unit }}
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
                        <span class="uppercase"
                          >${{ selectedPair.fromSymbol }}</span
                        >
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
                            {{
                              prettyBalance(
                                Number(psbt.coinRatePrice),
                                useBtcUnit
                              )
                            }}
                            {{ unit }}
                          </span>
                          <span :class="selected && 'text-orange-300'">
                            {{ psbt.coinAmount }}
                          </span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </Listbox>
                </div>
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
                <div class="flex items-center justify-between text-sm">
                  <span class="text-zinc-500">Gas</span>
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
                  Sell ${{ selectedPair.fromSymbol.toUpperCase() }}
                </button>
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
