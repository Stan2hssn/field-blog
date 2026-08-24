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
    class="article-header flex flex-col items-start w-full"
    :class="[
      isFull ? 'gap-[64px]' : 'gap-[12px]',
      align === 'center' && 'items-center text-center',
    ]"
  >
    <div
      v-if="metaSegments.length"
      class="flex font-mono font-medium gap-[24px] text-[11px] leading-[16px] tracking-kicker text-rule whitespace-nowrap w-full"
      :class="align === 'center' ? 'items-center justify-center' : 'items-start'"
    >
      <template v-for="(seg, i) in metaSegments" :key="i">
        <span>{{ seg }}</span>
        <span v-if="i < metaSegments.length - 1" aria-hidden="true">·</span>
      </template>
    </div>

    <div
      class="flex flex-col items-start w-full"
      :class="[
        isFull ? 'gap-[32px]' : 'gap-[12px]',
        align === 'center' && 'items-center',
      ]"
    >
      <component
        :is="isFull ? 'h1' : 'p'"
        class="font-sans font-medium not-italic text-primary"
        :class="[isFull ? 'max-w-full' : 'w-full text-[32px] leading-[40px] tracking-[-0.64px]']"
        :style="isFull
          ? {
              fontSize: 'calc(var(--title-unit) * var(--title-scale))',
              lineHeight: '1.125',
              letterSpacing: '-0.02em',
              width: 'calc(var(--title-unit) * var(--title-scale) * var(--title-measure))',
            }
          : undefined"
      >
        {{ title }}
      </component>

      <p
        v-if="body"
        class="font-sans font-light italic text-secondary w-full"
        :class="[
          isFull
            ? 'text-[22px] leading-[32px]'
            : 'text-[17px] leading-[26px]',
        ]"
      >
        {{ body }}
      </p>
    </div>
  </header>
</template>
