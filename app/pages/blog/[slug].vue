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

const chapterCap = computed(() =>
  chapter.value ? `${chapter.value.num} · ${chapter.value.title}` : undefined,
)

useSeoMeta({
  title: () => chapter.value?.title,
  description: () => chapter.value?.lede,
  ogTitle: () => chapter.value?.title,
  ogDescription: () => chapter.value?.lede,
  ogType: 'article',
})
</script>

<template>
  <ArticleLayout v-if="chapter" :chapter-cap="chapterCap">
    <template #header>
      <ArticleHeader
        state="full"
        :num="chapter.num"
        kicker="GUIDES · DESIGN"
        :title="chapter.title"
        :body="chapter.lede"
      />
    </template>

    <template #aside>
      <AboutPanel
        :publish-date="chapter.publishDate"
        :reading-time="chapter.readingTime"
        :authors="chapter.authors"
        :categories="chapter.categories"
      />
    </template>

    <template #content>
      <section class="space-y-16">
        <Heading variant="section" as="h2">Les 10 règles obligatoires</Heading>

        <article
          v-for="section in chapter.sections"
          :key="section.num"
          class="space-y-6"
        >
          <SectionHead
            :num="section.num"
            :kicker="section.kicker"
            :title="section.title"
            as="h3"
          />
          <BodyText size="lg" tone="primary">{{ section.body }}</BodyText>
          <div class="grid md:grid-cols-2 gap-x-8 gap-y-6">
            <DoDontList variant="do" :items="section.doItems" />
            <DoDontList variant="dont" :items="section.dontItems" />
          </div>
          <PullQuote>{{ section.why }}</PullQuote>
        </article>
      </section>

      <section class="space-y-6 border-t border-rule/30 pt-12">
        <Heading variant="section" as="h2">En complément</Heading>
        <ContentRenderer
          :value="chapter"
          class="prose prose-neutral max-w-none
                 prose-headings:font-sans prose-headings:font-medium prose-headings:text-primary
                 prose-h2:text-xl prose-h2:mt-12 prose-h2:mb-4
                 prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-2
                 prose-p:font-light prose-p:text-primary prose-p:leading-relaxed
                 prose-li:font-light prose-li:text-primary
                 prose-strong:text-primary prose-strong:font-medium
                 prose-blockquote:border-l-2 prose-blockquote:border-accent
                 prose-blockquote:not-italic prose-blockquote:pl-6
                 prose-code:font-mono prose-code:text-sm prose-code:bg-bg-card prose-code:px-1 prose-code:rounded
                 prose-code:before:content-none prose-code:after:content-none
                 prose-pre:bg-bg-card prose-pre:text-primary prose-pre:border prose-pre:border-rule/20
                 prose-table:text-sm
                 prose-th:font-mono prose-th:uppercase prose-th:tracking-kicker prose-th:text-secondary prose-th:font-medium
                 prose-td:font-light prose-td:text-primary
                 prose-a:text-accent prose-a:no-underline hover:prose-a:underline"
        />
      </section>

      <ClosingBlock :text="chapter.closing" />
    </template>

    <template #footer>
      <NextChapterCard :next="nextChapter ? {
        num: nextChapter.num,
        slug: nextChapter.slug,
        title: nextChapter.title,
        lede: nextChapter.lede,
        kicker: 'GUIDES · DESIGN',
      } : null" />
    </template>
  </ArticleLayout>
</template>
