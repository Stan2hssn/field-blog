<script setup lang="ts">
const { as = 'span', tone = 'secondary' } = defineProps<{
  as?: 'span' | 'p' | 'div'
  tone?: 'primary' | 'secondary' | 'accent'
}>()

const toneClass = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  accent: 'text-accent',
}[tone]
</script>

<template>
  <component
    :is="as"
    class="font-mono uppercase tracking-kicker text-xs leading-none"
    :class="toneClass"
  >
    <slot />
  </component>
</template>
