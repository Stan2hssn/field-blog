<script setup lang="ts">
const {
  size = 'sm',
  state = 'default',
} = defineProps<{
  size?: 'sm' | 'md'
  state?: 'default' | 'hover' | 'active' | 'focus' | 'disabled'
}>()

const sizeClass = size === 'md' ? 'text-[22px]' : 'text-[14px]'
const stateClass = {
  default: 'text-secondary',
  hover: 'text-primary',
  active: 'text-accent',
  focus: 'text-primary ring-2 ring-accent ring-offset-2 ring-offset-bg',
  disabled: 'text-greyed opacity-60',
}[state]
</script>

<template>
  <span
    :data-state="state"
    class="inline-flex items-center font-mono uppercase tracking-kicker leading-none transition-colors duration-fast ease-out"
    :class="[sizeClass, stateClass]"
  >
    <slot />
  </span>
</template>
