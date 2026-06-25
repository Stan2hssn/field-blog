<script setup lang="ts">
const {
  direction = 'right',
  to,
  label,
  tone = 'accent',
  variant = 'mono',
} = defineProps<{
  direction?: 'right' | 'left'
  to?: string
  label?: string
  tone?: 'primary' | 'accent'
  variant?: 'mono' | 'sans'
}>()

const toneClass = tone === 'accent' ? 'text-accent' : 'text-primary'
const focusClass = tone === 'accent'
  ? 'focus-visible:outline-accent'
  : 'focus-visible:outline-primary'
const arrow = direction === 'right' ? '→' : '←'
const moveClass = direction === 'right'
  ? 'group-hover:translate-x-[2px]'
  : 'group-hover:-translate-x-[2px]'

const typoClass = variant === 'mono'
  ? 'font-mono font-medium uppercase text-[11px] leading-[24px] tracking-kicker'
  : 'font-sans font-medium'

const baseClass = `group inline-flex items-center gap-[8px] underline-offset-[4px] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${focusClass}`
const arrowClass = 'inline-block transition-transform duration-base ease-out motion-reduce:transition-none'
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :class="[baseClass, typoClass, toneClass]"
  >
    <span
      v-if="direction === 'left'"
      aria-hidden="true"
      :class="[arrowClass, moveClass]"
    >{{ arrow }}</span>
    <span><slot>{{ label }}</slot></span>
    <span
      v-if="direction === 'right'"
      aria-hidden="true"
      :class="[arrowClass, moveClass]"
    >{{ arrow }}</span>
  </NuxtLink>
  <button
    v-else
    type="button"
    :class="[baseClass, typoClass, toneClass]"
  >
    <span
      v-if="direction === 'left'"
      aria-hidden="true"
      :class="[arrowClass, moveClass]"
    >{{ arrow }}</span>
    <span><slot>{{ label }}</slot></span>
    <span
      v-if="direction === 'right'"
      aria-hidden="true"
      :class="[arrowClass, moveClass]"
    >{{ arrow }}</span>
  </button>
</template>
