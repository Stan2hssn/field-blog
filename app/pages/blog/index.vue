<script setup lang="ts">
const { data: chapters } = await useAsyncData('blog-index-chapters', () =>
  queryCollection('blog').order('num', 'ASC').all(),
)

const publishedSlugs = computed(
  () => new Set((chapters.value ?? []).map((c) => c.slug)),
)

const featured = computed(() => (chapters.value ?? [])[0] ?? null)

const featuredTags = ['Figma', 'Handoff', 'Checklist']

useSeoMeta({
  title: 'FIELD® — Field Notes',
  description: 'Field Notes est un journal sur ce qui se passe entre la maquette et le code, quand un designer, un dev et une IA travaillent sur le même produit. Chaque chapitre est une étude de cas, règles, erreurs, fix qui marchent.',
  ogTitle: 'FIELD® — Field Notes',
  ogDescription: 'Design × Code × IA. Règles concrètes, erreurs vécues, fix qui marchent.',
  ogType: 'website',
})
</script>

<template>
  <main
    class="bg-bg min-h-screen flex max-lg:flex-col items-stretch gap-[64px] lg:gap-[128px] p-[32px]"
  >
    <div class="flex flex-1 items-center min-w-0 gap-[32px] max-lg:flex-col max-lg:items-start max-lg:gap-[64px]">
      <aside
        class="relative flex flex-col items-start justify-center self-stretch w-[22px] max-lg:w-auto max-lg:flex-row max-lg:gap-[32px] max-lg:items-center max-lg:justify-start max-lg:pt-[80px]"
        aria-label="Chapitres"
      >
        <BrandLogo
          as="link"
          to="/blog"
          size="hero"
          class="absolute left-0 top-0 max-lg:static"
        />
        <ChapterListSidebar
          :current-num="featured?.num ?? '01'"
          :published-slugs="publishedSlugs"
        />
      </aside>

      <div
        class="flex-1 h-px bg-rule self-center max-lg:w-full max-lg:flex-none"
        aria-hidden="true"
      />

      <FeaturedCard
        v-if="featured"
        :num="featured.num"
        :slug="featured.slug"
        :title="featured.title"
        :lede="featured.lede"
        :reading-time="featured.readingTime"
        category="FONDAMENTAUX"
      />
    </div>

    <ImageCardStack class="self-center shrink-0" />

    <aside
      v-if="featured"
      class="relative flex flex-col items-end justify-center w-[402px] self-stretch max-lg:w-full"
      aria-label="Intro et accès article"
    >
      <div class="lg:absolute lg:left-0 lg:top-0 lg:w-full max-lg:mb-[64px]">
        <IntroBlock />
      </div>

      <CtaReadMore
        :slug="featured.slug"
        :tags="featuredTags"
        :publish-date="featured.publishDate"
      />
    </aside>
  </main>
</template>
