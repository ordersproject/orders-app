<script lang="ts" setup>
import changelog from '@/data/changelog'
</script>

<template>
  <div class="max-w-xl mx-auto scroll-my-12">
    <h1 class="text-center text-3xl font-bold">Changelog</h1>

    <div
      class="mt-12 divide-y divide-zinc-700 max-h-[80vh] overflow-y-auto pr-8 nicer-scrollbar"
    >
      <div class="py-12 first:pt-0 last:pb-0" v-for="log in changelog">
        <div class="flex items-center">
          <h2 class="text-lg font-bold text-orange-300">
            {{ log.version + ' ' + log.emoji }}
          </h2>
          <span class="ml-auto text-sm text-zinc-500">{{ log.date }}</span>
        </div>
        <ul class="list-disc list-inside mt-2 text-sm">
          <li v-for="change in log.changes" class="mt-2">
            {{ change }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
