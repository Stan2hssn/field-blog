<script setup lang="ts">
const {
  as = 'p',
  size = 'base',
  tone = 'primary',
  italic = false,
} = defineProps<{
  as?: 'p' | 'span' | 'div'
  size?: 'lg' | 'base' | 'sm'
  tone?: 'primary' | 'secondary' | 'greyed'
  italic?: boolean
}>()

const sizeClass = { lg: 'text-lg leading-relaxed', base: 'text-base leading-relaxed', sm: 'text-sm leading-snug' }[size]
const toneClass = { primary: 'text-primary', secondary: 'text-secondary', greyed: 'text-greyed' }[tone]
</script>

<template>
  <component
    :is="as"
    class="font-sans font-light"
    :class="[sizeClass, toneClass, italic && 'italic']"
  >
    <slot />
  </component>
</template>
