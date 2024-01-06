<script lang="ts" setup>
import { computed, inject, onMounted, ref, toRaw } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@headlessui/vue'
import { Loader, ArrowDownIcon, HelpCircleIcon } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'

import { prettyAddress, prettyCoinDisplay } from '@/lib/formatters'
import { pushAddLiquidity } from '@/queries/pool'
import { useBtcJsStore } from '@/stores/btcjs'
import { useConnectionStore } from '@/stores/connection'
import { useNetworkStore } from '@/stores/network'
import { BTC_POOL_MODE, DEBUG } from '@/data/constants'
import { defaultPoolPair, selectedPoolPairKey } from '@/data/trading-pairs'
import assets from '@/data/assets'

const connectionStore = useConnectionStore()
const networkStore = useNetworkStore()

const confirmButtonRef = ref<HTMLElement | null>(null)
const cancelButtonRef = ref<HTMLElement | null>(null)

// modal control
const props = defineProps([
  'isOpen',
  'isBuilding',
  'builtInfo',
  'builtBtcInfo',
  'buildProcessTip',
  'selectedMultiplier',
])
const emit = defineEmits([
  'update:isOpen',
  'update:isBuilding',
  'update:builtInfo',
  'update:builtBtcInfo',
  'confirm',
])
function clearBuiltInfo() {
  emit('update:builtInfo', undefined)
  emit('update:builtBtcInfo', undefined)
}

const selectedPair = inject(selectedPoolPairKey, defaultPoolPair)

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

