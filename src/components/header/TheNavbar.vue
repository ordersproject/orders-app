<script lang="ts" setup>
import { useRoute } from 'vue-router'

import NavbarMenu from './NavbarMenu.vue'

const route = useRoute()

const links: {
  name: string
  path: string
  new?: boolean
  disabled?: boolean
}[] = [
  {
    name: 'Trade',
    path: '/',
  },
  {
    name: 'Pool',
    path: '/pool',
    new: true,
  },
  // { name: 'Nested', path: '/mvc20/' },
  // {
  //   name: 'Whitelist',
  //   path: '/whitelist',
  //   disabled: true,
  // },
]

function isLinkActive(path: string) {
  switch (path) {
    case '/':
      return route.path === '/' || route.path.startsWith('/orders')
    case '/whitelist':
      return route.path.startsWith('/whitelist')
    case '/pool':
      return route.path.startsWith('/pool')

    default:
      return false
  }
}

function toSwap() {
  window.open('/swap/', '_current')
}
</script>

<template>
  <div class="flex items-center">
    <NavbarMenu />

    <nav class="ml-6 flex items-center gap-x-2">
      <component
        :class="[
          'rounded-md px-4 py-2 text-sm font-medium transition-all',
          isLinkActive(link.path)
            ? 'text-orange-300 underline underline-offset-4 hover:underline-offset-2'
            : 'text-zinc-300',
          link.disabled
            ? 'cursor-default text-zinc-500'
            : 'hover:bg-black hover:text-orange-300',
        ]"
        v-for="link in links"
        :key="link.name"
        :is="link.disabled ? 'span' : 'router-link'"
        :to="link.path"
        :title="link.disabled ? 'Coming soon' : ''"
      >
        {{ link.name }}
        <span
          class="absolute inline-flex -translate-x-1 -translate-y-2 items-center rounded-md bg-red-400/30 px-1.5 py-0.5 text-xs font-medium text-red-400"
          v-if="link.new"
        >
          New
        </span>
      </component>

      <a
        class="cursor-pointer rounded-md px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-black hover:text-orange-300"
        @click="toSwap"
      >
        Swap
      </a>
    </nav>
  </div>
</template>
