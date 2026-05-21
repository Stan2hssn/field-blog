<script setup lang="ts">
const {
  num,
  state = 'default',
} = defineProps<{
  num: string
  state?: 'default' | 'active'
}>()

const isActive = state === 'active'
</script>

<template>
  <span
    :data-state="state"
    class="relative inline-flex flex-col items-center justify-center gap-[10px] transition-[padding] duration-base ease-out"
    :class="isActive ? 'pl-[8px]' : ''"
  >
    <span
      class="font-mono font-medium text-[11px] leading-[16px] tracking-[0.44px] whitespace-nowrap transition-colors duration-fast ease-out"
      :class="isActive ? 'text-accent' : 'text-greyed'"
    >
      {{ num }}
    </span>
    <span
      aria-hidden="true"
      class="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-rule transition-[width] duration-[180ms] ease-out"
      :class="isActive ? 'w-[4px]' : 'w-0'"
    />
  </span>
</template>
