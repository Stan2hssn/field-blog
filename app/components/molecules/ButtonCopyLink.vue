<script setup lang="ts">
import { useClipboard } from '@vueuse/core'

const { source, idleLabel = 'COPIER LE LIEN', copiedLabel = 'LIEN COPIÉ ✓' } = defineProps<{
  source?: string
  idleLabel?: string
  copiedLabel?: string
}>()

const target = computed(() => {
  if (source) return source
  if (import.meta.client) return window.location.href
  return ''
})

const { copy, copied, isSupported } = useClipboard({ source: target, copiedDuring: 1500 })

const label = computed(() => copied.value ? copiedLabel : idleLabel)

function handleClick() {
  if (!isSupported.value || !target.value) return
  copy(target.value)
}
</script>

<template>
  <button
    type="button"
    :aria-label="`Copier le lien de l'article`"
    :data-state="copied ? 'pressed' : 'default'"
    :aria-live="copied ? 'polite' : 'off'"
    @click="handleClick"
    class="group inline-flex items-center gap-[8px] pl-[10px] pr-[10px] py-[4px] rounded-[4px] border border-dashed transition-[colors,transform] duration-base ease-out border-primary text-primary hover:border-accent hover:text-accent active:scale-[0.96] data-[state=pressed]:border-accent data-[state=pressed]:text-accent"
  >
    <span class="font-sans font-semibold text-[10px] leading-[14px] tracking-[0.4px] uppercase whitespace-nowrap">
      {{ label }}
    </span>
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      stroke-width="1"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="overflow-visible transition-[opacity,transform] duration-base ease-out rotate-45 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 data-[state=pressed]:opacity-100"
    >
      <rect x="2" y="2" width="6" height="8" rx="1" />
      <path d="M4 0H10V8" />
    </svg>
  </button>
</template>
