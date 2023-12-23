<script lang="ts" setup>
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, inject, ref } from 'vue'
import { CopyIcon, HelpCircleIcon } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'

import { defaultPoolPair, selectedPoolPairKey } from '@/data/trading-pairs'
import { useBtcJsStore, useConnectionStore } from '@/stores'
import {
  claimStandbyReward,
  getMyStandbyRewardsEssential,
  getMyStandbys,
} from '@/queries/pool'
import { prettyBalance, prettyTxid } from '@/lib/formatters'
import { sleep, unit, useBtcUnit } from '@/lib/helpers'
import { buildStandbyClaim } from '@/lib/order-pool-builder'
import { DEBUG, EVENT_REWARDS_TICK } from '@/data/constants'

import StandbyExplainModal from './StandbyExplainModal.vue'
import StandbyClaimRecords from './StandbyClaimRecords.vue'

const selectedPair = inject(selectedPoolPairKey, defaultPoolPair)
const connectionStore = useConnectionStore()

const { data: standbys } = useQuery({
  queryKey: ['poolStandbys', { tick: selectedPair.fromSymbol }],
  queryFn: () => getMyStandbys({ tick: selectedPair.fromSymbol }),
  select: (data) => {
    return data
  },
  enabled: computed(() => connectionStore.connected),
})

const { data: standbyRewardsEssential, isLoading: isLoadingRewardsEssential } =
  useQuery({
    queryKey: [
      'standbyRewardsEssential',
      { address: connectionStore.getAddress, tick: selectedPair.fromSymbol },
    ],
    queryFn: () =>
      getMyStandbyRewardsEssential({
        address: connectionStore.getAddress,
        tick: selectedPair.fromSymbol,
      }),
    select: (data) => {
      return {
        ...data,
        total:
          data.totalRewardAmount +
          data.totalRewardExtraAmount -
          data.hadClaimRewardAmount,
      }
    },
    enabled: computed(() => connectionStore.connected),
  })

const queryClient = useQueryClient()
const { mutate: mutateClaimStandbyReward } = useMutation({
  mutationFn: claimStandbyReward,
  onSuccess: () => {
    ElMessage.success('Reward claimed')
    queryClient.invalidateQueries({
      queryKey: [
        'standbyRewardsEssential',
        {
          address: connectionStore.getAddress,
          tick: selectedPair.fromSymbol,
        },
      ],
    })
    queryClient.invalidateQueries({
      queryKey: [
        'standbyRewardsClaimRecords',
        { address: connectionStore.getAddress, tick: EVENT_REWARDS_TICK },
      ],
    })
  },
  onError: (err: any) => {
    ElMessage.error(err.message)
  },
})

const isBuilding = ref(false)
const isOpenConfirmationModal = ref(false)
const builtInfo = ref<void | Awaited<ReturnType<typeof buildStandbyClaim>>>()
async function onClaimReward() {
  try {
    if (!standbyRewardsEssential.value) return

    // build pay Tx
    isOpenConfirmationModal.value = true
    isBuilding.value = true

    const res = await buildStandbyClaim().catch(async (e) => {
      await sleep(500)
      console.log(e)

      ElMessage.error(e.message)
      builtInfo.value = undefined
      isOpenConfirmationModal.value = false
    })
    isBuilding.value = false
    builtInfo.value = res

    if (!res) return

    // ask unisat to sign
    const connectionsStore = useConnectionStore()
    const signed = await connectionsStore.adapter.signPsbt(res.order.toHex())
    // derive txid from signed psbt
    const bitcoinjs = useBtcJsStore().get!
    const signedPsbt = bitcoinjs.Psbt.fromHex(signed)
    const payTxid = signedPsbt.extractTransaction().getId()
    const feeRawTx = signedPsbt.extractTransaction().toHex()

    mutateClaimStandbyReward({
      rewardAmount: standbyRewardsEssential.value.total,
      tick: selectedPair.fromSymbol,
      feeSend: res.feeSend,
      feeInscription: res.feeInscription,
      networkFeeRate: res.feeb,
      feeUtxoTxId: payTxid,
      feeRawTx,
    })
  } catch (e: any) {
    if (DEBUG) {
      console.log(e)
      ElMessage.error(e.message)
    } else {
      ElMessage.error('Error while claiming reward.')
    }
  }
}

const onCopyOrderId = (orderId: string) => {
  navigator.clipboard.writeText(orderId)

  ElMessage.success('Order ID copied')
}

const isModelOpen = ref(false)
</script>

