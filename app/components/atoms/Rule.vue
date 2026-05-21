<script setup lang="ts">
const {
  orientation = 'horizontal',
  weight = 'regular',
  dashed = false,
  tone = 'rule',
} = defineProps<{
  orientation?: 'horizontal' | 'vertical'
  weight?: 'regular' | 'thick'
  dashed?: boolean
  tone?: 'rule' | 'greyed'
}>()

const colorClass = tone === 'greyed' ? 'border-greyed' : 'border-rule'
const thicknessClass = orientation === 'horizontal'
  ? (weight === 'thick' ? 'border-t-2' : 'border-t')
  : (weight === 'thick' ? 'border-l-2' : 'border-l')
const styleClass = dashed ? 'border-dashed' : 'border-solid'
</script>

<template>
  <hr
    v-if="orientation === 'horizontal'"
    role="separator"
    class="m-0 w-full border-0"
    :class="[thicknessClass, styleClass, colorClass]"
  />
  <span
    v-else
    role="separator"
    aria-orientation="vertical"
    class="inline-block self-stretch border-0"
    :class="[thicknessClass, styleClass, colorClass]"
  />
</template>
