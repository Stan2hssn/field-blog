<script setup lang="ts">
const { num, kicker, title, as = 'h2' } = defineProps<{
  num: string
  kicker: string
  title: string
  as?: 'h2' | 'h3'
}>()
</script>

<template>
  <header :id="`rule-${num}`" class="space-y-3 scroll-mt-24">
    <div class="flex items-baseline gap-4">
      <span class="font-mono text-sm tabular-nums text-greyed leading-none">{{ num }}</span>
      <Kicker tone="accent">{{ kicker }}</Kicker>
    </div>
    <component
      :is="as"
      class="font-sans text-2xl md:text-3xl font-medium leading-tight text-primary"
    >
      {{ title }}
    </component>
  </header>
</template>
