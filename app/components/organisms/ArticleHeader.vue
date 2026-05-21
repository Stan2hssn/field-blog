<script setup lang="ts">
const {
  state = 'full',
  align = 'left',
  num,
  category,
  publishDate,
  readingTime,
  title,
  body,
  prefix,
} = defineProps<{
  state?: 'full' | 'preview'
  align?: 'left' | 'center'
  num?: string
  category?: string
  publishDate?: Date | string
  readingTime?: number
  title: string
  body?: string
  prefix?: string
}>()

const isFull = state === 'full'

const formattedDate = computed(() => {
  if (!publishDate) return ''
  const d = typeof publishDate === 'string' ? new Date(publishDate) : publishDate
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()
})

const metaSegments = computed(() => {
  const parts: string[] = []
  if (prefix) parts.push(prefix.toUpperCase())
  if (num) parts.push(`CHAPITRE ${num}`)
  if (category) parts.push(category.toUpperCase())
  if (formattedDate.value) parts.push(formattedDate.value)
  if (readingTime !== undefined) parts.push(`${readingTime} MIN`)
  return parts
})

const layoutId = num ? `article-header-${num}` : undefined
</script>

<template>
  <header
    :data-state="state"
    :data-layout-id="layoutId"
    class="article-header"
    :class="align === 'center' ? 'text-center' : 'text-left'"
  >
    <p
      v-if="metaSegments.length"
      class="font-mono font-medium uppercase tracking-kicker text-[11px] leading-[16px] text-rule"
    >
      {{ metaSegments.join(' · ') }}
    </p>

    <component
      :is="isFull ? 'h1' : 'p'"
      class="font-sans font-medium not-italic text-primary tracking-[-0.56px]"
      :class="[
        isFull
          ? 'text-[36px] md:text-[44px] lg:text-[48px] leading-[1.1] mt-[32px]'
          : 'text-[28px] md:text-[32px] leading-[1.15] mt-[12px]',
      ]"
    >
      {{ title }}
    </component>

    <p
      v-if="body"
      class="font-sans font-light italic text-secondary"
      :class="[
        isFull
          ? 'text-[18px] leading-[28px] max-w-[680px] mt-[24px]'
          : 'text-[16px] leading-[24px] max-w-[640px] mt-[16px]',
        align === 'center' && 'mx-auto',
      ]"
    >
      {{ body }}
    </p>
  </header>
</template>
