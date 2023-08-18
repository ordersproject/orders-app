<script lang="ts" setup>
import { useQueryClient } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'
import { HelpCircleIcon } from 'lucide-vue-next'
import ECPairFactory from 'ecpair'
import { Buffer } from 'buffer'
import * as ecc from 'tiny-secp256k1'
import * as bip39 from 'bip39'
import BIP32Factory from 'bip32'

import { prettyTimestamp } from '@/lib/helpers'
import { type PoolRecord, getClaimEssential } from '@/queries/pool'
import { useAddressStore, useBtcJsStore } from '@/store'
import { DEBUG } from '@/data/constants'
import { buildClaimBtcPsbt } from '@/lib/order-pool-builder'
import btcHelpers, { toXOnly } from '@/lib/btc-helpers'

const { reward } = defineProps<{ reward: PoolRecord }>()

const queryClient = useQueryClient()
const addressStore = useAddressStore()
async function submitClaimReward() {
  console.log('claiming')
  try {
    const claimEssential = await getClaimEssential({
      orderId: reward.orderId,
      tick: reward.tick,
    })

    const unisat = window.unisat
    const btcjs = useBtcJsStore().get!

    // const btcClaimTx = btcjs.Psbt.fromHex(claimEssential.psbtRaw)

    const bip32 = BIP32Factory(ecc)
    const mnemonic = import.meta.env.VITE_TEST_MNEMONIC
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const root = bip32.fromSeed(seed)
    const child = root.derivePath("m/86'/0'/0'/0/5")
    const childNodeXOnlyPubkey = child.publicKey.slice(1, 33)
    const claimBtcPsbt = await buildClaimBtcPsbt({
      psbt: claimEssential.psbtRaw,
      pubKey: childNodeXOnlyPubkey,
    })
    console.log({ claimBtcPsbt })

    claimBtcPsbt
      .signInput(0, child, [3 | 128])
      .signInput(1, btcHelpers.tweakSigner(child))

    const exchangePubKey = Buffer.from(
      '03782f1f1736fbd1048a3b29ac9e7f5ab8c64f0c87d6a0bd671c0d6d67a3181da2',
      'hex'
    )
    const selfPubKey = Buffer.from(child.publicKey.toString('hex'), 'hex')

    console.log({
      pk1: '03782f1f1736fbd1048a3b29ac9e7f5ab8c64f0c87d6a0bd671c0d6d67a3181da2',
      pk2: claimBtcPsbt.data.inputs[0].partialSig![0].pubkey.toString('hex'),
      pk3: selfPubKey.toString('hex'),
      pk4: claimBtcPsbt.data.inputs[0].partialSig![1].pubkey.toString('hex'),
    })

    console.log({
      validate0: btcHelpers.validate(claimBtcPsbt, [0], exchangePubKey),
      validate1: btcHelpers.validate(claimBtcPsbt, [0], selfPubKey),
      validate2: btcHelpers.validate(claimBtcPsbt, [1]),
    })

    claimBtcPsbt.finalizeAllInputs()

    // const signed = await unisat.signPsbt(claimBtcPsbt.toHex())

    // validate if all inputs are signed
    // const signedPsbt = btcjs.Psbt.fromHex(signed)

    // const pubkeyStr = await window.unisat.getPublicKey()
    // const pubkey = Buffer.from(pubkeyStr, 'hex')
    // const account = ECPair.fromPublicKey(pubkey)

    // const isSigned0 = signedPsbt.validateSignaturesOfInput(0, validator)

    // console.log({ pubkey })
    // const isSigned1 = signedPsbt.validateSignaturesOfInput(0, validator)
    // console.log({ isSigned1 })
    const pushed = await unisat.pushPsbt(claimBtcPsbt.toHex())
    console.log({ pushed })

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
}
</script>

<template>
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

      <el-popover
        placement="bottom-start"
        :width="400"
        trigger="hover"
        content="Rewards are available to for pledged assets and pledges respectively."
        popper-class="!bg-zinc-800 !text-zinc-300 !shadow-lg !shadow-orange-400/10 "
      >
        <template #reference>
          <HelpCircleIcon class="h-5 w-5 text-zinc-300" aria-hidden="true" />
        </template>
      </el-popover>
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
