<script setup lang="ts">
interface GalleryItem {
  src?: string
  alt: string
}

const { gallery } = defineProps<{
  gallery?: GalleryItem[]
}>()

interface Slot {
  alt: string
  src?: string
  width: number
  height: number
  rotated?: boolean
  blendLuminosity?: boolean
}

const SLOTS: Slot[] = [
  { alt: 'Capture 01', width: 163, height: 204, blendLuminosity: true },
  { alt: 'Capture 02', width: 125, height: 162, blendLuminosity: true },
  { alt: 'Capture 03', width: 130, height: 201, rotated: true, blendLuminosity: true },
  { alt: 'Capture 04', width: 163, height: 204, blendLuminosity: false },
  { alt: 'Capture 05', width: 125, height: 162, blendLuminosity: true },
  { alt: 'Capture 06', width: 130, height: 201, rotated: true, blendLuminosity: true },
  { alt: 'Capture 07', width: 163, height: 204, blendLuminosity: true },
]

const items = computed<Slot[]>(() => {
  if (!gallery || gallery.length === 0) return SLOTS
  return SLOTS.map((slot, i) => ({
    ...slot,
    src: gallery[i]?.src,
    alt: gallery[i]?.alt ?? slot.alt,
  }))
})
</script>

<template>
  <div class="relative">
    <div
      class="flex flex-col gap-[8px] items-center justify-center"
      aria-hidden="true"
    >
    <template v-for="(item, i) in items" :key="i">
      <div
        v-if="item.rotated"
        :style="{ width: '201px', height: '130px' }"
        class="flex items-center justify-center relative shrink-0"
        :class="item.blendLuminosity && 'mix-blend-luminosity'"
      >
        <div class="flex-none rotate-90">
          <div
            :style="{ width: `${item.width}px`, height: `${item.height}px` }"
            class="relative bg-bg-card border border-rule/10 overflow-hidden"
          >
            <NuxtImg
              v-if="item.src"
              :src="item.src"
              :alt="item.alt"
              loading="lazy"
              class="absolute inset-0 max-w-none object-cover w-full h-full"
            />
            <div
              v-else
              class="absolute inset-0 flex items-center justify-center text-greyed/40 font-mono text-[10px] uppercase tracking-kicker"
            >
              0{{ i + 1 }}
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        :style="{ width: `${item.width}px`, height: `${item.height}px` }"
        class="relative shrink-0 bg-bg-card border border-rule/10 overflow-hidden"
        :class="item.blendLuminosity && 'mix-blend-luminosity'"
      >
        <NuxtImg
          v-if="item.src"
          :src="item.src"
          :alt="item.alt"
          loading="lazy"
          class="absolute inset-0 max-w-none object-cover w-full h-full"
        />
        <div
          v-else
          class="absolute inset-0 flex items-center justify-center text-greyed/40 font-mono text-[10px] uppercase tracking-kicker"
        >
          0{{ i + 1 }}
        </div>
      </div>
    </template>
    </div>

    <ul class="sr-only">
      <li v-for="item in items" :key="item.alt">{{ item.alt }}</li>
    </ul>
  </div>
</template>
