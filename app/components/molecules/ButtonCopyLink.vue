<script setup lang="ts">
import { useClipboard } from '@vueuse/core'

const { source, idleLabel = 'COPIER LE LIEN', copiedLabel = 'COPIÉ' } = defineProps<{
  source?: string
  idleLabel?: string
  copiedLabel?: string
}>()

const target = computed(() => {
  if (source) return source
  if (import.meta.client) return window.location.href
  return ''
})

const { copy, copied, isSupported } = useClipboard({ source: target, copiedDuring: 1800 })

const label = computed(() => copied.value ? copiedLabel : idleLabel)

function handleClick() {
  if (target.value) copy(target.value)
}
</script>

<template>
  <button
    type="button"
    :disabled="!isSupported"
    :data-state="copied ? 'copied' : 'idle'"
    :aria-live="copied ? 'polite' : 'off'"
    @click="handleClick"
    class="group inline-flex items-center gap-2 px-4 py-2 border border-rule rounded-full font-mono text-xs uppercase tracking-kicker text-primary transition-colors duration-base ease-out hover:bg-primary hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <svg
      v-if="copied"
      aria-hidden="true"
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"
      class="transition-transform duration-base ease-out scale-110"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
    <svg
      v-else
      aria-hidden="true"
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"
      class="transition-transform duration-base ease-out group-hover:rotate-3"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
    <span>{{ label }}</span>
  </button>
</template>
