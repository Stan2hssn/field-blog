<script setup lang="ts">
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

useSeoMeta({
  title: () => chapter.value?.title,
  description: () => chapter.value?.lede,
  ogTitle: () => chapter.value?.title,
  ogDescription: () => chapter.value?.lede,
  ogType: 'article',
})
</script>

<template>
  <ScrollProgressBar />

  <main v-if="chapter" class="relative bg-bg min-h-screen p-[32px]">
    <BrandLogo
      as="link"
      to="/blog"
      size="hero"
      class="absolute left-[32px] top-[32px] z-10"
    />

    <div class="ml-[300px] grid grid-cols-[minmax(0,786px)_64px_282px] max-xl:grid-cols-[minmax(0,1fr)_32px_240px] max-lg:grid-cols-1 max-lg:gap-y-16 max-lg:ml-0 max-lg:pt-[120px]">
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

        <section
          v-for="(section, idx) in chapter.sections"
          :key="section.num"
          class="space-y-[40px]"
          :class="idx > 0 && 'border-t border-rule pt-[40px] mt-[40px]'"
        >
          <SectionHead
            :num="section.num"
            :kicker="section.kicker"
            :title="section.title"
            as="h2"
          />

          <div class="grid grid-cols-[80px_minmax(0,1fr)] gap-x-[24px]">
            <div />
            <p class="font-sans font-light text-[16px] leading-[28px] text-primary">
              {{ section.body }}
            </p>
          </div>

          <div class="grid grid-cols-[80px_minmax(0,1fr)] gap-x-[24px]">
            <div />
            <div class="grid md:grid-cols-2 gap-x-[64px] gap-y-[24px]">
              <DoDontList variant="do" :items="section.doItems" />
              <DoDontList variant="dont" :items="section.dontItems" />
            </div>
          </div>

          <div class="grid grid-cols-[80px_minmax(0,1fr)] gap-x-[24px]">
            <div />
            <PullQuote>{{ section.why }}</PullQuote>
          </div>
        </section>

        <ClosingBlock :text="chapter.closing" class="mt-[80px] pt-[40px] border-t border-rule" />
      </article>

      <div aria-hidden="true" />

      <aside class="lg:sticky lg:top-[32px] lg:self-start">
        <AboutPanel
          :publish-date="chapter.publishDate"
          :reading-time="chapter.readingTime"
          :authors="chapter.authors"
          :categories="chapter.categories"
        />
      </aside>
    </div>

    <NextChapterCard
      :next="nextChapter ? {
        num: nextChapter.num,
        slug: nextChapter.slug,
        title: nextChapter.title,
        lede: nextChapter.lede,
      } : null"
      class="ml-[300px] mt-[120px] max-lg:ml-0"
    />
  </main>
</template>
