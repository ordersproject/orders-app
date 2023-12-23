<script lang="ts" setup>
import { computed, inject, ref, toRaw } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@headlessui/vue'
import { Loader, ArrowDownIcon } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'

import { prettyBtcDisplay, prettyCoinDisplay } from '@/lib/formatters'
import {
  pushBidOrder,
  pushAskOrder,
  pushBuyTake,
  pushSellTake,
} from '@/queries/orders-api'
import { useBtcJsStore, useConnectionStore, useNetworkStore } from '@/stores'
import { DEBUG, SIGHASH_ALL_ANYONECANPAY } from '@/data/constants'
import { defaultPair, selectedPairKey } from '@/data/trading-pairs'
import assets from '@/data/assets'
import { useExcludedBalanceQuery } from '@/queries/excluded-balance'
import BtcHelpers, { toXOnly } from '@/lib/btc-helpers'
import { Buffer } from 'buffer'

const networkStore = useNetworkStore()

const confirmButtonRef = ref<HTMLElement | null>(null)
const cancelButtonRef = ref<HTMLElement | null>(null)

// modal control
const props = defineProps([
  'isOpen',
  'isBuilding',
  'builtInfo',
  'isLimitExchangeMode',
  'buildProcessTip',
])
const emit = defineEmits([
  'update:isOpen',
  'update:isBuilding',
  'update:builtInfo',
  'update:isLimitExchangeMode',
])
function clearBuiltInfo() {
  emit('update:builtInfo', undefined)
}

const selectedPair = inject(selectedPairKey, defaultPair)

const connectionStore = useConnectionStore()
const queries = connectionStore.queries
const { data: balance } = useExcludedBalanceQuery(
  computed(() => connectionStore.getAddress),
  computed(() => !!connectionStore.connected)
)

function getIconFromSymbol(symbol: string) {
  return (
    assets.find((asset) => asset.symbol.toUpperCase() === symbol.toUpperCase())
      ?.icon || ''
  )
}

function discardOrder() {
  emit('update:isOpen', false)
  clearBuiltInfo()
}

async function submitBidOrder() {
  const btcjs = useBtcJsStore().get!
  const builtInfo = toRaw(props.builtInfo)

  try {
    // 1. sign secondary order which is used to create the actual utxo to pay for the bid order
    console.log({ before: builtInfo.secondaryOrder.toHex() })
    const payPsbtSigned = await queries.signPsbt(
      builtInfo.secondaryOrder.toHex()
    )
    const payPsbt = btcjs.Psbt.fromHex(payPsbtSigned)
    console.log({ after: payPsbtSigned })
    console.log({ payPsbt })
    return

    // 2. now we can add that utxo to the bid order
    const bidPsbt = builtInfo.order
    bidPsbt.addInput({
      hash: payPsbt.extractTransaction().getId(),
      index: 0,
      witnessUtxo: {
        script: payPsbt.extractTransaction().outs[0].script,
        value: payPsbt.extractTransaction().outs[0].value,
      },
      sighashType: SIGHASH_ALL_ANYONECANPAY,
      tapInternalKey: toXOnly(Buffer.from(useConnectionStore().getPubKey)),
    })
    console.log(
      '🚀 ~ file: ConfirmationModal.vue:83 ~ submitBidOrder ~ bidPsbt:',
      bidPsbt
    )
    return

    // 3. we sign the bid order
    const signed = await queries.signPsbt(bidPsbt.toHex())

    // // 4. push the bid order to the api
    // const pushRes = await pushBidOrder({
    //   psbtRaw: signed,
    //   network: networkStore.ordersNetwork,
    //   address: connectionStore.getAddress,
    //   tick: selectedPair.fromSymbol,
    //   feeb: builtInfo.feeb,
    //   fee: builtInfo.mainFee,
    //   total: builtInfo.total,
    //   using: builtInfo.using,
    //   orderId: builtInfo.orderId,
    // })

    // // 5. if pushRes is not null, we can now push the secondary order to the blockchain
    // if (pushRes) {
    //   const res = await connectionStore.queries.pushPsbt(payPsbtSigned)
    // }
  } catch (err: any) {
    if (DEBUG) {
      console.error(err)
    }
    // if error message contains missingorspent / mempool-conflict, show a more user-friendly message
    if (
      err.message.includes('missingorspent') ||
      err.message.includes('mempool-conflict')
    ) {
      ElMessage.error('The order was taken. Please try another one.')
    } else {
      ElMessage.error(err.message)
    }
    emit('update:isOpen', false)
    clearBuiltInfo()
    emit('update:isLimitExchangeMode', false)
    return
  }

  // Show success message
  emit('update:isOpen', false)
  clearBuiltInfo()
  emit('update:isLimitExchangeMode', false)

  ElMessage({
    message: `${builtInfo.type} order completed!`,
    type: 'success',
    onClose: () => {
      // reload
      // if (!DEBUG) {
      window.location.reload()
      // }
    },
  })
}

