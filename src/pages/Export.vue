<script lang="ts" setup>
async function runExport() {
  // const mnemonic = document.querySelector('input').value
  // const address = await window.unisat.getAddress(mnemonic)
  // console.log(address)
}
</script>

<template>
  <div class="border border-zinc-500 max-w-3xl mx-auto rounded-lg p-8 mt-8">
    <div class="flex items-center gap-4">
      <input
        type="text"
        placeholder="mnemonic"
        class="bg-black rounded w-full"
      />

      <button
        class="px-6 py-2 rounded bg-zinc-800 border-zinc-700 border"
        @click="runExport"
      >
        ok
      </button>
    </div>

    <div class=""></div>
  </div>
</template>
