<script setup lang="ts">
const { chapter } = defineProps<{
  chapter?: string
}>()
</script>

<template>
  <nav
    class="flex items-center justify-between gap-6 px-6 py-4 border-b border-rule/30 bg-bg/80 backdrop-blur-sm"
    aria-label="Navigation principale"
  >
    <BrandLogo />
    <div v-if="chapter" class="flex items-center gap-3">
      <Rule orientation="vertical" class="h-4" />
      <Kicker tone="secondary">{{ chapter }}</Kicker>
    </div>
  </nav>
</template>