async function submitOrder() {
  const builtInfo = toRaw(props.builtInfo)
  try {
    const toSigns = []
    toSigns.push(builtInfo.order.toHex())
    if (props.builtBtcInfo) {
      if (props.builtBtcInfo.separatePsbt) {
        toSigns.push(props.builtBtcInfo.separatePsbt.toHex())
      }
      toSigns.push(toRaw(props.builtBtcInfo).order.toHex())
    }
    // 1. sign
    const signedPsbts = await connectionStore.adapter.signPsbts(
      toSigns,
      toSigns.map(() => {})
    )

    let preTxRaw: string | undefined
    if (props.builtBtcInfo?.separatePsbt) {
      // push separate psbt
      const pushSeparateRes = await connectionStore.adapter.pushPsbt(
        signedPsbts[1]
      )
    }

    // extract btc tx and get its txid
    const bidirectional = !!props.builtBtcInfo
    if (bidirectional && signedPsbts.length < 2) {
      throw new Error(
        'Invalid signed transaction. Please try again or contact customer service for assistance.'
      )
    }
    let btcTxOutputLocation: string = ''
    if (bidirectional && BTC_POOL_MODE !== 1) {
      // needed when in custody and cascade mode
      const btcjs = useBtcJsStore().get!
      const btcTx = btcjs.Psbt.fromHex(
        signedPsbts[signedPsbts.length - 1]
      ).extractTransaction()
      const btcTxid = btcTx.getId()
      btcTxOutputLocation = btcTxid + '_0'
    }

    let pushRes: any
    // 2. push
    switch (builtInfo!.type) {
      case 'add-liquidity':
        type LiquidityOffer = Parameters<typeof pushAddLiquidity>[0]
        const liquidityOffer: LiquidityOffer = {
          address: connectionStore.getAddress,
          amount: builtInfo.toValue.toNumber(),
          btcUtxoId:
            bidirectional && BTC_POOL_MODE !== 1
              ? btcTxOutputLocation
              : undefined,
          psbtRaw: bidirectional
            ? signedPsbts[signedPsbts.length - 1]
            : undefined,
          preTxRaw: preTxRaw || undefined,
          coinAmount: builtInfo.fromValue.toNumber(),
          coinPsbtRaw: signedPsbts[0],
          net: networkStore.network,
          pair: `${selectedPair.fromSymbol.toUpperCase()}_${selectedPair.toSymbol.toUpperCase()}`,
          tick: selectedPair.fromSymbol,
          poolState: 1,
          poolType: bidirectional ? 3 : 1,
          btcPoolMode: bidirectional ? BTC_POOL_MODE : undefined,
          ratio: bidirectional ? props.selectedMultiplier * 10 : undefined,
        }
        pushRes = await pushAddLiquidity(liquidityOffer)
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
    return
  }

  // Show success message
  emit('update:isOpen', false)
  clearBuiltInfo()

  ElMessage({
    message: `${builtInfo.type} order completed!`,
    type: 'success',
    onClose: () => {
      // reload
      if (!DEBUG) {
        window.location.reload()
      } else {
        emit('confirm')
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
          :class="[
            'w-full transform overflow-hidden rounded-2xl bg-zinc-800 p-6 align-middle shadow-lg shadow-orange-200/10 transition-all',
            builtBtcInfo ? 'max-w-3xl' : 'max-w-lg',
          ]"
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
              <div class="flex items-center gap-4">
                <span class="text-zinc-500">Order Type</span>
                <span class="font-bold uppercase text-orange-300">
                  {{
                    builtBtcInfo
                      ? 'bidirectional ' + builtInfo.type
                      : builtInfo.type
                  }}
                </span>
              </div>

              <div
                :class="[
                  'mt-8',
                  builtBtcInfo &&
                    'grid grid-cols-2 divide-x-2 divide-zinc-900 divide-dashed',
                ]"
              >
                <!-- brc to btc side -->
                <div :class="['space-y-2', builtBtcInfo && 'pr-4']">
                  <div
                    class="flex items-center gap-2 mb-4 justify-center"
                    v-if="builtBtcInfo"
                  >
                    <h3 class="text-center text-orange-300">
                      ${{ builtInfo.fromSymbol.toUpperCase() + ' Liquidity' }}
                    </h3>
                    <el-popover
                      placement="bottom"
                      :width="400"
                      trigger="hover"
                      content="You provide BRC20 liquidity to the pool by signing a PSBT."
                      popper-class="!bg-zinc-800 !text-zinc-300 !shadow-lg !shadow-orange-400/10"
                    >
                      <template #reference>
                        <HelpCircleIcon
                          class="h-4 w-4 text-zinc-400 hover:!text-orange-300"
                          aria-hidden="true"
                        />
                      </template>
                    </el-popover>
                  </div>

                  <div class="flex items-center gap-4">
                    <img
                      :src="getIconFromSymbol(builtInfo.fromSymbol)"
                      alt=""
                      class="h-8 w-8 rounded-full"
                    />

                    <div class="flex flex-col items-start gap-1">
                      <span>
                        {{
                          prettyCoinDisplay(
                            builtInfo.fromValue,
                            '$' + builtInfo.fromSymbol
                          )
                        }}
                      </span>
                      <span class="text-zinc-500 text-left">
                        {{ prettyAddress(builtInfo.fromAddress) + ' (You)' }}
                      </span>
                    </div>
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
                    <div class="flex flex-col items-start gap-1">
                      <span>
                        {{
                          prettyCoinDisplay(
                            builtInfo.toValue,
                            builtInfo.toSymbol
                          )
                        }}
                      </span>
                      <span class="text-zinc-500 text-left">
                        {{ prettyAddress(builtInfo.toAddress) + ' (You)' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- btc to brc side -->
                <div class="space-y-2 pl-4" v-if="builtBtcInfo">
                  <div class="flex items-center gap-2 mb-4 justify-center">
                    <h3 class="text-center text-orange-300">
                      {{ 'BTC Liquidity' }}
                    </h3>
                    <el-popover
                      placement="bottom"
                      :width="400"
                      trigger="hover"
                      content="You provide BTC liquidity to the pool by offering a PSBT which spends the BTC UTXO. Once the liquidity is used, the BTC will send back to your address automatically."
                      popper-class="!bg-zinc-800 !text-zinc-300 !shadow-lg !shadow-orange-400/10"
                    >
                      <template #reference>
                        <HelpCircleIcon
                          class="h-4 w-4 text-zinc-400 hover:!text-orange-300"
                          aria-hidden="true"
                        />
                      </template>
                    </el-popover>
                  </div>

                  <div class="flex items-center gap-4">
                    <img
                      :src="getIconFromSymbol('BTC')"
                      alt=""
                      class="h-8 w-8 rounded-full"
                    />
                    <div class="flex flex-col items-start gap-1">
                      <span>
                        {{ prettyCoinDisplay(builtBtcInfo.totalAmount, 'btc') }}
                      </span>
                      <span class="text-zinc-500 text-left">
                        {{ prettyAddress(builtBtcInfo.fromAddress) + ' (You)' }}
                      </span>
                    </div>
                  </div>

                  <div class="ml-1">
                    <ArrowDownIcon class="h-6 w-6 text-zinc-300" />
                  </div>

                  <div class="flex items-center gap-4">
                    <img
                      :src="getIconFromSymbol(builtBtcInfo.toSymbol)"
                      alt=""
                      class="h-8 w-8 rounded-full"
                    />
                    <div class="flex flex-col items-start gap-1">
                      <span>
                        {{
                          prettyCoinDisplay(
                            builtBtcInfo.amount,
                            builtBtcInfo.toSymbol
                          )
                        }}
                      </span>
                      <span class="text-zinc-500 text-left">
                        {{
                          prettyAddress(builtBtcInfo.toAddress) +
                          ' (Service Address)'
                        }}
                      </span>
                    </div>
                  </div>
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
