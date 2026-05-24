<script setup lang="ts">
const { variant, label, items } = defineProps<{
  variant: 'do' | 'dont'
  label?: string
  items: string[]
}>()

const finalLabel = label ?? (variant === 'do' ? 'À FAIRE' : 'À ÉVITER')
const labelColor = variant === 'do' ? 'text-primary' : 'text-secondary'
const labelId = useId()
</script>

<template>
  <div class="flex flex-col gap-[16px] items-start w-[361px] max-w-full pt-[16px] border-t border-rule" :data-variant="variant">
    <p
      :id="labelId"
      class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker whitespace-nowrap"
      :class="labelColor"
    >
      {{ finalLabel }}
    </p>
    <ul class="flex flex-col gap-[12px] w-full list-none" :aria-labelledby="labelId">
      <li
        v-for="item in items"
        :key="item"
        class="dodont-item font-sans font-normal not-italic text-[15px] leading-[24px] text-primary"
      >
        {{ item }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.dodont-item::before {
  content: '— ';
  display: inline;
}
</style>
