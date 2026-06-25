<script setup lang="ts">
const {
  kicker = 'POURQUOI',
  size = 'default',
  kickerTone = 'primary',
} = defineProps<{
  kicker?: string
  size?: 'default' | 'closing'
  kickerTone?: 'primary' | 'accent'
}>()

const gapClass = size === 'closing' ? 'gap-[32px]' : 'gap-[24px]'
const textClass = size === 'closing'
  ? 'text-[42px] leading-[56px]'
  : 'text-[26px] leading-[36px]'
const kickerToneClass = kickerTone === 'accent' ? 'text-accent' : 'text-primary'
</script>

<template>
  <blockquote class="flex flex-col items-start pt-[24px] border-t border-rule w-full" :class="gapClass">
    <p
      class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker whitespace-nowrap"
      :class="kickerToneClass"
    >
      {{ kicker }}
    </p>
    <p class="font-sans font-light italic text-primary w-full" :class="textClass">
      <slot />
    </p>
  </blockquote>
</template>
