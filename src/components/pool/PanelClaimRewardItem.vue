<script lang="ts" setup>
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'
import { Buffer } from 'buffer'
import { inject, ref } from 'vue'

import { prettyTimestamp, raise } from '@/lib/helpers'
import { type PoolRecord, getClaimEssential, submitClaim } from '@/queries/pool'
import { useAddressStore, useBtcJsStore } from '@/store'
import { DEBUG, SIGHASH_SINGLE_ANYONECANPAY } from '@/data/constants'
import { buildClaimPsbt } from '@/lib/order-pool-builder'
import btcHelpers from '@/lib/btc-helpers'
import { defaultPair, selectedPoolPairKey } from '@/data/trading-pairs'

import ClaimingOverlay from '@/components/overlays/Claiming.vue'

const { reward, privateKeyHex } = defineProps<{
  reward: PoolRecord
  privateKeyHex: string
}>()

const queryClient = useQueryClient()
const addressStore = useAddressStore()

const claiming = ref(false)

const selectedPair = inject(selectedPoolPairKey, defaultPair)
const { mutate: mutateFinishReward } = useMutation({
  mutationFn: submitClaim,
  onSuccess: () => {
    ElMessage.success('Reward claimed')
    queryClient.invalidateQueries({
      queryKey: [
        'poolRecords',
        {
          address: addressStore.get as string,
          tick: selectedPair.fromSymbol,
        },
      ],
    })
  },
  onError: (err: any) => {
    ElMessage.error(err.message)
  },
})

async function submitClaimReward() {
  claiming.value = true
  try {
    const claimEssential = await getClaimEssential({
      orderId: reward.orderId,
      tick: reward.tick,
    })

    const ECPair = useBtcJsStore().ECPair ?? raise('ECPair not ready')
    const signer = ECPair.fromPrivateKey(Buffer.from(privateKeyHex, 'hex'))

    const claimPsbt = await buildClaimPsbt({
      btcMsPsbtRaw: claimEssential.psbtRaw,
      ordinalMsPsbtRaw: claimEssential.coinPsbtRaw,
      ordinalReleasePsbtRaw: claimEssential.coinTransferPsbtRaw,
      pubKey: signer.publicKey.slice(1, 33),
    })

    console.log({ claimPsbt })

    claimPsbt
      .signInput(0, signer, [SIGHASH_SINGLE_ANYONECANPAY])
      .signInput(1, signer, [SIGHASH_SINGLE_ANYONECANPAY])
      .signInput(2, signer, [SIGHASH_SINGLE_ANYONECANPAY])
    // .signInput(3, btcHelpers.tweakSigner(signer))

    const exchangePubKey = Buffer.from(
      '03782f1f1736fbd1048a3b29ac9e7f5ab8c64f0c87d6a0bd671c0d6d67a3181da2',
      'hex'
    )
    const selfPubKey = Buffer.from(signer.publicKey.toString('hex'), 'hex')

    // console.log({
    //   pk1: '03782f1f1736fbd1048a3b29ac9e7f5ab8c64f0c87d6a0bd671c0d6d67a3181da2',
    //   pk2: claimPsbt.data.inputs[0].partialSig![0].pubkey.toString('hex'),
    //   pk3: claimPsbt.data.inputs[1].partialSig![0].pubkey.toString('hex'),
    //   pkself: signer.publicKey.toString('hex'),
    // })

    console.log({
      validate00: btcHelpers.validate(claimPsbt, [0], exchangePubKey),
      validate01: btcHelpers.validate(claimPsbt, [0], selfPubKey),
      validate10: btcHelpers.validate(claimPsbt, [1], exchangePubKey),
      validate11: btcHelpers.validate(claimPsbt, [1], selfPubKey),
      validate20: btcHelpers.validate(claimPsbt, [2], exchangePubKey),
      validate21: btcHelpers.validate(claimPsbt, [2], selfPubKey),
    })

    claimPsbt.finalizeInput(0).finalizeInput(1).finalizeInput(2)
    const signed = await window.unisat.signPsbt(claimPsbt.toHex())

    // validate if all inputs are signed
    // const signedPsbt = btcjs.Psbt.fromHex(signed)

    // const pubkeyStr = await window.unisat.getPublicKey()
    // const pubkey = Buffer.from(pubkeyStr, 'hex')
    // const account = ECPair.fromPublicKey(pubkey)

    // const isSigned0 = signedPsbt.validateSignaturesOfInput(0, validator)

    // console.log({ pubkey })
    // const isSigned1 = signedPsbt.validateSignaturesOfInput(0, validator)
    // console.log({ isSigned1 })
    // const pushed = await window.unisat.pushPsbt(signed)

    // notify api to update order state
    mutateFinishReward({
      orderId: reward.orderId,
      psbtRaw: signed,
    })
  } catch (e: any) {
    if (DEBUG) console.error(e)
    ElMessage.error('Error while claiming reward.')
  }

  claiming.value = false
}
</script>

<template>
  <ClaimingOverlay v-if="claiming" />

  <div class="py-4 mx-4 bg-zinc-950 rounded-lg px-4">
    <div class="flex items-center justify-between">
      <h3 class="text-zinc-300">
        {{
          `${
            reward.coinAmount
          } ${reward.tick.toUpperCase()} - (${prettyTimestamp(
            reward.timestamp
          )})`
        }}
      </h3>
    </div>

    <div class="mt-4 flex items-center justify-between">
      <div class="">
        <div class="flex items-center">
          <span class="w-20 inline-block text-zinc-500 text-sm">Assets</span>
          <span>
            {{ `${reward.coinAmount} ${reward.tick.toUpperCase()}` }}
          </span>
        </div>
        <div class="flex items-center">
          <span class="w-20 inline-block text-zinc-500 text-sm">Rewards</span>
          <span>
            -
            <!-- {{ `${reward.rewards.amount} ${reward.rewards.symbol}` }} -->
          </span>
        </div>
      </div>

      <button
        class="rounded-md bg-orange-300 text-orange-950 px-6 py-2 shadow-md shadow-orange-300/20"
        @click.prevent="submitClaimReward"
      >
        Claim
      </button>
    </div>
  </div>
</template>
