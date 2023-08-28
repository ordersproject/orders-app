<script lang="ts" setup>
import { inject, onMounted, ref, toRaw } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@headlessui/vue'
import { Loader, ArrowDownIcon, RefreshCcwIcon } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'

import { prettyAddress, prettyCoinDisplay } from '@/lib/formatters'
import { pushAddLiquidity } from '@/queries/pool'
import { useAddressStore, useCooldownerStore, useNetworkStore } from '@/store'
import { DEBUG } from '@/data/constants'
import { defaultPair, selectedPairKey } from '@/data/trading-pairs'
import assets from '@/data/assets'

const unisat = window.unisat

const addressStore = useAddressStore()
const networkStore = useNetworkStore()

const confirmButtonRef = ref<HTMLElement | null>(null)
const cancelButtonRef = ref<HTMLElement | null>(null)

// modal control
const props = defineProps([
  'isOpen',
  'isBuilding',
  'builtInfo',
  'buildProcessTip',
])
const emit = defineEmits([
  'update:isOpen',
  'update:isBuilding',
  'update:builtInfo',
])
function clearBuiltInfo() {
  emit('update:builtInfo', undefined)
}

const selectedPair = inject(selectedPairKey, defaultPair)

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
    // 1. sign
    const signed = await unisat.signPsbt(builtInfo.order.toHex())
    console.log({ signed })

    let pushRes: any
    // 2. push
    switch (builtInfo!.type) {
      case 'add-liquidity':
        type LiquidityOffer = Parameters<typeof pushAddLiquidity>[0]
        const liquidityOffer: LiquidityOffer = {
          address: addressStore.get!,
          amount: builtInfo.toValue.toNumber(),
          // psbtRaw: signed.psbt,
          coinAmount: builtInfo.fromValue.toNumber(),
          coinPsbtRaw: signed,
          net: networkStore.network,
          pair: `${selectedPair.fromSymbol.toUpperCase()}_${selectedPair.toSymbol.toUpperCase()}`,
          tick: selectedPair.fromSymbol,
          poolState: 1,
          poolType: 1,
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
              <div class="flex items-center gap-4">
                <span class="text-zinc-500">Order Type</span>
                <span class="font-bold uppercase text-orange-300">
                  {{ builtInfo.type }}
                </span>
              </div>

              <div class="space-y-2 mt-6">
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
                          builtInfo.fromSymbol
                        )
                      }}
                    </span>
                    <span class="text-zinc-500">
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
                        prettyCoinDisplay(builtInfo.toValue, builtInfo.toSymbol)
                      }}
                    </span>
                    <span class="text-zinc-500">
                      {{
                        prettyAddress(builtInfo.toAddress) +
                        ' (MultiSig Address)'
                      }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- <div class="mt-8 grid grid-cols-2 gap-4">
                <div class="col-span-2">
                  <div class="my-4 w-16 border-t border-zinc-700"></div>
                </div>
                <div class="text-left text-zinc-500">Total Price</div>
                <div class="col-span-1 text-right">
                  <span>
                    {{ prettyBtcDisplay(builtInfo.totalPrice) }}
                  </span>
                </div>

                <div class="text-left text-zinc-500">Network Fee</div>
                <div class="col-span-1 text-right">
                  {{ prettyBtcDisplay(builtInfo.networkFee) }}
                </div>

                <div class="text-left text-zinc-500">Service Fee</div>
                <div class="col-span-1 text-right">
                  <span>
                    {{ prettyBtcDisplay(builtInfo.serviceFee) }}
                  </span>
                </div>
              </div> -->
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
