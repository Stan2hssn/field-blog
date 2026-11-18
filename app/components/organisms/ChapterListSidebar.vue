<script setup lang="ts">
import { CHAPTERS_MANIFEST } from '~/utils/chapters'

const {
  scrollOffset,
  velocity = 0,
} = defineProps<{
  scrollOffset: number
  velocity?: number
}>()

const TOTAL = CHAPTERS_MANIFEST.length

// La fenetre suit le nombre d'articles : au-dela d'un demi-tour de chaque
// cote, la boucle remontrerait les memes numeros.
const RAIL_WIDTH = 22
const RAIL_ITEM_HEIGHT = 22
const RAIL_VISIBLE_COUNT = Math.min(15, TOTAL)
const RAIL_HEIGHT = RAIL_VISIBLE_COUNT * RAIL_ITEM_HEIGHT
const RAIL_RENDER_RANGE = Math.min(7, TOTAL / 2)

const CURVE_AMOUNT = 60
const CURVE_FADE_DISTANCE = 6
const CURVE_VELOCITY_CAP = 1.5

function translateXFor(offset: number) {
  const d = Math.abs(offset)
  const weight = Math.max(0, 1 - d / CURVE_FADE_DISTANCE)
  const v = Math.min(Math.abs(velocity), CURVE_VELOCITY_CAP)
  return v * weight * CURVE_AMOUNT
}

const slots = computed(() => {
  const result: Array<{
    chapter: (typeof CHAPTERS_MANIFEST)[number]
    chapterIdx: number
    offset: number
    key: string
  }> = []
  for (let i = 0; i < TOTAL; i++) {
    const kBest = Math.round((scrollOffset - i) / TOTAL)
    for (let dk = -1; dk <= 1; dk++) {
      const k = kBest + dk
      const offset = i + k * TOTAL - scrollOffset
      if (Math.abs(offset) < RAIL_RENDER_RANGE) {
        result.push({
          chapter: CHAPTERS_MANIFEST[i]!,
          chapterIdx: i,
          offset,
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
  <nav
    class="rail-wrapper relative"
    :style="{ width: `${RAIL_WIDTH}px`, height: `${RAIL_HEIGHT}px` }"
    aria-label="Chapitres"
  >
    <div
      v-for="slot in slots"
      :key="slot.key"
      class="absolute top-1/2 left-0 flex items-center will-change-transform"
      :style="{
        width: `${RAIL_WIDTH}px`,
        height: `${RAIL_ITEM_HEIGHT}px`,
        transform: `translate(${translateXFor(slot.offset)}px, calc(-50% + ${slot.offset * RAIL_ITEM_HEIGHT}px))`,
      }"
    >
      <span
        class="font-mono leading-[16px] text-[11px] tracking-[0.44px] transition-[color,padding] duration-200 ease-out"
        :class="
          isActive(slot.chapterIdx)
            ? 'font-medium text-accent pl-[8px]'
            : 'font-normal text-greyed'
        "
        :aria-current="isActive(slot.chapterIdx) ? 'page' : undefined"
      >
        {{ slot.chapter.num }}
      </span>
    </div>
    <span
      aria-hidden="true"
      class="absolute top-1/2 left-0 w-[4px] border-t border-rule -translate-y-1/2 pointer-events-none"
    />
  </nav>
</template>

<style scoped>
.rail-wrapper {
  overflow: visible;
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 18%,
    black 82%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 18%,
    black 82%,
    transparent 100%
  );
}
</style>
