<script setup lang="ts">
const {
  slug,
  tags = [],
  publishDate,
  label = 'LIRE  →',
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
    class="group flex flex-col gap-[16px] w-full"
  >
    <p
      class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-accent whitespace-pre-wrap group-hover:underline underline-offset-[4px]"
    >
      {{ label }}
    </p>

    <div class="h-px w-full bg-rule" aria-hidden="true" />

    <div class="flex h-[14px] items-center gap-[24px] w-full">
      <span
        class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-rule whitespace-nowrap"
      >
        {{ tagsLine }}
      </span>

      <span class="flex-1 h-px bg-rule min-w-[8px]" aria-hidden="true" />

      <time
        :datetime="isoDate"
        class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-rule whitespace-nowrap"
      >
        {{ formattedDate }}
      </time>
    </div>
  </NuxtLink>
</template>
