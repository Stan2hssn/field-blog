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
  published: boolean
}

const {
  publishDate,
  readingTime,
  categories,
  sections,
  next,
  basePath = '/blog',
} = defineProps<{
  publishDate: Date | string
  readingTime: number
  categories: string[]
  sections: SectionRef[]
  next?: NextChapterRef | null
  basePath?: string
}>()

const { activeId } = useScrollSpy('[id^="rule-"]')

const formattedDate = computed(() => {
  const d = typeof publishDate === 'string' ? new Date(publishDate) : publishDate
  const s = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
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
  <aside class="flex flex-col gap-[16px] items-start w-full pt-[32px]" aria-label="À propos du chapitre">
    <div class="flex flex-col gap-[12px] items-start w-full">
      <p class="font-sans font-semibold not-italic text-[12px] leading-[16px] tracking-[0.96px] text-primary uppercase whitespace-nowrap">
        À PROPOS
      </p>
      <hr class="w-full h-px border-0 bg-rule m-0" aria-hidden="true" />
    </div>

    <nav class="flex flex-col gap-[8px] w-full" aria-label="Sommaire du chapitre">
      <TocItem
        v-for="section in sections"
        :key="section.num"
        :num="section.num"
        :label="section.kicker"
        :to="tocItemHref(section.num)"
        :is-active="isActive(section.num)"
      />
    </nav>

    <hr class="w-full h-px border-0 bg-rule m-0" aria-hidden="true" />

    <dl class="flex flex-col gap-[16px] py-[16px] w-full m-0">
      <div class="flex flex-col gap-[8px] w-full">
        <div class="flex items-center justify-between py-[8px] w-full whitespace-nowrap">
          <dt class="font-sans font-semibold text-[11px] leading-[16px] tracking-[0.88px] text-primary uppercase">
            Date de publication
          </dt>
          <dd class="font-sans font-normal text-[13px] leading-[20px] text-primary m-0">
            <time :datetime="isoDate">{{ formattedDate }}</time>
          </dd>
        </div>
        <hr class="w-full h-px border-0 m-0 about-rule-under" aria-hidden="true" />
      </div>

      <div class="flex flex-col gap-[8px] w-full">
        <div class="flex items-center justify-between py-[8px] w-full whitespace-nowrap">
          <dt class="font-sans font-semibold text-[11px] leading-[16px] tracking-[0.88px] text-primary uppercase">
            Temps de lecture
          </dt>
          <dd class="font-sans font-normal text-[13px] leading-[20px] text-primary m-0">
            {{ readingTime }} min
          </dd>
        </div>
        <hr class="w-full h-px border-0 m-0 about-rule-under" aria-hidden="true" />
      </div>

      <div class="flex flex-col gap-[8px] w-full">
        <div class="flex items-center justify-between gap-[12px] py-[8px] w-full">
          <dt class="font-sans font-semibold text-[11px] leading-[16px] tracking-[0.88px] text-primary uppercase">
            Catégories
          </dt>
          <dd class="flex flex-wrap justify-end gap-[8px] m-0">
            <Pill v-for="cat in categories" :key="cat">{{ cat.toUpperCase() }}</Pill>
          </dd>
        </div>
        <hr class="w-full h-px border-0 m-0 about-rule-under" aria-hidden="true" />
      </div>

      <div class="flex items-center justify-between gap-[12px] py-[8px] w-full">
        <dt class="font-sans font-semibold text-[11px] leading-[16px] tracking-[0.88px] text-primary uppercase">
          Partager
        </dt>
        <dd class="m-0">
          <ButtonCopyLink />
        </dd>
      </div>
    </dl>

    <div class="flex flex-col gap-[8px] items-start w-full">
      <hr class="w-full h-px border-0 bg-rule m-0" aria-hidden="true" />
      <div v-if="next && next.published" class="flex flex-col gap-[8px] items-start pt-[16px] w-full">
        <NuxtLink
          :to="`${basePath}/${next.slug}`"
          class="group flex flex-col gap-[8px] items-start w-full"
          :aria-label="`Chapitre suivant : ${next.title}`"
        >
          <p class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-accent uppercase whitespace-nowrap">
            SUITE
          </p>
          <h3 class="font-sans font-medium not-italic text-[18px] leading-[26px] text-primary group-hover:underline underline-offset-[3px]">
            {{ next.num }} · {{ next.title }}
          </h3>
          <p class="font-sans font-light italic text-[14px] leading-[22px] text-secondary">
            {{ next.lede }}
          </p>
        </NuxtLink>
        <ArrowLink :to="`${basePath}/${next.slug}`" tone="accent" variant="mono">
          LIRE LE CHAPITRE
        </ArrowLink>
      </div>
      <div v-else-if="next" class="flex flex-col gap-[8px] items-start pt-[16px] w-full">
        <p class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-greyed uppercase whitespace-nowrap">
          SUITE
        </p>
        <h3 class="font-sans font-medium not-italic text-[18px] leading-[26px] text-greyed">
          {{ next.num }} · {{ next.title }}
        </h3>
        <p class="font-sans font-light italic text-[14px] leading-[22px] text-greyed">
          Chapitre à venir.
        </p>
      </div>
      <div v-else class="flex flex-col gap-[8px] items-start pt-[16px] w-full">
        <p class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-greyed uppercase whitespace-nowrap">
          SUITE
        </p>
        <p class="font-sans font-light italic text-[14px] leading-[22px] text-greyed">
          Dernier chapitre publié.
        </p>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.about-rule-under {
  background-image: repeating-linear-gradient(
    to right,
    var(--color-rule) 0,
    var(--color-rule) 1px,
    transparent 1px,
    transparent 4px
  );
  opacity: 0.25;
}
</style>
