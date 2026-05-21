<script setup lang="ts">
const { data: chapters } = await useAsyncData('blog-index-chapters', () =>
  queryCollection('blog').order('num', 'ASC').all(),
)

const publishedSlugs = computed(
  () => new Set((chapters.value ?? []).map((c) => c.slug)),
)

const featured = computed(() => (chapters.value ?? [])[0] ?? null)

useSeoMeta({
  title: 'FIELD® — Notes de terrain entre design, code et IA',
  description: 'Une série courte sur ce qui se passe entre la maquette et le code, quand un designer, un dev et une IA travaillent sur le même produit.',
  ogTitle: 'FIELD® — Notes de terrain entre design, code et IA',
  ogDescription: 'Design × Code × IA. Règles concrètes, erreurs vécues, fix qui marchent.',
  ogType: 'website',
})
</script>

<template>
  <ScrollProgressBar />
  <NavTop />

  <main class="mx-auto max-w-7xl px-6 lg:px-12 pb-24">
    <IntroBlock />

    <Rule class="my-12 md:my-16" />

    <div class="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-12 lg:gap-20">
      <aside class="lg:sticky lg:top-24 lg:self-start lg:h-fit order-2 lg:order-1">
        <ChapterListSidebar :published-slugs="publishedSlugs" />
      </aside>

      <section class="min-w-0 space-y-16 order-1 lg:order-2">
        <ImageCardStack />

        <div v-if="featured" class="space-y-6">
          <Kicker tone="accent">À LA UNE · CHAPITRE {{ featured.num }}</Kicker>

          <NuxtLink :to="`/blog/${featured.slug}`" class="block group">
            <ArticleHeader
              state="full"
              :num="featured.num"
              kicker="GUIDES · DESIGN"
              :title="featured.title"
              :body="featured.lede"
            />

            <div class="mt-8 inline-flex items-center gap-2 font-sans font-medium text-primary">
              <span>Lire le chapitre {{ featured.num }}</span>
              <span aria-hidden="true" class="inline-block transition-transform duration-base ease-out group-hover:translate-x-1">→</span>
            </div>
          </NuxtLink>
        </div>

        <div v-else class="p-8 bg-bg-card/50 border border-dashed border-rule/30 rounded-sm">
          <BodyText tone="greyed" italic>
            Aucun chapitre publié pour le moment.
          </BodyText>
        </div>
      </section>
    </div>
  </main>
</template>
