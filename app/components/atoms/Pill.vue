<script setup lang="ts">
const {
  as = 'span',
  to,
  variant = 'tag',
} = defineProps<{
  as?: 'span' | 'a'
  to?: string
  variant?: 'tag' | 'accent'
}>()

const variantClass = variant === 'accent'
  ? 'bg-accent text-bg border-transparent'
  : 'bg-bg-card text-primary border-rule'

const baseClass = 'inline-flex items-center gap-1 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-kicker leading-none transition-colors duration-fast ease-out'
const hoverClass = as === 'a' ? 'hover:bg-primary hover:text-bg hover:border-primary' : ''
</script>

<template>
  <NuxtLink
    v-if="as === 'a' && to"
    :to="to"
    :class="[baseClass, variantClass, hoverClass]"
  >
    <slot />
  </NuxtLink>
  <span v-else :class="[baseClass, variantClass]">
    <slot />
  </span>
</template>
