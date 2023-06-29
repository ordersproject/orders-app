<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router'

import logo from '@/assets/logo-new.png?url'
import { VERSION } from '@/data/constants'
import { cn } from '@/lib/helpers'
import NavbarMenu from './NavbarMenu.vue'

const router = useRouter()
const route = useRoute()

const toHomepage = () => {
  router.push('/')
}

const links = [
  {
    name: 'Trade',
    path: '/',
  },
  // {
  //   name: 'Whitelist',
  //   path: '/whitelist',
  //   new: true,
  // },
  {
    name: 'Pool',
    path: '/pool',
    comingSoon: true,
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
  <div class="flex items-center gap-2">
    <!-- <NavbarMenu /> -->
    <el-tooltip
      effect="light"
      placement="right"
      :content="`Version ${VERSION}`"
    >
      <img
        class="h-9 cursor-pointer"
        :src="logo"
        alt="Logo"
        @click="toHomepage"
      />
    </el-tooltip>

    <nav class="ml-8 flex items-center gap-x-2">
      <component
        :class="
          cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-all',
            isLinkActive(link.path) ? 'text-orange-300' : 'text-zinc-300',
            link.comingSoon
              ? 'text-zinc-500'
              : 'hover:bg-black hover:text-orange-300'
          )
        "
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
