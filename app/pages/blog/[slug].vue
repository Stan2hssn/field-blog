<script setup lang="ts">
import { getChapterEntry } from '~/utils/chapters'

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data: chapter } = await useAsyncData(
  () => `blog-${slug.value}`,
  () => queryCollection('blog').path(`/blog/${slug.value}`).first(),
  { watch: [slug] },
)

if (!chapter.value) {
  throw createError({ statusCode: 404, statusMessage: 'Chapitre introuvable', fatal: true })
}

const { data: nextChapter } = await useAsyncData(
  () => `blog-${slug.value}-next`,
  async () => {
    const nextSlug = chapter.value?.nextSlug
    if (!nextSlug) return null
    return queryCollection('blog').path(`/blog/${nextSlug}`).first()
  },
  { watch: [slug] },
)

const primaryCategory = computed(() => chapter.value?.categories[0] ?? 'guides')

const nextManifest = computed(() => {
  const nextSlug = chapter.value?.nextSlug
  return nextSlug ? getChapterEntry(nextSlug) ?? null : null
})

const nextForAside = computed(() => {
  if (nextChapter.value) {
    return {
      num: nextChapter.value.num,
      slug: nextChapter.value.slug,
      title: nextChapter.value.title,
      lede: nextChapter.value.lede,
      published: true,
    }
  }
  if (nextManifest.value) {
    return {
      num: nextManifest.value.num,
      slug: nextManifest.value.slug,
      title: nextManifest.value.shortTitle,
      lede: 'Chapitre à venir.',
      published: false,
    }
  }
  return null
})


onMounted(() => {
  markPhase('leave:end')
})


useSeoMeta({
  title: () => `${chapter.value?.title ?? ''} — FIELD`,
  description: () => chapter.value?.lede,
  ogTitle: () => `${chapter.value?.title ?? ''} — FIELD`,
  ogDescription: () => chapter.value?.lede,
  ogType: 'article',
})

</script>

<template>
  <div>
    <ScrollProgressBar />

    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:bg-bg focus:border focus:border-primary focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-kicker">
      Aller au contenu
    </a>

    <main v-if="chapter" id="main-content" class="relative bg-bg min-h-screen p-[32px]">

      <div class="grid grid-cols-1 gap-y-16 pt-[96px] lg:ml-[22.99vw] lg:gap-y-0 lg:pt-0 lg:grid-cols-[minmax(0,1fr)_32px_240px] xl:grid-cols-[minmax(0,1fr)_3.40vw_19.58vw]">
        <article class="min-w-0">
          <ArticleHeader
            state="full"
            :num="chapter.num"
            :category="primaryCategory"
            :publish-date="chapter.publishDate"
            :reading-time="chapter.readingTime"
            :title="chapter.title"
            :body="chapter.lede"
            class="mb-[96px]"
          />

          <div
            class="flex flex-col gap-[12px] items-start w-full mb-[40px]"
          >
            <p class="font-sans font-semibold not-italic text-[12px] leading-[16px] tracking-[0.96px] text-primary uppercase whitespace-nowrap">
              ARTICLE
            </p>
            <hr class="w-full h-px border-0 bg-rule m-0" aria-hidden="true" />
          </div>

          <section
            v-for="(section, idx) in chapter.sections"
            :key="section.num"
            class="flex flex-col gap-[40px] w-full"
            :class="idx > 0 && 'mt-[176px] pt-[40px] border-t border-rule'"
          >
            <SectionHead
              :num="section.num"
              :kicker="section.kicker"
              :title="section.title"
              as="h2"
            />

            <p class="font-sans font-light text-[16px] leading-[28px] text-primary w-full">
              {{ section.body }}
            </p>

            <div class="grid md:grid-cols-2 gap-x-[64px] gap-y-[24px] w-full">
              <DoDontList variant="do" :items="section.doItems" />
              <DoDontList variant="dont" :items="section.dontItems" />
            </div>

            <PullQuote>{{ section.why }}</PullQuote>
          </section>

          <ClosingBlock :text="chapter.closing" class="mt-[176px] pt-[40px] border-t border-rule" />
        </article>

        <div aria-hidden="true" class="hidden lg:block" />

        <aside
          class="lg:mt-[384px] lg:sticky lg:top-[32px] lg:self-start"
        >
          <AboutPanel
            :publish-date="chapter.publishDate"
            :reading-time="chapter.readingTime"
            :categories="chapter.categories"
            :sections="chapter.sections.map(s => ({ num: s.num, kicker: s.kicker }))"
            :next="nextForAside"
          />
        </aside>
      </div>
    </main>
  </div>
</template>
