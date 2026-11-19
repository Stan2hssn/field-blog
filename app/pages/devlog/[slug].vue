<script setup lang="ts">
import { getChapterEntry } from '~/utils/chapters'

definePageMeta({ viewTransition: true })

useDevlogTheme()

const route = useRoute()
const slug = computed(() => String(route.params.slug))

// Le devlog est le seul blog : il sert ses articles long-form et les chapitres
// checklist du blog de mai 2026, chacun depuis sa collection.
async function findArticle(articleSlug: string) {
  const devlog = await queryCollection('devlog').path(`/devlog/${articleSlug}`).first()
  if (devlog) return { kind: 'devlog' as const, entry: devlog }
  const chapter = await queryCollection('blog').path(`/blog/${articleSlug}`).first()
  if (chapter) return { kind: 'chapter' as const, entry: chapter }
  return null
}

const { data: found } = await useAsyncData(
  () => `devlog-${slug.value}`,
  () => findArticle(slug.value),
  { watch: [slug] },
)

if (!found.value) {
  throw createError({ statusCode: 404, statusMessage: 'Article introuvable', fatal: true })
}

const article = computed(() => {
  const f = found.value
  if (!f) return null
  if (f.kind === 'devlog') {
    const e = f.entry
    return {
      prefix: e.series,
      num: e.num,
      category: 'devlog',
      title: e.title,
      lede: e.lede,
      publishDate: e.publishDate,
      readingTime: e.readingTime,
      tags: e.tags,
      sections: e.sections,
      closing: e.closing,
      nextSlug: e.nextSlug,
    }
  }
  const e = f.entry
  return {
    prefix: undefined,
    num: e.num,
    category: e.categories[0] ?? 'guides',
    title: e.title,
    lede: e.lede,
    publishDate: e.publishDate,
    readingTime: e.readingTime,
    tags: e.tags ?? e.categories,
    sections: e.sections.map(s => ({ num: s.num, kicker: s.kicker })),
    closing: e.closing,
    nextSlug: e.nextSlug,
  }
})

const { data: nextFound } = await useAsyncData(
  () => `devlog-${slug.value}-next`,
  async () => {
    const nextSlug = article.value?.nextSlug
    return nextSlug ? findArticle(nextSlug) : null
  },
  { watch: [slug] },
)

const nextForAside = computed(() => {
  const n = nextFound.value?.entry
  if (n) return { num: n.num, slug: n.slug, title: n.title, lede: n.lede, published: true }
  const nextSlug = article.value?.nextSlug
  const upcoming = nextSlug ? getChapterEntry(nextSlug) : undefined
  if (upcoming) {
    return { num: upcoming.num, slug: upcoming.slug, title: upcoming.shortTitle, lede: 'Chapitre à venir.', published: false }
  }
  return null
})

useSeoMeta({
  title: () => `${article.value?.title ?? ''} — FIELD`,
  description: () => article.value?.lede,
  ogTitle: () => `${article.value?.title ?? ''} — FIELD`,
  ogDescription: () => article.value?.lede,
  ogType: 'article',
})
</script>

<template>
  <div>
    <ScrollProgressBar />

    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:bg-bg focus:border focus:border-primary focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-kicker">
      Aller au contenu
    </a>

    <main v-if="article && found" id="main-content" class="devlog-article relative bg-bg min-h-screen p-[16px] md:p-[32px] transition-colors duration-slow" style="--title-scale: 1.55">
      <div class="fixed top-[32px] right-[32px] z-40">
        <DevlogThemeToggle />
      </div>

      <div class="grid grid-cols-1 gap-y-16 pt-[96px] lg:ml-[22.99vw] lg:gap-y-0 lg:pt-0 lg:grid-cols-[minmax(0,1fr)_32px_240px] xl:grid-cols-[minmax(0,1fr)_3.40vw_19.58vw]">
        <ArticleHeader
          state="full"
          :prefix="article.prefix"
          :num="article.num"
          :category="article.category"
          :publish-date="article.publishDate"
          :reading-time="article.readingTime"
          :title="article.title"
          :transition-name="`devlog-title-${slug}`"
          :body="article.lede"
          class="min-w-0 lg:mb-[96px]"
        />

        <!-- L'en-tete occupe sa propre ligne : le corps et l'aside commencent
             ainsi sur la meme ligne de grille, quelle que soit la hauteur du titre. -->
        <div aria-hidden="true" class="hidden lg:block lg:col-span-2" />

        <article class="min-w-0">
          <div class="flex flex-col gap-[12px] items-start w-full pt-[32px] mb-[40px]">
            <p class="font-sans font-semibold not-italic text-[12px] leading-[16px] tracking-[0.96px] text-primary uppercase whitespace-nowrap">
              {{ found.kind === 'devlog' ? 'DEVLOG' : 'ARTICLE' }}
            </p>
            <hr class="w-full h-px border-0 bg-rule m-0" aria-hidden="true" />
          </div>

          <ContentRenderer v-if="found.kind === 'devlog'" :value="found.entry" class="devlog-prose" />
          <ChapterSections v-else :sections="found.entry.sections" />

          <ClosingBlock :text="article.closing" class="mt-[176px] pt-[40px] border-t border-rule" />
        </article>

        <div aria-hidden="true" class="hidden lg:block" />

        <aside class="lg:sticky lg:top-[32px] lg:self-start">
          <AboutPanel
            base-path="/devlog"
            :publish-date="article.publishDate"
            :reading-time="article.readingTime"
            :categories="article.tags"
            :sections="article.sections"
            :next="nextForAside"
          />
        </aside>
      </div>
    </main>
  </div>
</template>
