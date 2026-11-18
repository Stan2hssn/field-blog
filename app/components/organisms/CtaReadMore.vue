<script setup lang="ts">
const {
  to,
  tags = [],
  publishDate,
  label = 'LIRE',
  published = true,
} = defineProps<{
  to: string
  tags?: string[]
  publishDate: Date | string
  label?: string
  published?: boolean
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

const ctaLabel = computed(() => (published ? label : 'À VENIR'))
const metaKey = computed(
  () => `${tagsLine.value}|${published ? formattedDate.value : ''}`,
)
</script>

<template>
  <div class="group relative flex flex-col gap-[16px] w-full">
    <NuxtLink
      v-if="published"
      :to="to"
      class="absolute inset-0 z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :aria-label="`Lire l'article : ${tagsLine} — ${formattedDate}`"
    />

    <Transition name="fade-up" mode="out-in">
      <p
        :key="ctaLabel"
        class="inline-flex items-center gap-[6px] font-mono font-medium text-[11px] leading-[16px] tracking-kicker"
        :class="published ? 'text-accent' : 'text-greyed'"      >
        <span
          class="transition-[text-decoration] duration-base ease-out underline-offset-[4px]"
          :class="published ? 'group-hover:underline' : ''"
        >{{ ctaLabel }}</span>
        <span
          v-if="published"
          aria-hidden="true"
          class="inline-block transition-transform duration-base ease-out group-hover:translate-x-[2px]"
        >→</span>
      </p>
    </Transition>

    <div class="h-px w-full bg-rule" aria-hidden="true" />

    <Transition name="fade-down" mode="out-in">
      <dl
        :key="metaKey"
        class="flex h-[14px] items-center gap-[24px] w-full font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-rule whitespace-nowrap"      >
        <dt class="sr-only">Sujets</dt>
        <dd>{{ tagsLine }}</dd>

        <span class="flex-1 h-px bg-rule min-w-[8px]" aria-hidden="true" />

        <template v-if="published">
          <dt class="sr-only">Publication</dt>
          <dd>
            <time :datetime="isoDate">{{ formattedDate }}</time>
          </dd>
        </template>
      </dl>
    </Transition>
  </div>
</template>
