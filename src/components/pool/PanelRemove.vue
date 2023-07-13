<script lang="ts" setup>
import { defaultPair, selectedPoolPairKey } from '@/data/trading-pairs'
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue'
import { CheckIcon } from 'lucide-vue-next'
import { ChevronsUpDownIcon } from 'lucide-vue-next'
import { inject, ref } from 'vue'

const selectedPair = inject(selectedPoolPairKey, defaultPair)

const people = [
  { id: 1, name: 'Wade Cooper' },
  { id: 2, name: 'Arlene Mccoy' },
  { id: 3, name: 'Devon Webb' },
  { id: 4, name: 'Tom Cook' },
  { id: 5, name: 'Tanya Fox' },
  { id: 6, name: 'Hellen Schmidt' },
  { id: 7, name: 'Caroline Schultz' },
  { id: 8, name: 'Mason Heaney' },
  { id: 9, name: 'Claudie Smitham' },
  { id: 10, name: 'Emil Schaefer' },
]
const selected = ref(people[3])
</script>

<template>
  <div class="max-w-md mx-auto">
    <form action="" class="flex flex-col min-h-[40vh]">
      <Listbox as="div" v-model="selected" class="grow">
        <ListboxLabel
          class="block text-base font-medium leading-6 text-zinc-300"
        >
          My Liquidity Records
        </ListboxLabel>

        <div class="relative col-span-5 mt-4">
          <ListboxButton
            class="relative w-full rounded-md bg-zinc-800 py-2 pl-3 pr-10 text-left text-zinc-300 shadow-sm ring-1 ring-inset ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400 sm:text-sm sm:leading-6"
          >
            <span class="block truncate">{{ selected.name }}</span>
            <span
              class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"
            >
              <ChevronsUpDownIcon
                class="h-5 w-5 text-zinc-400"
                aria-hidden="true"
              />
            </span>
          </ListboxButton>

          <transition
            leave-active-class="transition ease-in duration-100"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <ListboxOptions
              class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-zinc-800 py-1 text-base shadow-lg ring-1 ring-zinc-700 ring-opacity-5 focus:outline-none sm:text-sm"
            >
              <ListboxOption
                as="template"
                v-for="person in people"
                :key="person.id"
                :value="person"
                v-slot="{ active, selected }"
              >
                <li
                  :class="[
                    active ? 'bg-orange-300 text-orange-900' : 'text-zinc-300',
                    'relative  select-none py-2 pl-3 pr-9',
                  ]"
                >
                  <span
                    :class="[
                      selected ? 'font-semibold' : 'font-normal',
                      'block truncate',
                    ]"
                    >{{ person.name }}</span
                  >

                  <span
                    v-if="selected"
                    :class="[
                      active ? 'text-white' : 'text-orange-400',
                      'absolute inset-y-0 right-0 flex items-center pr-4',
                    ]"
                  >
                    <CheckIcon class="h-5 w-5" aria-hidden="true" />
                  </span>
                </li>
              </ListboxOption>
            </ListboxOptions>
          </transition>
        </div>
      </Listbox>

      <div class="flex justify-center">
        <button
          class="mx-auto bg-orange-300 w-full py-3 text-orange-950 rounded-md"
        >
          Remove
        </button>
      </div>
    </form>
  </div>
</template>
