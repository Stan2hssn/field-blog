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
  <section class="border-t border-rule pt-[60px] md:pt-[80px]">
    <NuxtLink
      v-if="next"
      :to="`/blog/${next.slug}`"
      class="group block text-center space-y-[40px]"
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
      />

      <span
        class="inline-flex items-center gap-2 font-mono font-medium uppercase tracking-kicker text-[11px] leading-[16px] text-accent group-hover:underline underline-offset-[4px]"
      >
        <span>LIRE LE CHAPITRE</span>
        <span
          aria-hidden="true"
          class="inline-block transition-transform duration-[200ms] ease-out group-hover:translate-x-[2px] motion-reduce:transition-none"
        >→</span>
      </span>
    </NuxtLink>

    <div v-else class="text-center space-y-3">
      <Kicker tone="greyed">CHAPITRE SUIVANT</Kicker>
      <BodyText tone="greyed" italic class="mt-3">
        Le prochain chapitre n'est pas encore disponible.
      </BodyText>
    </div>
  </section>
</template>
