<script setup lang="ts">
const { as = 'link', to = '/', size = 'sm' } = defineProps<{
  as?: 'link' | 'static'
  to?: string
  size?: 'sm' | 'md' | 'hero'
}>()

const sizeClass = {
  sm: 'text-lg',
  md: 'text-2xl',
  hero: 'text-[80px] leading-[0.75]',
}[size]

const accentSizeClass = {
  sm: 'text-base',
  md: 'text-lg',
  hero: 'text-[32px]',
}[size]
</script>

<template>
  <NuxtLink
    v-if="as === 'link'"
    :to="to"
    class="inline-flex items-baseline font-sans font-medium tracking-tight text-primary"
    :class="sizeClass"
    aria-label="FIELD® — accueil"
  >
    <span>FIELD</span><span :class="['text-accent align-super', accentSizeClass]">®</span>
  </NuxtLink>
  <span
    v-else
    class="inline-flex items-baseline font-sans font-medium tracking-tight text-primary"
    :class="sizeClass"
  >
    <span>FIELD</span><span :class="['text-accent align-super', accentSizeClass]">®</span>
  </span>
</template>
