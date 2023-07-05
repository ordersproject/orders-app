<script lang="ts" setup>
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import logo from '@/assets/logo-new.png?url'
import { VERSION } from '@/data/constants'
</script>

<template>
  <Popover class="relative">
    <div class="flex items-center">
      <PopoverButton class="outline-none">
        <img class="h-9 cursor-pointer" :src="logo" alt="Logo" />
      </PopoverButton>
    </div>

    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <PopoverPanel class="absolute left-0 z-10 mt-1 flex w-screen max-w-min">
        <div
          class="w-56 shrink rounded-xl bg-zinc-800 text-sm font-semibold leading-6 text-zinc-300 shadow-lg ring-1 ring-zinc-900/5 overflow-hidden"
        >
          <router-link
            to="/changelog"
            class="p-4 block hover:text-orange-300 transition"
          >
            Changelog
          </router-link>
          <div class="p-4 text-zinc-500">Version: {{ VERSION }}</div>
        </div>
      </PopoverPanel>
    </transition>
  </Popover>
</template>
