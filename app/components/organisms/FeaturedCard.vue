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
    class="group block w-[400px]"
    :aria-label="`${title} — ${readingTime} minutes — ${category}`"
  >
    <div class="flex flex-col gap-[10px] items-start">
      <p
        class="flex items-start gap-[8px] font-mono font-medium text-[11px] leading-[16px] tracking-kicker whitespace-nowrap text-rule"
      >
        <span>{{ readingTime }} MIN</span>
        <span aria-hidden="true">·</span>
        <span class="text-accent">{{ category }}</span>
      </p>

      <h1
        class="font-sans font-medium not-italic text-[28px] leading-[36px] tracking-[-0.56px] text-primary group-hover:underline underline-offset-[6px] decoration-1"
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
