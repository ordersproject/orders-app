<script lang="ts" setup>
import { useQueryClient } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'
import { HelpCircleIcon } from 'lucide-vue-next'
import ECPairFactory from 'ecpair'
import { Buffer } from 'buffer'
import * as ecc from 'tiny-secp256k1'
import * as bip39 from 'bip39'
import BIP32Factory from 'bip32'

import { prettyTimestamp, sleep } from '@/lib/helpers'
import { type PoolRecord, getClaimEssential } from '@/queries/pool'
import { useAddressStore, useBtcJsStore } from '@/store'
import { DEBUG } from '@/data/constants'
import { buildClaimBtcPsbt, buildClaimPsbt } from '@/lib/order-pool-builder'
import btcHelpers, { toXOnly } from '@/lib/btc-helpers'

import ClaimingOverlay from '@/components/overlays/Claiming.vue'
import { ref } from 'vue'

const { reward } = defineProps<{ reward: PoolRecord }>()

const queryClient = useQueryClient()
const addressStore = useAddressStore()

const claiming = ref(false)

async function submitClaimReward() {
  claiming.value = true
  try {
    const claimEssential = await getClaimEssential({
      orderId: reward.orderId,
      tick: reward.tick,
    })

    const bip32 = BIP32Factory(ecc)
    const mnemonic = import.meta.env.VITE_TEST_MNEMONIC
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const root = bip32.fromSeed(seed)
    const child = root.derivePath("m/86'/0'/0'/0/5")
    const childNodeXOnlyPubkey = child.publicKey.slice(1, 33)
    const claimPsbt = await buildClaimPsbt({
      btcMsPsbtRaw: claimEssential.psbtRaw,
      ordinalMsPsbtRaw: claimEssential.coinPsbtRaw,
      pubKey: childNodeXOnlyPubkey,
    })

    // claimPsbt
    //   .signInput(0, child, [3 | 128])
    //   .signInput(1, btcHelpers.tweakSigner(child))

    // const exchangePubKey = Buffer.from(
    //   '03782f1f1736fbd1048a3b29ac9e7f5ab8c64f0c87d6a0bd671c0d6d67a3181da2',
    //   'hex'
    // )
    // const selfPubKey = Buffer.from(child.publicKey.toString('hex'), 'hex')

    // console.log({
    //   pk1: '03782f1f1736fbd1048a3b29ac9e7f5ab8c64f0c87d6a0bd671c0d6d67a3181da2',
    //   pk2: claimPsbt.data.inputs[0].partialSig![0].pubkey.toString('hex'),
    //   pk3: selfPubKey.toString('hex'),
    //   pk4: claimPsbt.data.inputs[0].partialSig![1].pubkey.toString('hex'),
    // })

    // console.log({
    //   validate0: btcHelpers.validate(claimPsbt, [0], exchangePubKey),
    //   validate1: btcHelpers.validate(claimPsbt, [0], selfPubKey),
    //   validate2: btcHelpers.validate(claimPsbt, [1]),
    // })

    // claimPsbt.finalizeAllInputs()

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
    // const pushed = await unisat.pushPsbt(claimBtcPsbt.toHex())
    // console.log({ pushed })

    ElMessage.success('Reward claimed')
    queryClient.invalidateQueries({
      queryKey: [
        'poolRewards',
        {
          address: addressStore.get as string,
          tick: reward.tick,
        },
      ],
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
