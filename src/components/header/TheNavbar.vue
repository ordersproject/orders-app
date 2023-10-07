<script lang="ts" setup>
import { useRoute } from 'vue-router'

import NavbarMenu from './NavbarMenu.vue'

const route = useRoute()

const links: {
  name: string
  path: string
  new?: boolean
  comingSoon?: boolean
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
  {
    name: 'Whitelist',
    path: '/whitelist',
  },
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
</script>

<template>
  <div class="flex items-center">
    <NavbarMenu />

    <nav class="ml-6 flex items-center gap-x-2">
      <component
        :class="[
          'px-4 py-2 text-sm font-medium rounded-md transition-all',
          isLinkActive(link.path)
            ? 'text-orange-300 underline underline-offset-4 hover:underline-offset-2'
            : 'text-zinc-300',
          link.comingSoon
            ? 'text-zinc-500 cursor-default'
            : 'hover:bg-black hover:text-orange-300',
        ]"
        v-for="link in links"
        :key="link.name"
        :is="link.comingSoon ? 'span' : 'router-link'"
        :to="link.path"
        :title="link.comingSoon ? 'Coming soon' : ''"
      >
        {{ link.name }}
        <span
          class="inline-flex items-center rounded-md bg-red-400/30 px-1.5 py-0.5 text-xs font-medium text-red-400 -translate-y-2 -translate-x-1 absolute"
          v-if="link.new"
        >
          New
        </span>
      </component>
    </nav>
  </div>
</template>
