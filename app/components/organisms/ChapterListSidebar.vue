<script setup lang="ts">
import { CHAPTERS_MANIFEST, type ChapterEntry } from '~/utils/chapters'

const { currentNum, publishedSlugs } = defineProps<{
  currentNum: string
  publishedSlugs: Set<string>
}>()

const emit = defineEmits<{ select: [num: string] }>()

function cyclicOrder(active: string, list: ChapterEntry[]): ChapterEntry[] {
  const total = list.length
  const activeIdx = list.findIndex((c) => c.num === active)
  if (activeIdx === -1) return list
  const itemsBefore = Math.floor((total - 1) / 2)
  const startIdx = (activeIdx - itemsBefore + total) % total
  return Array.from({ length: total }, (_, i) => list[(startIdx + i) % total]!)
}

const ordered = computed(() => cyclicOrder(currentNum, CHAPTERS_MANIFEST))

function handleClick(num: string, isPublished: boolean, e: MouseEvent) {
  e.preventDefault()
  if (!isPublished) return
  emit('select', num)
}
</script>

<template>
  <nav
    class="relative flex flex-col items-start gap-[6px] w-[22px]"
    aria-label="Chapitres"
  >
    <span
      aria-hidden="true"
      class="absolute left-0 top-1/2 w-[4px] border-t border-rule -translate-y-1/2"
    />

    <TransitionGroup
      tag="ul"
      name="rail"
      role="list"
      class="contents"
    >
      <li
        v-for="ch in ordered"
        :key="ch.num"
        role="listitem"
        class="flex justify-center w-full"
      >
        <NuxtLink
          v-if="publishedSlugs.has(ch.slug)"
          :to="`/blog/${ch.slug}`"
          class="block font-mono leading-[16px] text-[11px] tracking-[0.44px] focus-visible:outline-none focus-visible:border-y focus-visible:border-primary"
          :style="{ transition: 'color 120ms ease-out, padding-left 200ms ease-out' }"
          :class="ch.num === currentNum
            ? 'font-medium text-accent pl-[8px]'
            : 'font-normal text-greyed hover:text-mid'"
          :aria-current="ch.num === currentNum ? 'page' : undefined"
          @click="handleClick(ch.num, true, $event)"
        >
          {{ ch.num }}
        </NuxtLink>
        <span
          v-else
          class="block font-mono font-normal leading-[16px] text-[11px] tracking-[0.44px] text-greyed opacity-40 cursor-not-allowed"
          aria-disabled="true"
          :title="`Chapitre ${ch.num} — à venir`"
        >
          {{ ch.num }}
        </span>
      </li>
    </TransitionGroup>
  </nav>
</template>

<style scoped>
.rail-move {
  transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
}
.rail-enter-active,
.rail-leave-active {
  transition: opacity 180ms ease-out, transform 220ms ease-out;
}
.rail-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.rail-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.rail-leave-active {
  position: absolute;
}

@media (prefers-reduced-motion: reduce) {
  .rail-move,
  .rail-enter-active,
  .rail-leave-active {
    transition: none;
  }
}
</style>
