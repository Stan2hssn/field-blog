<script setup lang="ts">
const { title } = defineProps<{
  title: string
}>()
</script>

<template>
  <div class="demo-panel flex flex-col w-full bg-bg-card">
    <div class="flex items-center justify-between gap-[12px] px-[16px] py-[10px] border-b border-greyed">
      <p class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-primary uppercase m-0">
        {{ title }}
      </p>
      <p class="font-mono font-medium text-[10px] leading-[16px] tracking-kicker text-accent uppercase m-0">
        INTERACTIF
      </p>
    </div>

    <div class="relative w-full select-none touch-none">
      <slot />
    </div>

    <div v-if="$slots.controls" class="flex flex-wrap gap-x-[32px] gap-y-[12px] px-[16px] py-[14px] border-t border-greyed">
      <slot name="controls" />
    </div>

    <div v-if="$slots.readout" class="demo-readout grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-[24px] gap-y-[6px] px-[16px] py-[14px] border-t border-greyed font-mono text-[12px] leading-[18px] text-secondary">
      <slot name="readout" />
    </div>
  </div>
</template>

<style scoped>
.demo-readout :deep(b) {
  font-weight: 500;
  color: var(--color-text-primary);
}
</style>
