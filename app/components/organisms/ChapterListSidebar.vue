<script setup lang="ts">
import { CHAPTERS_MANIFEST, CHAPTER_PARTS, type ChapterPart } from '~/utils/chapters'

const { currentSlug, publishedSlugs } = defineProps<{
  currentSlug?: string
  publishedSlugs: Set<string>
}>()

const groupedChapters = computed(() => {
  const groups: Record<ChapterPart, typeof CHAPTERS_MANIFEST> = { 1: [], 2: [], 3: [] }
  for (const c of CHAPTERS_MANIFEST) groups[c.part].push(c)
  return ([1, 2, 3] as const).map((part) => ({
    part,
    title: CHAPTER_PARTS[part],
    chapters: groups[part],
  }))
})

function isCurrent(slug: string) {
  return slug === currentSlug
}
</script>

<template>
  <nav class="space-y-8" aria-label="Sommaire des chapitres">
    <div v-for="group in groupedChapters" :key="group.part" class="space-y-3">
      <Kicker tone="greyed">
        Partie {{ group.part.toString().padStart(2, '0') }} · {{ group.title }}
      </Kicker>
      <ul class="space-y-0.5 list-none">
        <li v-for="ch in group.chapters" :key="ch.num">
          <NuxtLink
            v-if="publishedSlugs.has(ch.slug)"
            :to="`/blog/${ch.slug}`"
            class="group flex items-baseline gap-3 py-1.5 transition-colors duration-fast ease-out"
            :class="isCurrent(ch.slug)
              ? 'text-primary'
              : 'text-secondary hover:text-primary'"
            :aria-current="isCurrent(ch.slug) ? 'page' : undefined"
          >
            <span class="font-mono text-xs tabular-nums w-6 shrink-0">{{ ch.num }}</span>
            <span class="font-sans text-sm leading-tight">{{ ch.shortTitle }}</span>
          </NuxtLink>
          <div
            v-else
            class="flex items-baseline gap-3 py-1.5 text-greyed"
            aria-disabled="true"
          >
            <span class="font-mono text-xs tabular-nums w-6 shrink-0">{{ ch.num }}</span>
            <span class="font-sans text-sm leading-tight italic">{{ ch.shortTitle }}</span>
            <span class="font-mono text-[10px] uppercase tracking-kicker text-greyed/60 ml-auto whitespace-nowrap">à venir</span>
          </div>
        </li>
      </ul>
    </div>
  </nav>
</template>
