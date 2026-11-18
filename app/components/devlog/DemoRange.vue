<script setup lang="ts">
const { label, min, max, step = 1, format } = defineProps<{
  label: string
  min: number
  max: number
  step?: number
  format?: (v: number) => string
}>()

const model = defineModel<number>({ required: true })
const id = useId()
const shown = computed(() => (format ? format(model.value) : String(model.value)))
</script>

<template>
  <div class="flex items-center gap-[12px]">
    <label :for="id" class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-primary uppercase whitespace-nowrap">
      {{ label }}
    </label>
    <input
      :id="id"
      v-model.number="model"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      class="demo-range w-[140px]"
    />
    <output :for="id" class="font-mono text-[12px] leading-[16px] text-secondary tabular-nums min-w-[48px]">
      {{ shown }}
    </output>
  </div>
</template>

<style scoped>
.demo-range {
  accent-color: var(--color-accent);
}
</style>
