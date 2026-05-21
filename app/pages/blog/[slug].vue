<script setup lang="ts">
const route = useRoute()

const { data: chapter } = await useAsyncData(`blog-${route.params.slug}`, () =>
  queryCollection('blog').path(`/blog/${route.params.slug}`).first(),
)

if (!chapter.value) {
  throw createError({ statusCode: 404, statusMessage: 'Chapitre introuvable', fatal: true })
}

useSeoMeta({
  title: () => chapter.value?.title,
  description: () => chapter.value?.lede,
})
</script>

<template>
  <article v-if="chapter" class="mx-auto max-w-3xl px-6 py-16">
    <header class="mb-12 space-y-4">
      <p class="font-mono uppercase tracking-kicker text-sm text-secondary">
        Chapitre {{ chapter.num }}
      </p>
      <h1 class="font-sans text-4xl md:text-5xl leading-tight text-primary">
        {{ chapter.title }}
      </h1>
      <p class="text-lg text-secondary italic">
        {{ chapter.lede }}
      </p>
    </header>

    <ContentRenderer :value="chapter" class="prose prose-neutral max-w-none" />
  </article>
</template>