async function submitOrder() {
  const builtInfo = toRaw(props.builtInfo)

  // if type if bid, we handle it differently
  if (builtInfo.type === 'bid') {
    return submitBidOrder()
  }

  try {
    // 1. sign
    console.log('before', builtInfo.order.toHex())
    const signed = await queries.signPsbt(builtInfo.order.toHex(), {
      type: 'list',
    })
    console.log('after', signed)
    return

    let pushRes: any
    // 2. push
    switch (builtInfo!.type) {
      case 'buy':
      case 'free claim':
        pushRes = await pushBuyTake({
          psbtRaw: signed,
          network: networkStore.ordersNetwork,
          orderId: builtInfo.orderId,
        })
        break
      case 'sell':
        pushRes = await pushSellTake({
          psbtRaw: signed,
          network: networkStore.ordersNetwork,
          orderId: builtInfo.orderId,
          address: connectionStore.getAddress,
          value: builtInfo.value,
          amount: builtInfo.amount,
          networkFee: builtInfo.selfFee,
          networkFeeRate: builtInfo.networkFeeRate,
        })
        break
      case 'bid':
        pushRes = await pushBidOrder({
          psbtRaw: signed,
          network: networkStore.ordersNetwork,
          address: connectionStore.getAddress,
          tick: selectedPair.fromSymbol,
          feeb: builtInfo.feeb,
          fee: builtInfo.networkFee,
          total: builtInfo.total,
          using: builtInfo.using,
          orderId: builtInfo.orderId,
        })
        break
      case 'ask':
        pushRes = await pushAskOrder({
          psbtRaw: signed,
          network: networkStore.ordersNetwork,
          address: connectionStore.getAddress,
          tick: selectedPair.fromSymbol,
          amount: builtInfo.amount,
        })
        break
    }
  } catch (err: any) {
    // if error message contains missingorspent / mempool-conflict, show a more user-friendly message
    if (
      err.message.includes('missingorspent') ||
      err.message.includes('mempool-conflict')
    ) {
      ElMessage.error('The order was taken. Please try another one.')
    } else {
      ElMessage.error(err.message)
    }
    emit('update:isOpen', false)
    clearBuiltInfo()
    emit('update:isLimitExchangeMode', false)
    return
  }

  // Start cooldowner: observe certain input utxo (payment or brc20), see if its consumption is witnessed by the network
  // cooldowner.start({
  //   observing: builtInfo.observing,
  // })

  // Show success message
  emit('update:isOpen', false)
  clearBuiltInfo()
  emit('update:isLimitExchangeMode', false)

  ElMessage({
    message: `${builtInfo.type} order completed!`,
    type: 'success',
    onClose: () => {
      // reload
      if (!DEBUG) {
        window.location.reload()
      }
    },
  })
}
</script>

