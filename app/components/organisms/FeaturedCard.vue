<script setup lang="ts">
const {
  num,
  slug,
  title,
  lede,
  readingTime,
  category = 'FONDAMENTAUX',
} = defineProps<{
  num: string
  slug: string
  title: string
  lede: string
  readingTime: number
  category?: string
}>()
</script>

<template>
  <NuxtLink
    :to="`/blog/${slug}`"
    class="group block w-[400px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    :aria-label="`${title} — ${readingTime} minutes — ${category}`"
  >
    <div class="flex flex-col gap-[10px] items-start">
      <dl class="flex items-start gap-[8px] font-mono font-medium text-[11px] leading-[16px] tracking-kicker whitespace-nowrap">
        <dt class="sr-only">Temps de lecture</dt>
        <dd class="text-rule">{{ readingTime }} MIN</dd>
        <span aria-hidden="true" class="text-rule">·</span>
        <dt class="sr-only">Catégorie</dt>
        <dd class="text-accent">{{ category }}</dd>
      </dl>

      <h1
        class="font-sans font-medium not-italic text-[28px] leading-[36px] tracking-[-0.56px] text-primary transition-[text-decoration] duration-base ease-out group-hover:underline underline-offset-[6px] decoration-1"
      >
        {{ title }}
      </h1>

      <p
        class="font-sans font-light italic text-[17px] leading-[26px] text-secondary"
      >
        {{ lede }}
      </p>
    </div>
  </NuxtLink>
</template>
