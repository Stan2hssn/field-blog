<script setup lang="ts">
const { kicker = 'POURQUOI' } = defineProps<{
  kicker?: string
}>()
</script>

<template>
  <blockquote class="space-y-3">
    <Kicker tone="greyed">{{ kicker }}</Kicker>
    <p class="font-sans font-light italic text-[15px] leading-[24px] text-primary">
      <slot />
    </p>
  </blockquote>
</template>
