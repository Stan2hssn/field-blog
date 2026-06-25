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
    aria-label="Copier le lien de l'article"
    :data-state="copied ? 'copied' : 'idle'"
    :aria-live="copied ? 'polite' : 'off'"
    @click="handleClick"
    class="copy-link"
  >
    <span class="copy-link__label">{{ label }}</span>
    <span class="copy-link__icon-wrap" aria-hidden="true">
      <svg
        class="copy-link__icon"
        width="12" height="12" viewBox="0 0 12 12"
        fill="none" stroke="currentColor" stroke-width="1"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <path class="copy-link__arc copy-link__arc--top" d="M3.5 5 V4 a2.5 2.5 0 0 1 5 0 V5" />
        <path class="copy-link__line" d="M6 5 V7" />
        <path class="copy-link__arc copy-link__arc--bot" d="M3.5 7 V8 a2.5 2.5 0 0 0 5 0 V7" />
      </svg>
    </span>
  </button>
</template>

<style scoped>
.copy-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px dashed var(--color-text-primary);
  color: var(--color-text-primary);
  background: transparent;
  cursor: pointer;
  transition:
    color var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}

.copy-link:hover,
.copy-link[data-state='copied'] {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.copy-link:active {
  transform: scale(0.96);
  transition:
    color var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.copy-link:focus-visible {
  outline: 2px solid var(--color-text-primary);
  outline-offset: 2px;
}

.copy-link__label {
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 10px;
  line-height: 14px;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  white-space: nowrap;
}

.copy-link__icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 12px;
  width: 0;
  overflow: hidden;
  transition: width var(--dur-base) var(--ease-out);
}

/* Icône cachée Default + Hover, visible uniquement sur Pressed/Copied */
.copy-link:active .copy-link__icon-wrap,
.copy-link[data-state='copied'] .copy-link__icon-wrap {
  width: 12px;
}

.copy-link__icon {
  flex-shrink: 0;
  transform: rotate(45deg);
  overflow: visible;
}

/* Step 1 — état au moment où l'icône apparaît (Pressed) : arcs encore légèrement écartés, ligne absente */
.copy-link__arc {
  transform-box: fill-box;
  transform-origin: center;
  transition: transform var(--dur-base) var(--ease-out);
}
.copy-link__arc--top { transform: translateY(-1.5px); }
.copy-link__arc--bot { transform: translateY(1.5px); }

.copy-link__line {
  transform-box: fill-box;
  transform-origin: center;
  transform: scaleY(0);
  transition: transform var(--dur-base) var(--ease-out);
}

/* Step 2 — Pressed in / Copied : arcs joints, ligne visible */
.copy-link:active .copy-link__arc--top,
.copy-link[data-state='copied'] .copy-link__arc--top { transform: translateY(0); }
.copy-link:active .copy-link__arc--bot,
.copy-link[data-state='copied'] .copy-link__arc--bot { transform: translateY(0); }
.copy-link:active .copy-link__line,
.copy-link[data-state='copied'] .copy-link__line { transform: scaleY(1); }

/* timing rapide sur press */
.copy-link:active .copy-link__icon-wrap,
.copy-link:active .copy-link__arc,
.copy-link:active .copy-link__line {
  transition-duration: var(--dur-fast);
}

@media (prefers-reduced-motion: reduce) {
  .copy-link,
  .copy-link__icon-wrap,
  .copy-link__arc,
  .copy-link__line {
    transition: none !important;
  }
}
</style>
