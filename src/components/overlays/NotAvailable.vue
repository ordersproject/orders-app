<script lang="ts" setup>
import logo from '@/assets/logo-new.png?url'
</script>

<template>
  <div
    class="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-8 px-8"
  >
    <img class="h-12 -mt-16" :src="logo" alt="Logo" />
    <div class="text-zinc-500 text-center space-y-2">
      <p>This app is not available on mobile devices.</p>
      <p>Please use a desktop browser like Chrome or Safari.</p>
    </div>
  </div>
</template>
