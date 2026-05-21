<script setup lang="ts">
const { gallery } = defineProps<{
  gallery?: Array<{ src?: string; alt: string; caption?: string }>
}>()

const placeholder = [
  { alt: 'Capture Figma — Auto Layout démonstration', caption: 'Figma · Auto Layout' },
  { alt: 'Capture Claude Code — workflow handoff', caption: 'Claude · handoff' },
  { alt: 'Token system Obys-style', caption: 'Tokens · Obys' },
  { alt: 'Diagramme MCP Figma', caption: 'MCP · pipeline' },
  { alt: 'Composant Button avec variants', caption: 'Components' },
  { alt: 'Anatomie d\'un fichier propre', caption: 'Structure' },
]

const items = computed(() => gallery && gallery.length ? gallery : placeholder)
</script>

<template>
  <div class="relative grid grid-cols-2 md:grid-cols-3 gap-3" aria-label="Galerie de captures">
    <figure
      v-for="(item, i) in items"
      :key="i"
      class="relative aspect-[4/5] bg-bg-card border border-rule/15 rounded-sm overflow-hidden group"
    >
      <NuxtImg
        v-if="item.src"
        :src="item.src"
        :alt="item.alt"
        loading="lazy"
        class="w-full h-full object-cover transition-transform duration-slow ease-out group-hover:scale-[1.02]"
      />
      <div v-else class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
        <Kicker tone="greyed">{{ String(i + 1).padStart(2, '0') }}</Kicker>
        <span class="mt-2 font-mono text-[10px] uppercase tracking-kicker text-greyed">
          {{ item.caption ?? 'placeholder' }}
        </span>
      </div>
      <figcaption class="sr-only">{{ item.alt }}</figcaption>
    </figure>
  </div>
</template>
