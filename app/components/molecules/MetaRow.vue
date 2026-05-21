<script setup lang="ts">
const { label } = defineProps<{
  label: string
}>()
</script>

<template>
  <div class="flex items-baseline justify-between gap-6 py-3 border-b border-rule/20">
    <Kicker tone="greyed">{{ label }}</Kicker>
    <div class="font-sans text-sm text-secondary text-right">
      <slot />
    </div>
  </div>
</template>
