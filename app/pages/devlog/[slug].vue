<script setup lang="ts">
definePageMeta({ viewTransition: true })

useDevlogTheme()

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data: entry } = await useAsyncData(
  () => `devlog-${slug.value}`,
  () => queryCollection('devlog').path(`/devlog/${slug.value}`).first(),
  { watch: [slug] },
)

if (!entry.value) {
  throw createError({ statusCode: 404, statusMessage: 'Article introuvable', fatal: true })
}

const { data: nextEntry } = await useAsyncData(
  () => `devlog-${slug.value}-next`,
  async () => {
    const nextSlug = entry.value?.nextSlug
    if (!nextSlug) return null
    return queryCollection('devlog').path(`/devlog/${nextSlug}`).first()
  },
  { watch: [slug] },
)

const nextForAside = computed(() => {
  const n = nextEntry.value
  if (!n) return null
  return { num: n.num, slug: n.slug, title: n.title, lede: n.lede, published: true }
})

useSeoMeta({
  title: () => `${entry.value?.title ?? ''} — FIELD`,
  description: () => entry.value?.lede,
  ogTitle: () => `${entry.value?.title ?? ''} — FIELD`,
  ogDescription: () => entry.value?.lede,
  ogType: 'article',
})
</script>

<template>
  <div>
    <ScrollProgressBar />

    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:bg-bg focus:border focus:border-primary focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-kicker">
      Aller au contenu
    </a>

    <main v-if="entry" id="main-content" class="devlog-article relative bg-bg min-h-screen p-[16px] md:p-[32px] transition-colors duration-slow" style="--title-scale: 1.55">
      <div class="fixed top-[32px] right-[32px] z-40">
        <DevlogThemeToggle />
      </div>

      <div class="grid grid-cols-1 gap-y-16 pt-[96px] lg:ml-[22.99vw] lg:gap-y-0 lg:pt-0 lg:grid-cols-[minmax(0,1fr)_32px_240px] xl:grid-cols-[minmax(0,1fr)_3.40vw_19.58vw]">
        <ArticleHeader
          state="full"
          :prefix="entry.series"
          :num="entry.num"
          category="devlog"
          :publish-date="entry.publishDate"
          :reading-time="entry.readingTime"
          :title="entry.title"
          :transition-name="`devlog-title-${slug}`"
          :body="entry.lede"
          class="min-w-0 lg:mb-[96px]"
        />

        <!-- L'en-tete occupe sa propre ligne : le corps et l'aside commencent
             ainsi sur la meme ligne de grille, quelle que soit la hauteur du titre. -->
        <div aria-hidden="true" class="hidden lg:block lg:col-span-2" />

        <article class="min-w-0">
          <div class="flex flex-col gap-[12px] items-start w-full pt-[32px] mb-[40px]">
            <p class="font-sans font-semibold not-italic text-[12px] leading-[16px] tracking-[0.96px] text-primary uppercase whitespace-nowrap">
              DEVLOG
            </p>
            <hr class="w-full h-px border-0 bg-rule m-0" aria-hidden="true" />
          </div>

          <ContentRenderer :value="entry" class="devlog-prose" />

          <ClosingBlock :text="entry.closing" class="mt-[176px] pt-[40px] border-t border-rule" />
        </article>

        <div aria-hidden="true" class="hidden lg:block" />

        <aside class="lg:sticky lg:top-[32px] lg:self-start">
          <AboutPanel
            base-path="/devlog"
            :publish-date="entry.publishDate"
            :reading-time="entry.readingTime"
            :categories="entry.tags"
            :sections="entry.sections"
            :next="nextForAside"
          />
        </aside>
      </div>
    </main>
  </div>
</template>
