<script lang="ts" setup>
import {
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
  Switch,
  SwitchGroup,
  SwitchLabel,
} from '@headlessui/vue'

import logo from '@/assets/logo-new.png?url'
import { VERSION } from '@/data/constants'
import { useStorage } from '@vueuse/core'

const useBtcUnit = useStorage('use-btc-unit', true)
</script>

<template>
  <Menu class="relative" as="div">
    <div class="flex items-center">
      <MenuButton class="outline-none flex items-center gap-0.5">
        <img class="h-9 cursor-pointer" :src="logo" alt="Logo" />
        <span
          class="inline-flex items-center rounded-md bg-black px-2 py-0.5 text-xs font-medium text-orange-100"
        >
          Beta
        </span>
      </MenuButton>
    </div>

    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <MenuItems class="absolute left-0 z-10 mt-1 flex w-screen max-w-min">
        <div
          class="w-56 shrink rounded-xl bg-zinc-800 text-sm font-semibold leading-6 text-zinc-300 shadow-lg ring-1 ring-zinc-900/5 overflow-hidden divide-y divide-zinc-700"
        >
          <MenuItem>
            <router-link
              to="/"
              class="p-4 block hover:text-orange-300 transition"
            >
              Home
            </router-link>
          </MenuItem>
          <MenuItem>
            <router-link
              to="/changelog"
              class="p-4 block hover:text-orange-300 transition"
            >
              Changelog
            </router-link>
          </MenuItem>

          <MenuItem :disabled="true">
            <div class="flex items-center p-4 justify-between font-normal">
              <span class="text-zinc-500">Liquidity Mode</span>
              <span>PSBT</span>
            </div>
          </MenuItem>

          <MenuItem :disabled="true">
            <SwitchGroup
              as="div"
              class="flex items-center p-4 justify-between font-normal"
            >
              <SwitchLabel class="text-zinc-500">Unit</SwitchLabel>
              <Switch v-model="useBtcUnit" class="border-none flex">
                <span
                  :class="[useBtcUnit ? 'text-orange-300' : 'text-zinc-500']"
                >
                  BTC
                </span>
                <span class="px-2">/</span>
                <span
                  :class="[useBtcUnit ? 'text-zinc-500' : 'text-orange-300']"
                >
                  satoshis
                </span>
              </Switch>
            </SwitchGroup>
          </MenuItem>

          <MenuItem :disabled="true">
            <div class="flex items-center p-4 justify-between font-normal">
              <span class="text-zinc-500">Version</span>
              <span>{{ VERSION }} (Beta)</span>
            </div>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>
