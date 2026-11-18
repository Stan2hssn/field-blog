<script setup lang="ts">
const { code = '', language = null, class: className = null } = defineProps<{
  code?: string
  language?: string | null
  filename?: string | null
  highlights?: number[]
  meta?: string | null
  class?: string | null
}>()

const preEl = useTemplateRef<HTMLPreElement>('preEl')
const copied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  try {
    await navigator.clipboard.writeText(code)
    copied.value = true
    clearTimeout(resetTimer)
    resetTimer = setTimeout(() => { copied.value = false }, 1600)
  }
  catch {
    selectCode()
  }
}

// Cmd/Ctrl+A dans un bloc ne selectionne que ce bloc, pas toute la page.
function selectCode() {
  const el = preEl.value
  const selection = window.getSelection()
  if (!el || !selection) return
  const range = document.createRange()
  range.selectNodeContents(el)
  selection.removeAllRanges()
  selection.addRange(range)
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
    event.preventDefault()
    selectCode()
  }
}

onBeforeUnmount(() => clearTimeout(resetTimer))
</script>

<template>
  <div class="prose-pre group/pre relative">
    <pre
      ref="preEl"
      :class="className"
      tabindex="0"
      :aria-label="language ? `Code ${language}` : 'Code'"
      @keydown="onKeydown"
    ><slot /></pre>
    <button
      type="button"
      class="prose-pre__copy"
      :aria-label="copied ? 'Code copié' : 'Copier le code'"
      @click="copy"
    >
      {{ copied ? 'Copié' : 'Copier' }}
    </button>
  </div>
</template>

<style>
pre code .line {
  display: block;
}

.prose-pre__copy {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  border: 1px solid var(--color-text-greyed);
  border-radius: 4px;
  background: var(--color-bg-page);
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 16px;
  letter-spacing: var(--tracking-kicker);
  text-transform: uppercase;
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.prose-pre:hover .prose-pre__copy,
.prose-pre:focus-within .prose-pre__copy {
  opacity: 1;
}

.prose-pre__copy:hover {
  color: var(--color-text-primary);
}

.prose-pre__copy:focus-visible {
  opacity: 1;
  outline: 1px solid var(--color-accent);
  outline-offset: 2px;
}

.prose-pre pre:focus-visible {
  outline: 1px solid var(--color-accent);
  outline-offset: -1px;
}

@media (hover: none) {
  .prose-pre__copy {
    opacity: 1;
  }
}
</style>
