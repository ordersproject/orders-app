<script lang="ts" setup>
import { Ref, computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { LoaderIcon } from 'lucide-vue-next'

import { sleep } from '@/lib/helpers'
import { buildClaimTake } from '@/lib/order-builder'
import { getOneClaim, updateClaim } from '@/queries/orders-api'
import { useAddressStore } from '@/store'

import ClaimingOverlay from '@/components/overlays/Claiming.vue'

const router = useRouter()
const addressStore = useAddressStore()

const claimingAddress = ref('')
// If it's not currently connected, warn and redirect to home
sleep(1000).then(() => {
  const address = addressStore.get
  if (!address) {
    ElMessage.warning({
      message: 'Please connect to Unisat',
      type: 'warning',
      onClose: () => {
        router.push('/')
      },
    })
  } else {
    claimingAddress.value = address
  }
})

const theClaim: Ref<null | Awaited<ReturnType<typeof getOneClaim>>> = ref(null)
const queryingClaim = ref(false)
const hasClaim = computed(
  () => !!theClaim.value && theClaim.value.coinAmount > 0
)
const claimableDisplay = computed(() => {
  const balance = theClaim.value?.coinAmount
  if (!balance) {
    return '-'
  }

  let display = balance.toString() + ' RDEX'

  if (theClaim.value?.availableCount) {
    display = display + ' ✖️ ' + theClaim.value.availableCount.toString()
  }

  return display
})

// watch the address; if it changes, refetch the claim
watch(
  claimingAddress,
  async (newAddress) => {
    if (!newAddress) {
      return
    }

    queryingClaim.value = true
    const claim = await getOneClaim({
      address: newAddress,
    }).catch((err) => {
      if (
        err?.message &&
        typeof err.message === 'string' &&
        err.message.includes('Claim Order is empty')
      ) {
        return
      }

      ElMessage.error(err.message)
    })

    if (claim) {
      theClaim.value = claim
    }
    queryingClaim.value = false
  },
  { immediate: true }
)

const claiming = ref(false)
async function claim() {
  if (!claimingAddress.value) {
    return
  }

  claiming.value = true
  if (!theClaim.value) {
    ElMessage.warning({
      message: 'No claim available',
      type: 'warning',
    })
    claiming.value = false
    return
  }

  if (theClaim.value.coinAmount <= 0) {
    ElMessage.warning({
      message: 'No RDEX to claim',
      type: 'warning',
    })
    claiming.value = false
    return
  }

  // build the ask order based on claim's psbtRaw
  const claimPsbtRaw = theClaim.value.psbtRaw
  const { order } = await buildClaimTake({
    claimPsbtRaw,
  }).catch((err) => {
    ElMessage.warning({
      message: err.message,
      duration: 5000,
    })

    claiming.value = false
    throw err
  })

  // sign
  const signed = await window.unisat.signPsbt(order.toHex())
  console.log({ signed })

  if (!signed) {
    ElMessage.error({
      message: 'Failed to sign the claim transaction',
    })
    claiming.value = false
    return
  }

  // update
  await updateClaim({
    address: claimingAddress.value,
    psbtRaw: signed,
    orderId: theClaim.value.orderId,
  }).catch((err) => {
    ElMessage.error({
      message: err.message,
    })

    claiming.value = false
    throw err
  })

  ElMessage.success({
    message: `Claimed ${theClaim.value.coinAmount} RDEX`,
    type: 'success',
  })

  theClaim.value = null
  claiming.value = false
}
</script>

<template>
  <ClaimingOverlay v-if="claiming" />

  <div
    class="border border-zinc-300 rounded-xl mx-auto mt-[25vh] w-[60vw] max-w-2xl p-8 text-zinc-300"
  >
    <div class="space-y-10">
      <div class="flex flex-col gap-y-2">
        <div class="">Your Address</div>
        <input
          type="text"
          placeholder="address"
          class="w-full rounded bg-zinc-800 p-2 placeholder-zinc-500 outline-none border border-zinc-700 text-sm"
          v-model="claimingAddress"
          name="address"
          autocomplete="off"
        />
      </div>

      <div class="text-center text-xl flex items-center gap-2 justify-center">
        <span class="text-zinc-500">Available:</span>

        <LoaderIcon
          v-if="queryingClaim"
          class="h-4 w-4 text-zinc-300 animate-spin-slow"
        />
        <span v-else>{{ claimableDisplay }}</span>
      </div>

      <div class="">
        <button
          :class="[
            'w-full rounded-md py-3 font-bold',
            hasClaim
              ? 'cursor-pointer bg-orange-300 text-orange-900'
              : 'cursor-not-allowed bg-zinc-700 text-zinc-500',
          ]"
          :disabled="!hasClaim"
          @click="claim"
        >
          Claim
        </button>
      </div>
    </div>
  </div>
</template>
