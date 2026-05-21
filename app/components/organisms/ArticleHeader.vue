<script setup lang="ts">
const {
  state = 'full',
  num,
  kicker,
  title,
  body,
} = defineProps<{
  state?: 'full' | 'preview'
  num?: string
  kicker?: string
  title: string
  body?: string
}>()

const isFull = state === 'full'
const layoutId = num ? `article-header-${num}` : undefined
</script>

<template>
  <header
    :data-state="state"
    :data-layout-id="layoutId"
    class="article-header"
  >
    <div v-if="num || kicker" class="flex items-center gap-4 mb-4">
      <span v-if="num" class="font-mono text-sm tabular-nums text-greyed leading-none">
        Chapitre {{ num }}
      </span>
      <Rule v-if="num && kicker" orientation="vertical" class="h-3" tone="greyed" />
      <Kicker v-if="kicker" tone="secondary">{{ kicker }}</Kicker>
    </div>

    <component
      :is="isFull ? 'h1' : 'p'"
      class="font-sans font-light italic text-primary tracking-tight"
      :class="isFull
        ? 'text-4xl md:text-5xl lg:text-6xl leading-[1.05]'
        : 'text-2xl md:text-3xl leading-tight'"
    >
      {{ title }}
    </component>

    <p
      v-if="body"
      class="mt-4 font-sans font-light text-secondary"
      :class="isFull ? 'text-lg md:text-xl max-w-2xl' : 'text-base max-w-md'"
    >
      {{ body }}
    </p>
  </header>
</template>
