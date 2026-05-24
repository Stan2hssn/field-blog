<script setup lang="ts">
const {
  direction = 'right',
  to,
  label,
  tone = 'primary',
} = defineProps<{
  direction?: 'right' | 'left'
  to?: string
  label?: string
  tone?: 'primary' | 'accent'
}>()

const toneClass = tone === 'accent' ? 'text-accent' : 'text-primary'
const arrow = direction === 'right' ? '→' : '←'
const moveClass = direction === 'right'
  ? 'group-hover:translate-x-[2px]'
  : 'group-hover:-translate-x-[2px]'

const baseClass = 'group inline-flex items-center gap-2 font-sans font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const arrowClass = 'inline-block transition-transform duration-[200ms] ease-out motion-reduce:transition-none'
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :class="[baseClass, toneClass]"
  >
    <span
      v-if="direction === 'left'"
      aria-hidden="true"
      :class="[arrowClass, moveClass]"
    >{{ arrow }}</span>
    <span><slot>{{ label }}</slot></span>
    <span
      v-if="direction === 'right'"
      aria-hidden="true"
      :class="[arrowClass, moveClass]"
    >{{ arrow }}</span>
  </NuxtLink>
  <button
    v-else
    type="button"
    :class="[baseClass, toneClass]"
  >
    <span
      v-if="direction === 'left'"
      aria-hidden="true"
      :class="[arrowClass, moveClass]"
    >{{ arrow }}</span>
    <span><slot>{{ label }}</slot></span>
    <span
      v-if="direction === 'right'"
      aria-hidden="true"
      :class="[arrowClass, moveClass]"
    >{{ arrow }}</span>
  </button>
</template>
