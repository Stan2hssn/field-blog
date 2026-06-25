<script setup lang="ts">
const { text, kicker = 'EN UNE PHRASE' } = defineProps<{
  text: string
  kicker?: string
}>()
</script>

<template>
  <section class="flex flex-col gap-[32px] items-start w-full">
    <p class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-accent uppercase whitespace-nowrap">
      {{ kicker }}
    </p>
    <blockquote class="font-sans font-light italic text-[42px] leading-[56px] text-primary w-full m-0">
      {{ text }}
    </blockquote>
  </section>
</template>
