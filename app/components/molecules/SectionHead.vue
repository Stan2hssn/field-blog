<script setup lang="ts">
const { num, kicker, title, as = 'h2' } = defineProps<{
  num: string
  kicker: string
  title: string
  as?: 'h2' | 'h3'
}>()
</script>

<template>
  <header class="flex gap-[40px] items-start w-full">
    <p
      class="font-sans font-medium not-italic text-[88px] leading-[88px] tracking-[-2px] text-greyed whitespace-nowrap shrink-0"
      aria-hidden="true"
    >
      {{ num }}
    </p>
    <div class="flex-1 flex flex-col gap-[16px] items-start justify-end min-w-0">
      <p class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-accent whitespace-nowrap">
        {{ kicker }}
      </p>
      <component
        :is="as"
        :id="`rule-${num}`"
        class="font-sans font-light italic text-[36px] leading-[44px] text-primary scroll-mt-[80px] w-full"
      >
        {{ title }}
      </component>
    </div>
  </header>
</template>
