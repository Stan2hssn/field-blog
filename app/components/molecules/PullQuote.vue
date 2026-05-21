<script setup lang="ts">
const { kicker = 'POURQUOI' } = defineProps<{
  kicker?: string
}>()
</script>

<template>
  <blockquote class="flex flex-col gap-[24px] items-start pt-[24px] border-t border-rule w-full">
    <p class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-primary whitespace-nowrap">
      {{ kicker }}
    </p>
    <p class="font-sans font-light italic text-[26px] leading-[36px] text-primary w-full">
      <slot />
    </p>
  </blockquote>
</template>
