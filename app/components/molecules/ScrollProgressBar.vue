<script setup lang="ts">
const { progress } = useScrollProgress()
const percent = computed(() => Math.round(progress.value * 100))
</script>

<template>
  <div
    role="progressbar"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-label="Progression de lecture"
    class="fixed inset-x-0 top-0 z-50 h-1 bg-transparent pointer-events-none"
  >
    <div
      class="h-full bg-accent origin-left will-change-transform"
      :style="{ transform: `scaleX(${progress})` }"
    />
  </div>
</template>
