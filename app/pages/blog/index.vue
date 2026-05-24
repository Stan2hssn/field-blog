<script setup lang="ts">
import { CHAPTERS_MANIFEST, CHAPTER_LEVELS } from '~/utils/chapters'

const { data: publishedChapters } = await useAsyncData('blog-index-chapters', () =>
  queryCollection('blog').order('num', 'ASC').all(),
)

const publishedBySlug = computed(() => {
  const map = new Map<string, NonNullable<typeof publishedChapters.value>[number]>()
  for (const c of publishedChapters.value ?? []) map.set(c.slug, c)
  return map
})

const allSlugs = computed(() => new Set(CHAPTERS_MANIFEST.map((c) => c.slug)))

const TOTAL = CHAPTERS_MANIFEST.length

const carousel = CHAPTERS_MANIFEST.map((entry) => {
  const fallbackLede = entry.level === 'fundamentals'
    ? 'Fondations du handoff — chapitre en cours d\'écriture.'
    : entry.level === 'practice'
      ? 'Pratiques avancées — chapitre en cours d\'écriture.'
      : 'Collaboration & systèmes — chapitre en cours d\'écriture.'
  const categoryLabel = CHAPTER_LEVELS[entry.level].label.toUpperCase()
  return {
    num: entry.num,
    slug: entry.slug,
    fullTitle: entry.fullTitle,
    fallbackLede,
    categoryLabel,
    level: entry.level,
  }
})

const currentIndex = ref(0)
const currentEntry = computed(() => carousel[currentIndex.value]!)
const currentPublished = computed(() => publishedBySlug.value.get(currentEntry.value.slug) ?? null)

const currentChapter = computed(() => {
  const e = currentEntry.value
  const p = currentPublished.value
  return {
    num: e.num,
    slug: e.slug,
    title: p?.title ?? e.fullTitle,
    lede: p?.lede ?? e.fallbackLede,
    readingTime: p?.readingTime ?? 8,
    publishDate: (p?.publishDate ?? new Date()) as Date | string,
    tags: p?.tags ?? ['Figma', 'Handoff', 'Checklist'],
    category: e.categoryLabel,
  }
})

function nextCard() {
  currentIndex.value = (currentIndex.value + 1) % TOTAL
}
function prevCard() {
  currentIndex.value = (currentIndex.value - 1 + TOTAL) % TOTAL
}
function goTo(num: string) {
  const idx = carousel.findIndex((c) => c.num === num)
  if (idx >= 0) currentIndex.value = idx
}

if (import.meta.client) {
  let wheelLock = false
  let wheelTimer: ReturnType<typeof setTimeout> | null = null
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    if (wheelLock) return
    if (Math.abs(e.deltaY) < 6 && Math.abs(e.deltaX) < 6) return
    wheelLock = true
    if (e.deltaY > 0 || e.deltaX > 0) nextCard()
    else prevCard()
    if (wheelTimer) clearTimeout(wheelTimer)
    wheelTimer = setTimeout(() => { wheelLock = false }, 380)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault(); nextCard()
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault(); prevCard()
    } else if (e.key === 'Home') {
      e.preventDefault(); currentIndex.value = 0
    } else if (e.key === 'End') {
      e.preventDefault(); currentIndex.value = TOTAL - 1
    }
  }
  let touchY: number | null = null
  const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0]?.clientY ?? null }
  const onTouchEnd = (e: TouchEvent) => {
    if (touchY === null) return
    const endY = e.changedTouches[0]?.clientY ?? touchY
    const delta = touchY - endY
    if (Math.abs(delta) > 30) {
      if (delta > 0) nextCard()
      else prevCard()
    }
    touchY = null
  }

  onMounted(() => {
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onScopeDispose(() => {
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchend', onTouchEnd)
    if (wheelTimer) clearTimeout(wheelTimer)
  })
}

useSeoMeta({
  title: 'Field Notes — Index',
  description: 'Field Notes est un journal sur ce qui se passe entre la maquette et le code, quand un designer, un dev et une IA travaillent sur le même produit. Chaque chapitre est une étude de cas — règles, erreurs, fix qui marchent.',
  ogTitle: 'Field Notes — Index',
  ogDescription: 'Field Notes est un journal sur ce qui se passe entre la maquette et le code, quand un designer, un dev et une IA travaillent sur le même produit. Chaque chapitre est une étude de cas — règles, erreurs, fix qui marchent.',
  ogType: 'website',
})
</script>

<template>
  <main
    class="relative bg-bg w-[100dvw] h-[100dvh] overflow-hidden flex items-stretch gap-[128px] p-[32px] touch-none select-none"
    role="region"
    aria-roledescription="carousel"
    aria-label="Chapitres FIELD®"
  >
    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:bg-bg focus:border focus:border-primary focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-kicker">
      Aller au contenu
    </a>

    <div id="main-content" class="flex flex-1 items-center min-w-0 gap-[32px]">
      <aside
        class="relative flex flex-col items-start justify-center self-stretch w-[22px]"
        aria-label="Chapitres"
      >
        <BrandLogo
          as="link"
          to="/blog"
          size="hero"
          class="absolute left-0 top-0"
        />
        <ChapterListSidebar
          :current-num="currentChapter.num"
          :published-slugs="allSlugs"
          @select="goTo"
        />
      </aside>

      <div class="flex-1 h-px bg-rule self-center" aria-hidden="true" />

      <Transition name="card" mode="out-in">
        <FeaturedCard
          :key="currentChapter.num"
          :num="currentChapter.num"
          :slug="currentChapter.slug"
          :title="currentChapter.title"
          :lede="currentChapter.lede"
          :reading-time="currentChapter.readingTime"
          :category="currentChapter.category"
        />
      </Transition>
    </div>

    <ImageCardStack class="self-center shrink-0" />

    <aside
      class="relative flex flex-col items-end justify-center w-[402px] self-stretch"
      aria-label="Intro et accès article"
    >
      <div class="absolute left-0 top-0 w-full">
        <IntroBlock />
      </div>

      <Transition name="card" mode="out-in">
        <CtaReadMore
          :key="currentChapter.num"
          :slug="currentChapter.slug"
          :tags="currentChapter.tags"
          :publish-date="currentChapter.publishDate"
        />
      </Transition>
    </aside>

    <div class="sr-only" role="status" aria-live="polite">
      Chapitre {{ currentChapter.num }} sur {{ TOTAL }} — {{ currentChapter.title }}
    </div>
  </main>
</template>

<style scoped>
.card-enter-active,
.card-leave-active {
  transition: opacity 280ms ease-out, transform 280ms ease-out;
}
.card-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.card-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

@media (prefers-reduced-motion: reduce) {
  .card-enter-active,
  .card-leave-active {
    transition: opacity 80ms linear;
    transform: none;
  }
  .card-enter-from,
  .card-leave-to {
    transform: none;
  }
}
</style>
