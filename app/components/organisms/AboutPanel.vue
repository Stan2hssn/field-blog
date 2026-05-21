<script setup lang="ts">
interface SectionRef {
  num: string
  kicker: string
}

interface NextChapterRef {
  num: string
  slug: string
  title: string
  lede: string
}

const {
  publishDate,
  readingTime,
  categories,
  sections,
  next,
} = defineProps<{
  publishDate: Date | string
  readingTime: number
  categories: string[]
  sections: SectionRef[]
  next?: NextChapterRef | null
}>()

const { activeId } = useScrollSpy('[id^="rule-"]')

const formattedDate = computed(() => {
  const d = typeof publishDate === 'string' ? new Date(publishDate) : publishDate
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
})

const isoDate = computed(() =>
  typeof publishDate === 'string' ? publishDate : publishDate.toISOString(),
)

function tocItemHref(num: string) {
  return `#rule-${num}`
}

function isActive(num: string) {
  return activeId.value === `rule-${num}`
}
</script>

<template>
  <aside class="space-y-[32px]" aria-label="À propos du chapitre">
    <div class="space-y-3">
      <Kicker tone="greyed">À PROPOS</Kicker>
      <div class="h-px w-full bg-rule" aria-hidden="true" />
    </div>

    <nav class="flex flex-col gap-[8px]" aria-label="Sommaire du chapitre">
      <TocItem
        v-for="section in sections"
        :key="section.num"
        :num="section.num"
        :label="section.kicker"
        :to="tocItemHref(section.num)"
        :is-active="isActive(section.num)"
      />
    </nav>

    <div class="h-px w-full bg-rule" aria-hidden="true" />

    <dl class="space-y-0">
      <div class="flex items-baseline justify-between gap-6 py-3 border-b border-rule">
        <dt><Kicker tone="greyed">Date de publication</Kicker></dt>
        <dd class="font-sans font-medium text-[14px] leading-[20px] text-primary">
          <time :datetime="isoDate">{{ formattedDate }}</time>
        </dd>
      </div>

      <div class="flex items-baseline justify-between gap-6 py-3 border-b border-rule">
        <dt><Kicker tone="greyed">Temps de lecture</Kicker></dt>
        <dd class="font-sans font-medium text-[14px] leading-[20px] text-primary">
          {{ readingTime }} min
        </dd>
      </div>

      <div class="flex items-baseline justify-between gap-6 py-3 border-b border-rule">
        <dt><Kicker tone="greyed">Catégories</Kicker></dt>
        <dd class="flex flex-wrap justify-end gap-2">
          <Pill v-for="cat in categories" :key="cat">{{ cat.toUpperCase() }}</Pill>
        </dd>
      </div>

      <div class="flex items-center justify-between gap-6 py-3">
        <dt><Kicker tone="greyed">Partager</Kicker></dt>
        <dd>
          <ButtonCopyLink />
        </dd>
      </div>
    </dl>

    <div v-if="next" class="pt-[24px] border-t border-rule">
      <NuxtLink
        :to="`/blog/${next.slug}`"
        class="group block space-y-[12px]"
        :aria-label="`Chapitre suivant : ${next.title}`"
      >
        <Kicker tone="greyed">SUITE</Kicker>
        <h3 class="font-sans font-medium not-italic text-[15px] leading-[22px] text-primary group-hover:underline underline-offset-[3px]">
          {{ next.num }} · {{ next.title }}
        </h3>
        <p class="font-sans font-light italic text-[13px] leading-[20px] text-secondary">
          {{ next.lede }}
        </p>
        <div class="inline-flex items-center gap-2 font-mono font-medium uppercase tracking-kicker text-[11px] leading-[16px] text-accent">
          <span>LIRE LE CHAPITRE</span>
          <span aria-hidden="true" class="inline-block transition-transform duration-base ease-out group-hover:translate-x-1">→</span>
        </div>
      </NuxtLink>
    </div>
  </aside>
</template>
