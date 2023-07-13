<script lang="ts" setup>
import { inject, ref } from 'vue'
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
  SwitchGroup,
  SwitchLabel,
  Switch,
} from '@headlessui/vue'
import { CheckIcon, ChevronsUpDownIcon, HelpCircleIcon } from 'lucide-vue-next'

import { defaultPair, selectedPoolPairKey } from '@/data/trading-pairs'

const providesBtc = ref(false)

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

const multipliers = [1.5, 1.8, 2]
const selectedMultiplier = ref(multipliers[0])

const selectedPair = inject(selectedPoolPairKey, defaultPair)
</script>

<template>
  <div class="max-w-md mx-auto">
    <form action="" class="flex flex-col min-h-[40vh]">
      <Listbox
        as="div"
        v-model="selected"
        class="grid items-center gap-x-6 justify-center grid-cols-6"
      >
        <ListboxLabel
          class="block text-base font-medium leading-6 text-zinc-300 uppercase col-span-1"
        >
          {{ selectedPair.fromSymbol }}
        </ListboxLabel>

        <div class="relative col-span-5">
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

      <SwitchGroup>
        <div class="flex items-center mt-8">
          <Switch
            v-model="providesBtc"
            :class="[
              providesBtc ? 'bg-orange-400' : 'bg-orange-200/10',
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 ring-offset-zinc-900',
            ]"
          >
            <span class="sr-only">Also Provide BTC Liquidity</span>
            <span
              :class="[
                providesBtc
                  ? 'translate-x-5 bg-zinc-300'
                  : 'translate-x-0 bg-zinc-600',
                'pointer-events-none relative inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out',
              ]"
            >
              <span
                :class="[
                  providesBtc
                    ? 'opacity-100 duration-200 ease-in'
                    : 'opacity-0 duration-100 ease-out',
                  'absolute inset-0 flex h-full w-full items-center justify-center transition-opacity',
                ]"
                aria-hidden="true"
              >
                <CheckIcon class="h-3 w-3 text-orange-950" aria-hidden="true" />
              </span>
            </span>
          </Switch>

          <SwitchLabel class="text-zinc-300 text-sm ml-4">
            Also Provide BTC Liquidity
          </SwitchLabel>

          <el-popover
            placement="bottom"
            title="What does it mean?"
            :width="400"
            trigger="hover"
            content="You will also provide BTC liquidity to the pool. This will gets you additional rewards."
            popper-class="!bg-zinc-800 !text-zinc-300 !shadow-lg !shadow-orange-400/10 "
          >
            <template #reference>
              <HelpCircleIcon
                class="h-4 w-4 text-zinc-300 ml-2"
                aria-hidden="true"
              />
            </template>
          </el-popover>
        </div>
      </SwitchGroup>

      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          :class="[
            'mt-4 grow flex items-start',
            providesBtc ? 'visible' : 'invisible',
          ]"
        >
          <div class="items-center gap-4 grid grid-cols-6 grow">
            <div class="text-zinc-300 col-span-1">BTC</div>
            <div
              class="flex items-center justify-between col-span-5 rounded-md border px-4 py-2 border-zinc-700 text-zinc-300 shadow-sm sm:text-sm sm:leading-6 bg-zinc-800"
            >
              <span>1.25</span>

              <Listbox as="div" v-model="selectedMultiplier">
                <div class="relative w-20">
                  <ListboxButton
                    class="relative w-full pl-3 pr-10 text-left shadow-sm ring-1 ring-inset ring-zinc-950 focus:outline-none focus:ring-2 focus:ring-orange-400 sm:text-sm sm:leading-6 inline-flex items-center rounded px-2 text-xs text-zinc-400 bg-black py-1.5 font-bold"
                  >
                    <span class="block truncate">{{ selectedMultiplier }}</span>
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
                      class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-zinc-950 py-1 text-base shadow-lg ring-1 ring-zinc-700 ring-opacity-5 focus:outline-none sm:text-sm"
                    >
                      <ListboxOption
                        as="template"
                        v-for="multiplier in multipliers"
                        :key="multiplier"
                        :value="multiplier"
                        v-slot="{ active, selected }"
                      >
                        <li
                          :class="[
                            active
                              ? 'bg-orange-300 text-orange-900'
                              : 'text-zinc-300',
                            'relative select-none py-2 pl-3 pr-9',
                          ]"
                        >
                          <span
                            :class="[
                              selected ? 'font-semibold' : 'font-normal',
                              'block truncate',
                            ]"
                          >
                            {{ multiplier }}
                          </span>

                          <span
                            v-if="selected"
                            :class="[
                              active ? 'text-white' : 'text-orange-400',
                              'absolute inset-y-0 right-0 flex items-center pr-2',
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
            </div>
          </div>
        </div>
      </transition>

      <div class="flex justify-center">
        <button
          class="mx-auto bg-orange-300 w-full py-3 text-orange-950 rounded-md"
        >
          Submit
        </button>
      </div>
    </form>
  </div>
</template>
