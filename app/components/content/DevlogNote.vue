<script setup lang="ts">
const { kicker = 'À RETENIR', tone = 'primary' } = defineProps<{
  kicker?: string
  tone?: 'primary' | 'accent'
}>()
</script>

<template>
  <aside class="devlog-note flex flex-col gap-[16px] pt-[24px] border-t border-rule w-full">
    <p
      class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker uppercase m-0"
      :class="tone === 'accent' ? 'text-accent' : 'text-primary'"
    >
      {{ kicker }}
    </p>
    <div class="font-sans font-light text-[15px] leading-[24px] text-primary">
      <slot />
    </div>
  </aside>
</template>

<style scoped>
.devlog-note :deep(p) {
  margin: 0;
}

.devlog-note :deep(p + p) {
  margin-top: var(--space-4);
}
</style>