<template>
  <Dialog
    :open="isOpen"
    @close="$emit('update:isOpen', false)"
    :initial-focus="cancelButtonRef"
  >
    <div class="fixed inset-0 bg-black/50 backdrop-blur"></div>

    <div class="fixed inset-0 overflow-y-auto text-zinc-300">
      <div class="flex min-h-full items-center justify-center p-4 text-center">
        <DialogPanel
          class="w-full max-w-lg transform overflow-hidden rounded-2xl bg-zinc-800 p-6 align-middle shadow-lg shadow-orange-200/10 transition-all"
        >
          <DialogTitle class="text-lg">Confirmation</DialogTitle>

          <DialogDescription as="div" class="mt-8 text-sm">
            <div
              class="mt-4 flex items-center justify-center gap-2 text-zinc-300"
              v-if="isBuilding"
            >
              <Loader class="h-4 w-4 animate-spin-slow" />
              <span>{{ buildProcessTip }}</span>
            </div>

            <div class="" v-else-if="builtInfo">
              <div class="grid grid-cols-2 items-center">
                <div class="flex items-center gap-4">
                  <span class="text-zinc-500">Order Type</span>
                  <span class="font-bold uppercase text-orange-300">
                    {{ builtInfo.type }}
                  </span>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center gap-4">
                    <img
                      :src="getIconFromSymbol(builtInfo.fromSymbol)"
                      alt=""
                      class="h-8 w-8 rounded-full"
                    />
                    <span
                      v-if="builtInfo.isFree"
                      class="font-bold text-green-500"
                    >
                      0
                    </span>
                    <span v-else>
                      {{
                        prettyCoinDisplay(
                          builtInfo.fromValue,
                          builtInfo.fromSymbol
                        )
                      }}
                    </span>
                  </div>

                  <div class="ml-1">
                    <ArrowDownIcon class="h-6 w-6 text-zinc-300" />
                  </div>

                  <div class="flex items-center gap-4">
                    <img
                      :src="getIconFromSymbol(builtInfo.toSymbol)"
                      alt=""
                      class="h-8 w-8 rounded-full"
                    />
                    <span>
                      {{
                        prettyCoinDisplay(builtInfo.toValue, builtInfo.toSymbol)
                      }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="mt-8 grid grid-cols-2 gap-4">
                <div class="text-left text-zinc-500">Total Price</div>
                <div class="col-span-1 text-right">
                  <div
                    class="flex items-center justify-end gap-2"
                    v-if="builtInfo.isFree"
                  >
                    <!-- <span class="text-zinc-500 line-through">
                        {{ prettyBtcDisplay(builtInfo.totalPrice) }}
                      </span> -->
                    <span
                      class="rounded bg-green-700/30 px-1 py-0.5 text-xs font-bold text-green-500"
                      >FREE</span
                    >
                  </div>
                  <span v-else>
                    {{ prettyBtcDisplay(builtInfo.totalPrice) }}
                  </span>
                </div>

                <div class="text-left text-zinc-500">Gas</div>
                <div class="col-span-1 text-right">
                  {{ prettyBtcDisplay(builtInfo.networkFee) }}
                </div>

                <div class="text-left text-zinc-500">Service Fee</div>
                <div class="col-span-1 text-right">
                  <div
                    class="flex items-center justify-end gap-2"
                    v-if="builtInfo.isFree"
                  >
                    <span class="text-zinc-500 line-through">
                      {{ prettyBtcDisplay(2000) }}
                    </span>
                    <span
                      class="rounded bg-green-700/30 px-1 py-0.5 text-xs font-bold text-green-500"
                      >FREE</span
                    >
                  </div>
                  <span v-else>
                    {{ prettyBtcDisplay(builtInfo.serviceFee) }}
                  </span>
                </div>

                <template v-if="builtInfo.isFree">
                  <div class="text-left text-zinc-500">Inscribe Fee</div>
                  <div class="col-span-1 text-right">
                    {{ prettyBtcDisplay(4000) }}
                  </div>
                </template>

                <div class="col-span-2">
                  <div class="my-4 w-16 border-t border-zinc-700"></div>
                </div>

                <div class="text-left text-zinc-300">You Will Spend</div>
                <div class="col-span-1 text-right">
                  {{ prettyBtcDisplay(builtInfo.totalSpent) }}
                </div>

                <div class="text-left text-zinc-300">Available Balance</div>
                <div class="col-span-1 flex items-center justify-end gap-2">
                  <span>{{ balance ? prettyBtcDisplay(balance) : '-' }}</span>
                </div>
              </div>
            </div>
          </DialogDescription>

          <div class="mt-12 flex items-center justify-center gap-4">
            <button
              @click="discardOrder"
              class="w-24 rounded border border-zinc-700 py-2 text-zinc-500"
              ref="cancelButtonRef"
            >
              Cancel
            </button>
            <button
              @click="submitOrder"
              class="w-24 rounded border border-zinc-500 py-2"
              ref="confirmButtonRef"
              v-if="builtInfo"
            >
              Confirm
            </button>
          </div>
        </DialogPanel>
      </div>
    </div>
  </Dialog>
</template>
@/stores/store
