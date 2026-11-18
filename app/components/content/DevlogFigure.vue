<script setup lang="ts">
const { n, caption } = defineProps<{
  n: string
  caption: string
}>()
</script>

<template>
  <figure class="devlog-figure m-0 flex flex-col gap-[16px] w-full">
    <div class="w-full border-t border-rule pt-[24px]">
      <slot />
    </div>
    <figcaption class="flex gap-[12px] font-mono font-medium text-[11px] leading-[16px] tracking-kicker uppercase">
      <span class="text-accent whitespace-nowrap">FIG. {{ n }}</span>
      <span class="text-mid">{{ caption }}</span>
    </figcaption>
  </figure>
</template>
