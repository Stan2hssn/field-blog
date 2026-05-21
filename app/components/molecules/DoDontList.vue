<script setup lang="ts">
const { variant, label, items } = defineProps<{
  variant: 'do' | 'dont'
  label?: string
  items: string[]
}>()

const defaultLabel = variant === 'do' ? 'À FAIRE' : 'À ÉVITER'
const finalLabel = label ?? defaultLabel
const iconColor = variant === 'do' ? 'text-primary' : 'text-accent'
const icon = variant === 'do' ? '+' : '×'
</script>

<template>
  <div class="space-y-3" :data-variant="variant">
    <Kicker :tone="variant === 'do' ? 'secondary' : 'accent'">{{ finalLabel }}</Kicker>
    <ul class="space-y-2 list-none">
      <li
        v-for="item in items"
        :key="item"
        class="flex items-start gap-3 font-sans text-base font-light leading-relaxed text-primary"
      >
        <span
          aria-hidden="true"
          class="font-mono text-lg leading-none mt-0.5 shrink-0 w-4"
          :class="iconColor"
        >{{ icon }}</span>
        <span>{{ item }}</span>
      </li>
    </ul>
  </div>
</template>
