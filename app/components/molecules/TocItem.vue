<script setup lang="ts">
const { num, label, to, isActive = false } = defineProps<{
  num: string
  label: string
  to: string
  isActive?: boolean
}>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="group flex items-baseline gap-3 py-2 transition-colors duration-fast ease-out"
    :class="isActive ? 'text-primary' : 'text-greyed hover:text-secondary'"
    :aria-current="isActive ? 'location' : undefined"
  >
    <span class="font-mono text-xs tabular-nums w-6 shrink-0">{{ num }}</span>
    <span class="font-sans text-sm leading-tight">{{ label }}</span>
  </NuxtLink>
</template>
