<script setup lang="ts">
const { num, kicker, title, as = 'h2' } = defineProps<{
  num: string
  kicker: string
  title: string
  as?: 'h2' | 'h3'
}>()
</script>

<template>
  <header class="grid grid-cols-[80px_minmax(0,1fr)] gap-x-[24px] items-baseline">
    <span
      class="font-sans font-medium text-[36px] leading-[44px] text-greyed tabular-nums"
      aria-hidden="true"
    >
      {{ num }}
    </span>
    <div class="space-y-2">
      <Kicker tone="accent">{{ kicker }}</Kicker>
      <component
        :is="as"
        :id="`rule-${num}`"
        class="font-sans font-medium not-italic text-[20px] md:text-[24px] leading-[30px] tracking-[-0.2px] text-primary scroll-mt-[80px]"
      >
        {{ title }}
      </component>
    </div>
  </header>
</template>
