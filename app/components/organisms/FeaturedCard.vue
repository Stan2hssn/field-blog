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

const statusLabel = computed(() => (published ? `${readingTime} MIN` : 'À VENIR'))
const metaKey = computed(() => `${statusLabel.value}·${category}`)
</script>

<template>
  <div
    class="group relative"
    style="width: calc(var(--title-unit) * var(--title-measure))"
  >
    <NuxtLink
      v-if="published"
      :to="`/blog/${slug}`"
      class="absolute inset-0 z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :aria-label="`${title} — ${readingTime} minutes — ${category}`"
    />

    <div class="flex flex-col gap-[10px] items-start">
      <div
        class="w-full flex flex-col justify-end gap-[4px]"
        style="height: var(--title-box)"
      >
        <Transition name="fade-up" mode="out-in">
          <dl
            :key="metaKey"
            class="flex items-start gap-[8px] font-mono font-medium text-[11px] leading-[16px] tracking-kicker whitespace-nowrap"
          >
            <dt class="sr-only">{{ published ? 'Temps de lecture' : 'Statut' }}</dt>
            <dd :class="published ? 'text-rule' : 'text-greyed'">{{ statusLabel }}</dd>
            <span aria-hidden="true" class="text-rule">·</span>
            <dt class="sr-only">Catégorie</dt>
            <dd class="text-accent">{{ category }}</dd>
          </dl>
        </Transition>

        <Transition name="fade-up" mode="out-in">
          <h1
            :key="title"
            class="font-sans font-medium not-italic text-primary"
            style="font-size: var(--title-unit); line-height: 1.2857; letter-spacing: -0.02em"
          >
            <span
              class="transition-[text-decoration] duration-base ease-out underline-offset-[6px] decoration-1"
              :class="published ? 'group-hover:underline' : ''"
            >{{ title }}</span>
          </h1>
        </Transition>
      </div>

      <div
        class="w-full flex items-start"
        style="height: var(--lede-box)"
      >
        <Transition name="fade-down" mode="out-in">
          <p
            :key="lede"
            class="font-sans font-light italic text-[17px] leading-[26px] text-secondary"
          >
            {{ lede }}
          </p>
        </Transition>
      </div>
    </div>
  </div>
</template>
