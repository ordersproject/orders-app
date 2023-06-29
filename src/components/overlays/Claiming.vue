<script lang="ts" setup>
import { Loader2Icon } from 'lucide-vue-next'
</script>

<template>
  <div
    class="fixed inset-0 bg-black/30 backdrop-blur flex flex-col items-center justify-center gap-8 px-8"
  >
    <div
      class="text-zinc-300 text-center bg-zinc-800 rounded-xl h-48 w-1/3 max-w-lg flex items-center justify-center gap-4"
    >
      <Loader2Icon class="animate-spin h-8 w-8 text-orange-300" />
      <p>Building Transaction...</p>
    </div>
  </div>
</template>
