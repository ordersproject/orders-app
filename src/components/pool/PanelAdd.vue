<script lang="ts" setup>
import { Ref, computed, inject, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-vue-next'
import { useQuery } from '@tanstack/vue-query'
import Decimal from 'decimal.js'

import { defaultPair, selectedPoolPairKey } from '@/data/trading-pairs'
import { useAddressStore, useNetworkStore } from '@/store'
import { DEBUG } from '@/data/constants'
import {
  Brc20Transferable,
  getMarketPrice,
  getOneBrc20,
} from '@/queries/orders-api'
import { buildAddLiquidity } from '@/lib/order-pool-builder'
import { sleep } from '@/lib/helpers'
import { getMyPooledInscriptions } from '@/queries/pool'

import OrderConfirmationModal from './PoolConfirmationModal.vue'

const addressStore = useAddressStore()
const networkStore = useNetworkStore()
const selectedPair = inject(selectedPoolPairKey, defaultPair)

const { data: myPoolableBrc20s } = useQuery({
  queryKey: [
    'myPoolableBrc20s',
    {
      address: addressStore.get,
      network: networkStore.network,
      tick: selectedPair.fromSymbol,
    },
  ],
  queryFn: () =>
    Promise.all([
      getOneBrc20({
        address: addressStore.get!,
        tick: selectedPair.fromSymbol,
      }),
      getMyPooledInscriptions({
        address: addressStore.get!,
        tick: selectedPair.fromSymbol,
      }),
    ]).then(([allBrc20s, pooledBrc20s]) => {
      console.log({
        allBrc20s,
        pooledBrc20s,
      })
      // filter out pooled brc20s
      const poolableBrc20s = allBrc20s.transferBalanceList.filter((brc20) => {
        return !pooledBrc20s.some(
          (pooledBrc20) => pooledBrc20.inscriptionId === brc20.inscriptionId
        )
      })

      return poolableBrc20s
    }),
  enabled: computed(
    () => networkStore.network !== 'testnet' && !!addressStore.get
  ),
})
const selected: Ref<undefined | Brc20Transferable> = ref()

const { data: marketPrice } = useQuery({
  queryKey: [
    'marketPrice',
    { network: networkStore.network, tick: selectedPair.fromSymbol },
  ],
  queryFn: () =>
    getMarketPrice({ tick: selectedPair.fromSymbol }).then((res) => {
      if (DEBUG) return 0.00000002 // TODO: remove this
      return res
    }),
})

const multipliers = [1.5, 1.8, 2]
const selectedMultiplier = ref(multipliers[0])

const providesBtc = ref(false)

const reversePrice = computed(() => {
  if (!selected.value) return 0

  // prevent float number precision problem
  return (
    Number(selected.value.amount) *
    (selectedMultiplier.value ? selectedMultiplier.value : 1.5) *
    (marketPrice.value ? marketPrice.value : 0)
  ).toFixed(8)
})

const builtInfo = ref<
  undefined | Awaited<ReturnType<typeof buildAddLiquidity>>
>()
const isOpenConfirmationModal = ref(false)
const isBuilding = ref(false)
const buildProcessTip = ref('Building Transaction...')
async function submitAdd() {
  if (!selected.value) return

  isOpenConfirmationModal.value = true
  isBuilding.value = true

  const builtRes = await buildAddLiquidity({
    total: new Decimal(reversePrice.value).times(1e8),
    amount: new Decimal(selected.value.amount),
    selectedPair: selectedPair,
  }).catch(async (e) => {
    await sleep(500)
    console.log(e)

    ElMessage.error(e.message)
    builtInfo.value = undefined
  })

  isBuilding.value = false

  if (!builtRes) return
  builtInfo.value = builtRes
  console.log({ builtRes })

  return
}
</script>

<template>
  <div class="max-w-md mx-auto">
    <form action="" class="flex flex-col min-h-[40vh]">
      <Listbox
        as="div"
        v-model="selected"
        class="grid items-center gap-x-6 justify-center grid-cols-6"
      >
        <ListboxLabel
          class="block text-base font-medium leading-6 text-zinc-300 uppercase col-span-1"
        >
          {{ selectedPair.fromSymbol }}
        </ListboxLabel>

        <div class="relative col-span-5">
          <ListboxButton
            class="relative w-full rounded-md bg-zinc-800 py-2 pl-3 pr-10 text-left text-zinc-300 shadow-sm ring-1 ring-inset ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400 sm:text-sm sm:leading-6"
          >
            <span class="block truncate">
              {{ selected ? selected.amount : '-' }}
            </span>
            <span
              class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"
            >
              <ChevronsUpDownIcon
                class="h-5 w-5 text-zinc-400"
                aria-hidden="true"
              />
            </span>
          </ListboxButton>

          <transition
            leave-active-class="transition ease-in duration-100"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <ListboxOptions
              class="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-zinc-800 py-1 text-base shadow-lg ring-1 ring-zinc-700 ring-inset focus:outline-none sm:text-sm"
              v-if="typeof myPoolableBrc20s === 'object'"
            >
              <ListboxOption
                v-if="myPoolableBrc20s.length === 0"
                :disabled="true"
                class="text-right text-zinc-500 text-sm py-2 px-4"
              >
                No poolable {{ selectedPair.fromSymbol.toUpperCase() }}
              </ListboxOption>

              <ListboxOption
                as="template"
                v-for="transferable in myPoolableBrc20s"
                :key="transferable.inscriptionId"
                :value="transferable"
                v-slot="{ active, selected }"
              >
                <li
                  :class="[
                    active ? 'bg-orange-300 text-orange-900' : 'text-zinc-300',
                    'relative  select-none py-2 pl-3 pr-9',
                  ]"
                >
                  <span
                    :class="[
                      selected ? 'font-semibold' : 'font-normal',
                      'block truncate',
                    ]"
                    >{{ transferable.amount }}</span
                  >

                  <span
                    v-if="selected"
                    :class="[
                      active ? 'text-white' : 'text-orange-400',
                      'absolute inset-y-0 right-0 flex items-center pr-4',
                    ]"
                  >
                    <CheckIcon class="h-5 w-5" aria-hidden="true" />
                  </span>
                </li>
              </ListboxOption>
            </ListboxOptions>
          </transition>
        </div>
      </Listbox>

      <!-- <SwitchGroup>
        <div class="flex items-center mt-8">
          <Switch
            v-model="providesBtc"
            :class="[
              providesBtc ? 'bg-orange-400' : 'bg-orange-200/10',
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 ring-offset-zinc-900',
            ]"
          >
            <span class="sr-only">Also Provide BTC Liquidity</span>
            <span
              :class="[
                providesBtc
                  ? 'translate-x-5 bg-zinc-300'
                  : 'translate-x-0 bg-zinc-600',
                'pointer-events-none relative inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out',
              ]"
            >
              <span
                :class="[
                  providesBtc
                    ? 'opacity-100 duration-200 ease-in'
                    : 'opacity-0 duration-100 ease-out',
                  'absolute inset-0 flex h-full w-full items-center justify-center transition-opacity',
                ]"
                aria-hidden="true"
              >
                <CheckIcon class="h-3 w-3 text-orange-950" aria-hidden="true" />
              </span>
            </span>
          </Switch>

          <SwitchLabel class="text-zinc-300 text-sm ml-4">
            Also Provide BTC Liquidity
          </SwitchLabel>

          <el-popover
            placement="bottom"
            title="What does it mean?"
            :width="400"
            trigger="hover"
            content="You will also provide BTC liquidity to the pool. This will gets you additional rewards."
            popper-class="!bg-zinc-800 !text-zinc-300 !shadow-lg !shadow-orange-400/10 "
          >
            <template #reference>
              <HelpCircleIcon
                class="h-4 w-4 text-zinc-300 ml-2"
                aria-hidden="true"
              />
            </template>
          </el-popover>
        </div>
      </SwitchGroup> -->

      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          :class="[
            'mt-4 grow flex items-start',
            providesBtc ? 'visible' : 'invisible',
          ]"
        >
          <div class="items-center gap-x-4 gap-y-2 grid grid-cols-6 grow">
            <div class="text-zinc-300 col-span-1">BTC</div>

            <div
              class="flex items-center justify-between col-span-5 rounded-md border px-4 py-2 border-zinc-700 text-zinc-300 shadow-sm sm:text-sm sm:leading-6 bg-zinc-800"
            >
              <div class="flex flex-col items-start gap-1">
                <span class="font-bold text-zinc-100">
                  {{ reversePrice }}
                </span>
              </div>

              <Listbox as="div" v-model="selectedMultiplier">
                <div class="relative w-20">
                  <ListboxButton
                    class="relative w-full pl-3 pr-10 text-left shadow-sm ring-1 ring-inset ring-zinc-950 focus:outline-none focus:ring-2 focus:ring-orange-400 sm:text-sm sm:leading-6 inline-flex items-center rounded px-2 text-xs text-zinc-400 bg-black py-1.5 font-bold"
                  >
                    <span class="block truncate">{{ selectedMultiplier }}</span>
                    <span
                      class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"
                    >
                      <ChevronsUpDownIcon
                        class="h-5 w-5 text-zinc-400"
                        aria-hidden="true"
                      />
                    </span>
                  </ListboxButton>

                  <transition
                    leave-active-class="transition ease-in duration-100"
                    leave-from-class="opacity-100"
                    leave-to-class="opacity-0"
                  >
                    <ListboxOptions
                      class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-zinc-950 py-1 text-base shadow-lg ring-1 ring-zinc-700 ring-opacity-5 focus:outline-none sm:text-sm"
                    >
                      <ListboxOption
                        as="template"
                        v-for="multiplier in multipliers"
                        :key="multiplier"
                        :value="multiplier"
                        v-slot="{ active, selected }"
                      >
                        <li
                          :class="[
                            active
                              ? 'bg-orange-300 text-orange-900'
                              : 'text-zinc-300',
                            'relative select-none py-2 pl-3 pr-9',
                          ]"
                        >
                          <span
                            :class="[
                              selected ? 'font-semibold' : 'font-normal',
                              'block truncate',
                            ]"
                          >
                            {{ multiplier }}
                          </span>

                          <span
                            v-if="selected"
                            :class="[
                              active ? 'text-white' : 'text-orange-400',
                              'absolute inset-y-0 right-0 flex items-center pr-2',
                            ]"
                          >
                            <CheckIcon class="h-5 w-5" aria-hidden="true" />
                          </span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>
            </div>

            <div class="col-span-1"></div>
            <div
              class="flex text-zinc-400 gap-2 text-xs col-span-5 pl-2 items-center"
            >
              <span>{{ '=' }}</span>
              <el-popover
                placement="bottom"
                trigger="hover"
                :content="marketPrice ? marketPrice.toFixed(8) + ' BTC' : '-'"
              >
                <template #reference>
                  <span
                    class="px-2 py-1 bg-black rounded cursor-pointer text-zinc-300 hover:text-orange-300 transition"
                  >
                    Market Price
                  </span>
                </template>
              </el-popover>

              <span>*</span>

              <el-popover
                placement="bottom"
                trigger="hover"
                :content="selected ? selected.amount : '-'"
              >
                <template #reference>
                  <span
                    class="px-2 py-1 bg-black rounded cursor-pointer text-zinc-300 hover:text-orange-300 transition"
                  >
                    Quantity
                  </span>
                </template>
              </el-popover>

              <span>*</span>

              <el-popover
                placement="bottom"
                trigger="hover"
                :content="
                  selectedMultiplier ? selectedMultiplier.toString() + 'x' : '-'
                "
              >
                <template #reference>
                  <span
                    class="px-2 py-1 bg-black rounded cursor-pointer text-zinc-300 hover:text-orange-300 transition"
                  >
                    Multiplier
                  </span>
                </template>
              </el-popover>
            </div>
          </div>
        </div>
      </transition>

      <div class="flex justify-center">
        <button
          class="mx-auto bg-orange-300 w-full py-3 text-orange-950 rounded-md disabled:cursor-not-allowed disabled:opacity-30"
          @click.prevent="submitAdd"
          :disabled="!selected"
        >
          Submit
        </button>
      </div>
    </form>

    <OrderConfirmationModal
      v-model:is-open="isOpenConfirmationModal"
      v-model:is-building="isBuilding"
      v-model:built-info="builtInfo"
      :build-process-tip="buildProcessTip"
    />
  </div>
</template>