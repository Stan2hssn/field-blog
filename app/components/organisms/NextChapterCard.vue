<script setup lang="ts">
const { next } = defineProps<{
  next: {
    num: string
    slug: string
    title: string
    lede: string
    kicker?: string
  } | null
}>()

const to = computed(() => next ? `/blog/${next.slug}` : null)
</script>

<template>
  <section v-if="next && to" class="border-t border-rule/30 pt-12">
    <NuxtLink
      :to="to"
      class="group block p-8 md:p-10 bg-bg-card border border-rule/20 rounded-sm transition-colors duration-base ease-out hover:border-rule/60"
    >
      <div class="mb-6">
        <Kicker tone="accent">CHAPITRE SUIVANT</Kicker>
      </div>

      <ArticleHeader
        state="preview"
        :num="next.num"
        :kicker="next.kicker"
        :title="next.title"
        :body="next.lede"
      />

      <div class="mt-8 inline-flex items-center gap-2 font-sans font-medium text-primary">
        <span>Lire le chapitre {{ next.num }}</span>
        <span aria-hidden="true" class="inline-block transition-transform duration-base ease-out group-hover:translate-x-1">→</span>
      </div>
    </NuxtLink>
  </section>

  <section v-else class="border-t border-rule/30 pt-12">
    <div class="p-8 md:p-10 bg-bg-card/50 border border-dashed border-rule/30 rounded-sm">
      <Kicker tone="greyed">CHAPITRE SUIVANT</Kicker>
      <BodyText tone="greyed" italic class="mt-3">
        Le chapitre suivant n'est pas encore disponible.
      </BodyText>
    </div>
  </section>
</template>
