<script lang="ts" setup>
import changelog from '@/data/changelog'
</script>

<template>
  <div class="max-w-xl mx-auto mt-12">
    <h1 class="text-center text-3xl font-bold">Changelog</h1>

    <div class="mt-8 divide-y divide-zinc-700">
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
