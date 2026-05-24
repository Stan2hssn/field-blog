<script setup lang="ts">
import { CHAPTERS_MANIFEST } from '~/utils/chapters'

const { internalIndex, transitionEnabled = true } = defineProps<{
  internalIndex: number
  transitionEnabled?: boolean
}>()

const ITEM_HEIGHT = 22
const VISIBLE = 15
const CONTAINER_HEIGHT = VISIBLE * ITEM_HEIGHT

const TOTAL = CHAPTERS_MANIFEST.length
const doubled = computed(() => [...CHAPTERS_MANIFEST, ...CHAPTERS_MANIFEST])

const translateY = computed(
  () => -(internalIndex * ITEM_HEIGHT + ITEM_HEIGHT / 2),
)

function isActive(i: number) {
  return i === internalIndex
}
</script>

<template>
  <nav
    class="rail-wrapper relative w-[22px]"
    :style="{ height: `${CONTAINER_HEIGHT}px` }"
    aria-label="Chapitres"
  >
    <div
      class="absolute left-0 w-full will-change-transform"
      :style="{
        top: '50%',
        transform: `translateY(${translateY}px)`,
        transition: transitionEnabled ? 'transform 380ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
      }"
    >
      <ul role="list" class="flex flex-col">
        <li
          v-for="(ch, i) in doubled"
          :key="i"
          class="flex items-center justify-center"
          :style="{ height: `${ITEM_HEIGHT}px` }"
        >
          <span
            class="font-mono leading-[16px] text-[11px] tracking-[0.44px]"
            :style="{ transition: 'color 120ms ease-out, padding-left 200ms ease-out' }"
            :class="isActive(i)
              ? 'font-medium text-accent pl-[8px]'
              : 'font-normal text-greyed'"
            :aria-current="isActive(i) ? 'page' : undefined"
          >
            {{ ch.num }}
          </span>
        </li>
      </ul>
    </div>
    <span
      aria-hidden="true"
      class="absolute top-1/2 left-0 w-[4px] border-t border-rule -translate-y-1/2 pointer-events-none"
    />
  </nav>
</template>

<style scoped>
.rail-wrapper {
  overflow: hidden;
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
