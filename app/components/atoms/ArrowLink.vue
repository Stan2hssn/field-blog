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
  ? 'group-hover:translate-x-1'
  : 'group-hover:-translate-x-1'
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="group inline-flex items-center gap-2 font-sans font-medium underline-offset-4 hover:underline transition-colors duration-fast ease-out"
    :class="toneClass"
  >
    <span
      v-if="direction === 'left'"
      aria-hidden="true"
      class="inline-block transition-transform duration-base ease-out"
      :class="moveClass"
    >{{ arrow }}</span>
    <span><slot>{{ label }}</slot></span>
    <span
      v-if="direction === 'right'"
      aria-hidden="true"
      class="inline-block transition-transform duration-base ease-out"
      :class="moveClass"
    >{{ arrow }}</span>
  </NuxtLink>
  <button
    v-else
    type="button"
    class="group inline-flex items-center gap-2 font-sans font-medium underline-offset-4 hover:underline transition-colors duration-fast ease-out"
    :class="toneClass"
  >
    <span
      v-if="direction === 'left'"
      aria-hidden="true"
      class="inline-block transition-transform duration-base ease-out"
      :class="moveClass"
    >{{ arrow }}</span>
    <span><slot>{{ label }}</slot></span>
    <span
      v-if="direction === 'right'"
      aria-hidden="true"
      class="inline-block transition-transform duration-base ease-out"
      :class="moveClass"
    >{{ arrow }}</span>
  </button>
</template>
