<script setup lang="ts">
const { kicker = 'POURQUOI' } = defineProps<{
  kicker?: string
}>()
</script>

<template>
  <blockquote class="relative pl-6 py-4 space-y-3 border-l-2 border-accent bg-bg-card/50">
    <Kicker tone="accent">{{ kicker }}</Kicker>
    <BodyText size="lg" italic tone="primary">
      <slot />
    </BodyText>
  </blockquote>
</template>
