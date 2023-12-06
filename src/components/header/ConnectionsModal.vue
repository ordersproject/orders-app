<script setup lang="ts">
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { ref } from 'vue'

import UnisatIcon from '@/assets/unisat-icon.png?url'
import OkxIcon from '@/assets/okx-icon.png?url'
import MetaletIcon from '@/assets/metalet-icon.png?url'
import { connect } from '@/queries/unisat'

defineProps<{
  open?: boolean
}>()
const emit = defineEmits(['update:open', 'openUnisatModal'])

const goButtonRef = ref<HTMLElement | null>(null)

function close() {
  emit('update:open', false)
}

async function connectUnisat() {
  if (!window.unisat) {
    emit('openUnisatModal')
    return
  }

  await connect()
}
</script>

<template>
  <TransitionRoot as="template" :show="open">
    <Dialog
      as="div"
      class="relative z-10"
      @close="close"
      :initial-focus="goButtonRef"
    >
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div
          class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur transition-all"
        />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div
          class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
        >
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              class="relative transform overflow-hidden rounded-lg bg-zinc-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:px-8 sm:py-6"
            >
              <div class="text-left my-4">
                <DialogTitle
                  class="text-xl font-semibold leading-6 text-zinc-100"
                >
                  Connect Wallet
                </DialogTitle>

                <!-- wallet buttons -->
                <div class="grid grid-cols-3 gap-4 mt-8 text-base">
                  <button
                    class="flex flex-col gap-2 items-center justify-center rounded-lg bg-zinc-800 text-zinc-100 font-medium transition w-36 py-4 border border-zinc-500/50 hover:shadow-md hover:shadow-orange-300/30 hover:border-orange-300/30 hover:bg-orange-300 hover:text-orange-950"
                    @click="close"
                  >
                    <img class="h-12 rounded" :src="OkxIcon" alt="Metamask" />
                    <span class="">OKX</span>
                  </button>

                  <button
                    class="flex flex-col gap-2 items-center justify-center rounded-lg bg-zinc-800 text-zinc-100 font-medium transition w-36 py-4 border border-zinc-500/50 hover:shadow-md hover:shadow-orange-300/30 hover:border-orange-300/30 hover:bg-orange-300 hover:text-orange-950"
                    @click="connectUnisat"
                  >
                    <img
                      class="h-12 rounded"
                      :src="UnisatIcon"
                      alt="Metamask"
                    />
                    <span class="">Unisat</span>
                  </button>

                  <!-- <button
                    class="flex flex-col gap-2 items-center justify-center rounded-lg bg-zinc-800 text-zinc-100  font-medium transition w-36 py-4 border border-zinc-500/50 hover:shadow-md hover:shadow-orange-300/30 hover:border-orange-300/30 hover:bg-orange-300 hover:text-orange-950 opacity-50"
                    @click="close"
                    :disabled="true"
                  >
                    <img
                      class="h-12 rounded"
                      :src="MetaletIcon"
                      alt="Metamask"
                    />
                    <span class="">Metalet</span>
                  </button> -->

                  <button
                    class="flex flex-col gap-2 items-center justify-center rounded-lg bg-zinc-800 text-zinc-100 font-medium transition w-36 py-4 border border-zinc-500/50 opacity-30"
                    @click="close"
                    :disabled="true"
                  >
                    <img
                      class="h-12 rounded"
                      :src="MetaletIcon"
                      alt="Metamask"
                    />
                    <span class="">Metalet</span>
                  </button>
                </div>

                <!-- footer -->
                <div class="mt-16 text-xs text-zinc-500 space-y-1">
                  <p>By connecting wallet,</p>
                  <p>you agree to Orders.Exchange's Terms of Service.</p>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
