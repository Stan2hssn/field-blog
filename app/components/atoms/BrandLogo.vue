<script setup lang="ts">
const { as = 'link', to = '/' } = defineProps<{
  as?: 'link' | 'static'
  to?: string
}>()
</script>

<template>
  <NuxtLink
    v-if="as === 'link'"
    :to="to"
    class="inline-flex items-baseline font-sans font-semibold tracking-tight text-primary text-lg leading-none"
    aria-label="FIELD® — accueil"
  >
    <span>FIELD</span><span class="text-accent">®</span>
  </NuxtLink>
  <span
    v-else
    class="inline-flex items-baseline font-sans font-semibold tracking-tight text-primary text-lg leading-none"
  >
    <span>FIELD</span><span class="text-accent">®</span>
  </span>
</template>
