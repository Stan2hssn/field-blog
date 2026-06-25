<script setup lang="ts">
const {
  num,
  slug,
  title,
  lede,
  readingTime,
  category = 'FONDAMENTAUX',
  published = true,
} = defineProps<{
  num: string
  slug: string
  title: string
  lede: string
  readingTime: number
  category?: string
  published?: boolean
}>()

const NuxtLink = resolveComponent('NuxtLink')
</script>

<template>
  <component
    :is="published ? NuxtLink : 'div'"
    :to="published ? `/blog/${slug}` : undefined"
    class="group block w-[400px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    :aria-label="published
      ? `${title} — ${readingTime} minutes — ${category}`
      : `${title} — à venir — ${category}`"
  >
    <div class="flex flex-col gap-[10px] items-start">
      <dl class="flex items-start gap-[8px] font-mono font-medium text-[11px] leading-[16px] tracking-kicker whitespace-nowrap">
        <template v-if="published">
          <dt class="sr-only">Temps de lecture</dt>
          <dd class="text-rule">{{ readingTime }} MIN</dd>
        </template>
        <template v-else>
          <dt class="sr-only">Statut</dt>
          <dd class="text-greyed">À VENIR</dd>
        </template>
        <span aria-hidden="true" class="text-rule">·</span>
        <dt class="sr-only">Catégorie</dt>
        <dd class="text-accent">{{ category }}</dd>
      </dl>

      <h1
        class="font-sans font-medium not-italic text-[28px] leading-[36px] tracking-[-0.56px] text-primary transition-[text-decoration] duration-base ease-out underline-offset-[6px] decoration-1"
        :class="published ? 'group-hover:underline' : ''"
      >
        {{ title }}
      </h1>

      <p
        class="font-sans font-light italic text-[17px] leading-[26px] text-secondary"
      >
        {{ lede }}
      </p>
    </div>
  </component>
</template>
