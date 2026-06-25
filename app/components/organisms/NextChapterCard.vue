<script setup lang="ts">
interface NextChapter {
  num: string
  slug: string
  title: string
  lede: string
  category?: string
  publishDate?: Date | string
  readingTime?: number
}

const { next } = defineProps<{
  next: NextChapter | null
}>()
</script>

<template>
  <section class="flex flex-col items-stretch border-t border-rule w-full">
    <NuxtLink
      v-if="next"
      :to="`/blog/${next.slug}`"
      class="group flex flex-col gap-[32px] items-center pt-[48px] pb-[24px] w-full text-center"
      :aria-label="`Chapitre suivant : ${next.title}`"
    >
      <ArticleHeader
        state="preview"
        align="center"
        prefix="SUITE"
        :num="next.num"
        :category="next.category"
        :publish-date="next.publishDate"
        :reading-time="next.readingTime"
        :title="next.title"
        :body="next.lede"
        class="w-full"
      />

      <span
        class="group-inner inline-flex items-center gap-[8px] font-mono font-medium uppercase tracking-kicker text-[11px] leading-[24px] text-accent group-hover:underline underline-offset-[4px]"
      >
        <span>LIRE LE CHAPITRE</span>
        <span
          aria-hidden="true"
          class="inline-block transition-transform duration-base ease-out group-hover:translate-x-[2px] motion-reduce:transition-none"
        >→</span>
      </span>
    </NuxtLink>

    <div v-else class="flex flex-col items-center gap-[12px] pt-[48px] pb-[24px] text-center">
      <p class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-greyed uppercase">
        CHAPITRE SUIVANT
      </p>
      <p class="font-sans font-light italic text-base text-greyed">
        Le prochain chapitre n'est pas encore disponible.
      </p>
    </div>
  </section>
</template>
