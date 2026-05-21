<script setup lang="ts">
const {
  as = 'span',
  to,
} = defineProps<{
  as?: 'span' | 'a'
  to?: string
}>()
</script>

<template>
  <NuxtLink
    v-if="as === 'a' && to"
    :to="to"
    class="inline-flex items-start px-[10px] py-[4px] rounded-[4px] border border-dashed border-primary font-sans font-semibold text-[10px] leading-[14px] tracking-[0.4px] text-primary uppercase whitespace-nowrap transition-colors duration-fast ease-out hover:border-solid hover:border-accent hover:text-accent"
  >
    <slot />
  </NuxtLink>
  <span
    v-else
    class="inline-flex items-start px-[10px] py-[4px] rounded-[4px] border border-dashed border-primary font-sans font-semibold text-[10px] leading-[14px] tracking-[0.4px] text-primary uppercase whitespace-nowrap"
  >
    <slot />
  </span>
</template>
