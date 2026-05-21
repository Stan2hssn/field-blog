<script setup lang="ts">
const { variant, label, items } = defineProps<{
  variant: 'do' | 'dont'
  label?: string
  items: string[]
}>()

const finalLabel = label ?? (variant === 'do' ? 'À FAIRE' : 'À ÉVITER')
</script>

<template>
  <div class="space-y-3" :data-variant="variant">
    <Kicker tone="greyed">{{ finalLabel }}</Kicker>
    <ul class="space-y-1.5 list-none">
      <li
        v-for="item in items"
        :key="item"
        class="font-sans font-light text-[14px] leading-[22px] text-primary"
      >
        {{ item }}
      </li>
    </ul>
  </div>
</template>
