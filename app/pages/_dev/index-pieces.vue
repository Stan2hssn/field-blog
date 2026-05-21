<script setup lang="ts">
definePageMeta({
  validate: () => import.meta.dev,
})

useHead({ title: '_dev — index pieces' })

const { data: chapters } = await useAsyncData('dev-chapters', () =>
  queryCollection('blog').order('num', 'ASC').all(),
)

const publishedSlugs = computed(
  () => new Set((chapters.value ?? []).map((c) => c.slug)),
)

const featured = computed(() => (chapters.value ?? [])[0] ?? null)
</script>

<template>
  <main class="p-8 min-h-screen bg-bg">
    <header class="mb-12 space-y-2">
      <Kicker tone="accent">DEV ONLY · INDEX PIECES — BATCH A</Kicker>
      <Heading variant="section">ChapterListSidebar + IntroBlock</Heading>
      <BodyText tone="secondary" size="sm">
        Refactor pour matcher Figma 298:281. Sidebar = rail 22px, IntroBlock = compact 402px.
      </BodyText>
    </header>

    <Rule />

    <div class="mt-12 grid lg:grid-cols-[1fr_1fr] gap-12">
      <!-- LEFT : Sidebar rail in context (with logo placeholder) -->
      <section class="space-y-4">
        <Kicker tone="secondary">SIDEBAR — RAIL 22px</Kicker>
        <div class="flex flex-col gap-[284px] h-[600px] items-start border border-dashed border-rule/20 p-4">
          <ChapterListSidebar
            current-num="01"
            :published-slugs="publishedSlugs"
          />
          <div class="font-sans font-medium text-2xl tracking-tight text-primary">
            FIELD<span class="align-super text-base">®</span>
          </div>
        </div>
        <BodyText size="sm" tone="greyed">
          14 chapitres en ordre cyclique avec 01 actif centré (offset 8px gauche, accent).
          Divider 4px à mi-hauteur marque la position active.
        </BodyText>
      </section>

      <!-- RIGHT : IntroBlock -->
      <section class="space-y-4">
        <Kicker tone="secondary">INTROBLOCK — 402px / paragraphe 280px</Kicker>
        <div class="border border-dashed border-rule/20 p-4">
          <IntroBlock />
        </div>
        <BodyText size="sm" tone="greyed">
          Nav `Index, About | CEST H:MM AM/PM | Contact`. Index sous-souligné = page courante.
          Paragraphe "Field Notes" semibold + suite Regular 13px leading 20.
        </BodyText>
      </section>
    </div>

    <Rule class="mt-12" />

    <section class="mt-12 space-y-4">
      <Kicker tone="secondary">CYCLIC ORDER — TEST D'ACTIVE</Kicker>
      <BodyText size="sm" tone="greyed">
        L'ordre dépend du chapitre actif (centré dans la liste). Test des 4 cas :
      </BodyText>
      <div class="flex gap-12 items-start">
        <div v-for="active in ['01', '04', '08', '14']" :key="active" class="space-y-2">
          <Kicker tone="greyed">active = {{ active }}</Kicker>
          <ChapterListSidebar
            :current-num="active"
            :published-slugs="publishedSlugs"
          />
        </div>
      </div>
    </section>

    <Rule class="mt-16" weight="thick" />

    <header class="mt-16 mb-12 space-y-2">
      <Kicker tone="accent">DEV ONLY · INDEX PIECES — BATCH B</Kicker>
      <Heading variant="section">FeaturedCard + CtaReadMore + ImageCardStack</Heading>
    </header>

    <div class="grid lg:grid-cols-[1fr_1fr] gap-12 mb-16">
      <section class="space-y-4">
        <Kicker tone="secondary">FEATUREDCARD — 400px</Kicker>
        <div class="border border-dashed border-rule/20 p-4">
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
        <BodyText size="sm" tone="greyed">
          Meta `MIN · CATEGORY` (FONDAMENTAUX en accent), titre Inter Medium 28px/36 leading,
          excerpt Light Italic 17px/26. Tout cliquable, title underline au hover.
        </BodyText>
      </section>

      <section class="space-y-4">
        <Kicker tone="secondary">CTAREADMORE — 402px</Kicker>
        <div class="border border-dashed border-rule/20 p-4 w-[402px]">
          <CtaReadMore
            v-if="featured"
            :slug="featured.slug"
            :tags="['Figma', 'Handoff', 'Checklist']"
            :publish-date="featured.publishDate"
          />
        </div>
        <BodyText size="sm" tone="greyed">
          `LIRE →` en accent + rule + ligne tags + spacer-rule + date majuscule.
          Whole zone est un NuxtLink.
        </BodyText>
      </section>
    </div>

    <section class="space-y-4">
      <Kicker tone="secondary">IMAGECARDSTACK — 7 placeholders géométrie Figma</Kicker>
      <div class="border border-dashed border-rule/20 p-8 inline-block">
        <ImageCardStack />
      </div>
      <BodyText size="sm" tone="greyed">
        Stack vertical gap 8px. Sizes : 163×204, 125×162, rotated 130×201, 163×204, 125×162,
        rotated 130×201, 163×204. `mix-blend-luminosity` sur tous sauf item 04 (per Figma).
        Quand Three.js arrivera, swap par `&lt;canvas&gt;` derrière la même API.
      </BodyText>
    </section>
  </main>
</template>
