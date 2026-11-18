<script setup lang="ts">
const { title, file } = defineProps<{
  title: string
  file?: string
}>()

const slots = useSlots()
const filled = computed(() => Boolean(slots.default))
</script>

<template>
  <div
    class="devlog-your-code flex flex-col gap-[16px] w-full p-[24px] rounded-[4px] border border-primary"
    :class="filled ? 'border-solid' : 'border-dashed'"
  >
    <div class="flex flex-wrap items-baseline justify-between gap-[12px]">
      <p class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-accent uppercase m-0">
        MON CODE · {{ title }}
      </p>
      <p v-if="file" class="font-mono text-[11px] leading-[16px] text-mid m-0">
        {{ file }}
      </p>
    </div>
    <slot>
      <p class="font-sans font-light italic text-[15px] leading-[24px] text-mid m-0">
        À compléter une fois l'étape codée : l'extrait qui compte, et ce qui a coincé.
      </p>
    </slot>
  </div>
</template>

<style scoped>
.devlog-your-code :deep(pre) {
  margin: 0;
}
</style>