<template>
  <StandbyExplainModal v-model:is-open="isModelOpen" />

  <div class="mb-8" v-if="selectedPair.fromSymbol.toUpperCase() !== 'RDEX'">
    <!-- title -->
    <div class="flex items-center gap-4">
      <h3 class="text-sm font-medium leading-6 text-zinc-300">
        My Standby Rewards
      </h3>
    </div>

    <!-- total -->
    <div class="mt-2 flex items-center gap-4">
      <div class="flex items-baseline gap- text-orange-300">
        <span class="font-bold text-lg">
          {{ isLoadingRewardsEssential ? '-' : standbyRewardsEssential?.total }}
        </span>

        <span class="text-sm ml-1 uppercase">
          ${{ EVENT_REWARDS_TICK.toUpperCase() }}
        </span>
      </div>

      <!-- claim button -->
      <button
        class="rounded bg-orange-300 text-orange-950 px-4 py-1 shadow-md shadow-orange-300/20 text-sm hover:shadow-orange-300/50 disabled:opacity-30 disabled:saturate-50 disabled:shadow-none"
        @click="onClaimReward"
        :disabled="
          !standbyRewardsEssential || standbyRewardsEssential.total === 0
        "
        v-if="standbyRewardsEssential && standbyRewardsEssential.total > 0"
      >
        Claim
      </button>

      <el-tooltip
        content="You need to pay a small amount of gas for claiming rewards."
        placement="bottom"
        effect="light"
      >
        <HelpCircleIcon class="box-content h-4 w-4 pr-2 text-zinc-300" />
      </el-tooltip>
    </div>
  </div>

  <TabGroup :default-index="0">
    <TabList class="flex items-center gap-8" v-slot="{ selectedIndex }">
      <Tab
        :class="[
          'text-sm font-medium leading-6 outline-none',
          selectedIndex === 0
            ? 'text-orange-300 underline decoration-2 underline-offset-4'
            : 'text-zinc-500 hover:text-zinc-300',
        ]"
        >Standby Records</Tab
      >

      <Tab
        :class="[
          'text-sm font-medium leading-6 outline-none',
          selectedIndex === 1
            ? 'text-orange-300 underline decoration-2 underline-offset-4'
            : 'text-zinc-500 hover:text-zinc-300',
        ]"
        >Claim History</Tab
      >
    </TabList>
    <TabPanels class="mt-8">
      <TabPanel class="h-[40vh] overflow-y-auto nicer-scrollbar pr-2">
        <button
          class="text-zinc-300 mb-2 underline hover:text-orange-300 underline-offset-4 hover:underline-offset-2 text-sm"
          @click="isModelOpen = true"
        >
          What are these records?
        </button>

        <table
          class="min-w-full text-center border-separate border-spacing-0"
          v-if="standbys?.length"
        >
          <thead>
            <tr>
              <th
                scope="col"
                class="py-3.5 pl-4 pr-3 text-center text-sm font-semibold text-orange-300 sm:pl-0 sticky top-0 z-10 border-b-2 border-zinc-500 bg-zinc-900/80"
              >
                Order ID
              </th>
              <th
                scope="col"
                class="px-3 py-3.5 text-center text-sm font-semibold text-orange-300 sticky top-0 z-10 border-b-2 border-zinc-500 bg-zinc-900/80"
              >
                Amount
              </th>

              <th
                scope="col"
                class="px-3 py-3.5 text-center text-sm font-semibold text-orange-300 sticky top-0 z-10 border-b-2 border-zinc-500 bg-zinc-900/80"
              >
                #Day
              </th>

              <th
                scope="col"
                class="px-3 py-3.5 text-center text-sm font-semibold text-orange-300 sticky top-0 z-10 border-b-2 border-zinc-500 bg-zinc-900/80"
              >
                Percentage
              </th>
              <th
                scope="col"
                class="px-3 py-3.5 text-center text-sm font-semibold text-orange-300 sticky top-0 z-10 border-b-2 border-zinc-500 bg-zinc-900/80"
              >
                Reward
              </th>
            </tr>
          </thead>

          <tbody class="">
            <tr
              v-for="standby in standbys"
              :key="standby.orderId"
              v-if="standbys?.length"
            >
              <td
                class="whitespace-nowrap py-5 pl-4 pr-3 text-sm sm:pl-0 border-b border-zinc-700"
              >
                <div class="flex items-center justify-center gap-2">
                  <div class="font-medium text-zinc-100">
                    {{ prettyTxid(standby.orderId) }}
                  </div>
                  <button
                    title="copy order id"
                    @click="onCopyOrderId(standby.orderId)"
                  >
                    <CopyIcon
                      class="w-4 h-4 text-zinc-500 hover:text-orange-300"
                    />
                  </button>
                </div>
              </td>
              <td
                class="whitespace-nowrap px-3 py-5 text-sm border-b border-zinc-700"
              >
                <div class="text-zinc-100">
                  {{
                    standby.fromOrderCoinAmount + ' $' + standby.fromOrderTick
                  }}
                </div>
                <div class="mt-1 text-zinc-100">
                  {{ prettyBalance(standby.fromOrderAmount, useBtcUnit) }}
                  {{ unit }}
                </div>
              </td>

              <td
                class="whitespace-nowrap px-3 py-5 text-sm border-b border-zinc-700"
              >
                {{ standby.calBigBlock }}
              </td>

              <td
                class="whitespace-nowrap px-3 py-5 text-sm border-b border-zinc-700"
              >
                {{ (standby.percentage / 100).toFixed(2) }}%
              </td>
              <td
                class="whitespace-nowrap px-3 py-5 text-sm border-b border-zinc-700"
              >
                {{ standby.rewardAmount }}
              </td>
            </tr>
          </tbody>
        </table>

        <div
          class="flex items-center justify-center text-zinc-500 mt-36"
          v-else
        >
          No Records Currently.
        </div>
      </TabPanel>

      <TabPanel class="h-[40vh] overflow-y-auto nicer-scrollbar pr-2">
        <!-- claim records -->
        <StandbyClaimRecords />
      </TabPanel>
    </TabPanels>
  </TabGroup>
</template>
@/stores/store
