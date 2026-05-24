<script setup lang="ts">
const {
  slug,
  tags = [],
  publishDate,
  label = 'LIRE',
} = defineProps<{
  slug: string
  tags?: string[]
  publishDate: Date | string
  label?: string
}>()

const formattedDate = computed(() => {
  const d = typeof publishDate === 'string' ? new Date(publishDate) : publishDate
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).toUpperCase()
})

const tagsLine = computed(() => tags.map((t) => t.toUpperCase()).join(' · '))

const isoDate = computed(() =>
  typeof publishDate === 'string' ? publishDate : publishDate.toISOString(),
)
</script>

<template>
  <NuxtLink
    :to="`/blog/${slug}`"
    class="group flex flex-col gap-[16px] w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    :aria-label="`Lire l'article : ${tagsLine} — ${formattedDate}`"
  >
    <p
      class="inline-flex items-center gap-[6px] font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-accent transition-[text-decoration] duration-base ease-out group-hover:underline underline-offset-[4px]"
    >
      <span>{{ label }}</span>
      <span
        aria-hidden="true"
        class="inline-block transition-transform duration-base ease-out group-hover:translate-x-[2px]"
      >→</span>
    </p>

    <div class="h-px w-full bg-rule" aria-hidden="true" />

    <dl class="flex h-[14px] items-center gap-[24px] w-full font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-rule whitespace-nowrap">
      <dt class="sr-only">Sujets</dt>
      <dd>{{ tagsLine }}</dd>

      <span class="flex-1 h-px bg-rule min-w-[8px]" aria-hidden="true" />

      <dt class="sr-only">Publication</dt>
      <dd>
        <time :datetime="isoDate">{{ formattedDate }}</time>
      </dd>
    </dl>
  </NuxtLink>
</template>
