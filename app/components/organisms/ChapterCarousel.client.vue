<script setup lang="ts">
import { CHAPTERS_MANIFEST } from '~/utils/chapters'

const { internalIndex, transitionEnabled = true } = defineProps<{
  internalIndex: number
  transitionEnabled?: boolean
}>()

const SLOT_HEIGHT = 228
const TOTAL = CHAPTERS_MANIFEST.length
const doubled = computed(() => [...CHAPTERS_MANIFEST, ...CHAPTERS_MANIFEST])

const SIZE_PATTERN = [
  { w: 163, h: 204, rotated: false },
  { w: 125, h: 162, rotated: false },
  { w: 130, h: 201, rotated: true },
  { w: 163, h: 204, rotated: false },
  { w: 125, h: 162, rotated: false },
  { w: 130, h: 201, rotated: true },
  { w: 163, h: 204, rotated: false },
]

function sizeFor(i: number) {
  return SIZE_PATTERN[i % SIZE_PATTERN.length]!
}

const translateY = computed(
  () => -(internalIndex * SLOT_HEIGHT + SLOT_HEIGHT / 2),
)

function isActive(i: number) {
  return i === internalIndex
}
</script>

<template>
  <div class="carousel-wrapper relative h-full w-[220px]" aria-roledescription="carousel">
    <div
      class="absolute left-0 w-full will-change-transform"
      :style="{
        top: '50%',
        transform: `translateY(${translateY}px)`,
        transition: transitionEnabled ? 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
      }"
    >
      <NuxtLink
        v-for="(ch, i) in doubled"
        :key="i"
        :to="`/blog/${ch.slug}`"
        class="block flex items-center justify-center transition-opacity duration-[300ms] ease-out"
        :class="!isActive(i) && 'opacity-60'"
        :style="{ height: `${SLOT_HEIGHT}px` }"
        :aria-label="`Chapitre ${ch.num} — ${ch.fullTitle}`"
        :tabindex="isActive(i) ? 0 : -1"
      >
        <div
          class="relative bg-bg-card border border-rule/10 overflow-hidden flex items-center justify-center shrink-0"
          :style="{
            width: sizeFor(i).rotated ? `${sizeFor(i).h}px` : `${sizeFor(i).w}px`,
            height: sizeFor(i).rotated ? `${sizeFor(i).w}px` : `${sizeFor(i).h}px`,
            transform: sizeFor(i).rotated ? 'rotate(90deg)' : undefined,
          }"
        >
          <span class="font-mono uppercase tracking-kicker text-greyed/50 text-[12px]">
            {{ ch.num }}
          </span>
        </div>
      </NuxtLink>
    </div>

    <ul class="sr-only">
      <li v-for="ch in CHAPTERS_MANIFEST" :key="ch.slug">{{ ch.num }} · {{ ch.fullTitle }}</li>
    </ul>
  </div>
</template>

<style scoped>
.carousel-wrapper {
  overflow: hidden;
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
}
</style>
