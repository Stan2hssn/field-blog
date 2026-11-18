<script setup lang="ts">
const { label } = defineProps<{
  label?: string
}>()
</script>

<template>
  <div class="devlog-formula flex flex-col gap-[12px] w-full bg-bg-card px-[24px] py-[20px]">
    <p v-if="label" class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-mid uppercase m-0">
      {{ label }}
    </p>
    <div class="font-mono text-[15px] leading-[26px] text-primary">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.devlog-formula :deep(p) {
  margin: 0;
}

.devlog-formula :deep(p + p) {
  margin-top: var(--space-2);
}

.devlog-formula :deep(code) {
  background: transparent;
  padding: 0;
  font-size: inherit;
}
</style>
