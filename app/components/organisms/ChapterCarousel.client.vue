<script setup lang="ts">
import { CHAPTERS_MANIFEST } from '~/utils/chapters'

const { scrollOffset, gap = 28 } = defineProps<{
  scrollOffset: number
  gap?: number
}>()

const RAIL_WIDTH = 220
const RENDER_HALF_PX = 600

const SIZE_PATTERN = [
  { w: 163, h: 204, rotated: false },
  { w: 125, h: 162, rotated: false },
  { w: 130, h: 201, rotated: true },
  { w: 163, h: 204, rotated: false },
  { w: 125, h: 162, rotated: false },
  { w: 130, h: 201, rotated: true },
  { w: 163, h: 204, rotated: false },
]

const TOTAL = CHAPTERS_MANIFEST.length

function chapterSize(i: number) {
  return SIZE_PATTERN[i % SIZE_PATTERN.length]!
}

function chapterVisualHeight(i: number) {
  const s = chapterSize(i)
  return s.rotated ? s.w : s.h
}

const layout = computed(() => {
  const centers: number[] = []
  let cum = 0
  for (let i = 0; i < TOTAL; i++) {
    cum += chapterVisualHeight(i) / 2
    centers.push(cum)
    cum += chapterVisualHeight(i) / 2 + gap
  }
  return { centers, cycleHeight: cum }
})

const scrollPx = computed(() => {
  const { centers, cycleHeight } = layout.value
  const s = scrollOffset
  const cycles = Math.floor(s / TOTAL)
  const localS = ((s % TOTAL) + TOTAL) % TOTAL
  const i = Math.floor(localS)
  const frac = localS - i
  const startPx = centers[i]!
  const nextI = (i + 1) % TOTAL
  const endPx = nextI === 0 ? centers[0]! + cycleHeight : centers[nextI]!
  return cycles * cycleHeight + startPx + frac * (endPx - startPx)
})

const slots = computed(() => {
  const { centers, cycleHeight } = layout.value
  const sPx = scrollPx.value
  const result: Array<{
    chapter: (typeof CHAPTERS_MANIFEST)[number]
    chapterIdx: number
    y: number
    key: string
  }> = []
  for (let i = 0; i < TOTAL; i++) {
    const baseY = centers[i]!
    const kBest = Math.round((sPx - baseY) / cycleHeight)
    for (let dk = -1; dk <= 1; dk++) {
      const k = kBest + dk
      const y = baseY + k * cycleHeight - sPx
      if (Math.abs(y) <= RENDER_HALF_PX) {
        result.push({
          chapter: CHAPTERS_MANIFEST[i]!,
          chapterIdx: i,
          y,
          key: `${i}-${k}`,
        })
      }
    }
  }
  return result
})

const activeIdx = computed(
  () => ((Math.round(scrollOffset) % TOTAL) + TOTAL) % TOTAL,
)
function isActive(idx: number) {
  return idx === activeIdx.value
}
</script>

<template>
  <div
    class="carousel-wrapper relative h-full"
    :style="{ width: `${RAIL_WIDTH}px` }"
    aria-roledescription="carousel"
  >
    <NuxtLink
      v-for="slot in slots"
      :key="slot.key"
      :to="`/blog/${slot.chapter.slug}`"
      class="absolute top-1/2 left-0 flex items-center justify-center w-full will-change-transform transition-opacity duration-200 ease-out"
      :style="{
        transform: `translateY(calc(-50% + ${slot.y}px))`,
        opacity: isActive(slot.chapterIdx) ? 1 : 0.6,
      }"
      :aria-label="`Chapitre ${slot.chapter.num} — ${slot.chapter.fullTitle}`"
      :tabindex="isActive(slot.chapterIdx) ? 0 : -1"
    >
      <div
        class="relative bg-bg-card border border-rule/10 overflow-hidden flex items-center justify-center shrink-0"
        :style="{
          width: `${chapterSize(slot.chapterIdx).w}px`,
          height: `${chapterSize(slot.chapterIdx).h}px`,
          transform: chapterSize(slot.chapterIdx).rotated ? 'rotate(90deg)' : undefined,
        }"
      >
        <span class="font-mono uppercase tracking-kicker text-greyed/50 text-[12px]">
          {{ slot.chapter.num }}
        </span>
      </div>
    </NuxtLink>

    <ul class="sr-only">
      <li v-for="ch in CHAPTERS_MANIFEST" :key="ch.slug">
        {{ ch.num }} · {{ ch.fullTitle }}
      </li>
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
