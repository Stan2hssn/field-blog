<script setup lang="ts">
const {
  variant = 'section',
  as,
  italic,
} = defineProps<{
  variant?: 'display' | 'section' | 'card'
  as?: 'h1' | 'h2' | 'h3' | 'h4'
  italic?: boolean
}>()

const defaults = {
  display: { tag: 'h1' as const, classes: 'text-4xl md:text-5xl lg:text-6xl font-light leading-[1.05] tracking-tight', italic: true },
  section: { tag: 'h2' as const, classes: 'text-2xl md:text-3xl font-medium leading-tight', italic: false },
  card: { tag: 'h3' as const, classes: 'text-lg md:text-xl font-medium leading-snug', italic: false },
}[variant]

const tag = as ?? defaults.tag
const useItalic = italic ?? defaults.italic
const variantClass = defaults.classes
</script>

<template>
  <component
    :is="tag"
    class="font-sans text-primary"
    :class="[variantClass, useItalic && 'italic']"
  >
    <slot />
  </component>
</template>
