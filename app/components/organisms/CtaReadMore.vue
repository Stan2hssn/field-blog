<script setup lang="ts">
const {
  slug,
  tags = [],
  publishDate,
  label = 'LIRE',
  published = true,
} = defineProps<{
  slug: string
  tags?: string[]
  publishDate: Date | string
  label?: string
  published?: boolean
}>()

const NuxtLink = resolveComponent('NuxtLink')

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
  <component
    :is="published ? NuxtLink : 'div'"
    :to="published ? `/blog/${slug}` : undefined"
    class="group flex flex-col gap-[16px] w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    :aria-label="published ? `Lire l'article : ${tagsLine} — ${formattedDate}` : `À venir : ${tagsLine}`"
  >
    <p
      class="inline-flex items-center gap-[6px] font-mono font-medium text-[11px] leading-[16px] tracking-kicker transition-[text-decoration] duration-base ease-out underline-offset-[4px]"
      :class="published ? 'text-accent group-hover:underline' : 'text-greyed'"
    >
      <span>{{ published ? label : 'À VENIR' }}</span>
      <span
        v-if="published"
        aria-hidden="true"
        class="inline-block transition-transform duration-base ease-out group-hover:translate-x-[2px]"
      >→</span>
    </p>

    <div class="h-px w-full bg-rule" aria-hidden="true" />

    <Transition name="meta" mode="out-in">
      <dl
        :key="slug"
        class="flex h-[14px] items-center gap-[24px] w-full font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-rule whitespace-nowrap"
      >
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
  </component>
</template>

<style scoped>
.meta-enter-active,
.meta-leave-active {
  transition:
    opacity 220ms ease-out,
    transform 220ms ease-out;
}
.meta-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.meta-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .meta-enter-active,
  .meta-leave-active {
    transition: opacity 80ms linear;
    transform: none;
  }
  .meta-enter-from,
  .meta-leave-to {
    transform: none;
  }
}
</style>
