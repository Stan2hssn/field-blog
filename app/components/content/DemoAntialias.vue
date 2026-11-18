<script setup lang="ts">
const COLS = 16
const ROWS = 8
const PX = 40
const W = COLS * PX
const H = ROWS * PX
const CIRCLE = { x: 720, y: 380, r: 360 }
const BG = 247
const FG = 28

const level = ref(0)
const spp = computed(() => 2 ** level.value)

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const inside = (x: number, y: number) => (x - CIRCLE.x) ** 2 + (y - CIRCLE.y) ** 2 <= CIRCLE.r ** 2

const pixels = computed(() => {
  const n = spp.value
  const out = []
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const rand = mulberry32((j * COLS + i) * 7919 + n)
      const samples = []
      let hits = 0
      for (let s = 0; s < n; s++) {
        // Avec un seul échantillon, on tire au centre comme le rendu du jour 1.
        const x = (i + (n === 1 ? 0.5 : rand())) * PX
        const y = (j + (n === 1 ? 0.5 : rand())) * PX
        const hit = inside(x, y)
        if (hit) hits++
        samples.push({ x, y, hit })
      }
      const v = Math.round(BG + (FG - BG) * (hits / n))
      out.push({ key: j * COLS + i, x: i * PX, y: j * PX, fill: `rgb(${v} ${v} ${v})`, samples, coverage: hits / n })
    }
  }
  return out
})

const showSamples = computed(() => spp.value <= 16)
const edgeGreys = computed(() => new Set(pixels.value.filter((p) => p.coverage > 0 && p.coverage < 1).map((p) => p.coverage)).size)
const rays = computed(() => (1920 * 1080 * spp.value / 1e6).toFixed(1))
</script>

<template>
  <DemoPanel title="Plusieurs échantillons par pixel">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full h-auto"
      role="img"
      :aria-label="`Grille de pixels agrandie sur le bord d'un disque sombre. ${spp} échantillon(s) par pixel : chaque pixel prend le gris moyen de ses échantillons.`"
    >
      <rect
        v-for="p in pixels"
        :key="p.key"
        :x="p.x"
        :y="p.y"
        :width="PX"
        :height="PX"
        :style="`fill: ${p.fill}`"
        class="pixel"
      />
      <circle :cx="CIRCLE.x" :cy="CIRCLE.y" :r="CIRCLE.r" fill="none" style="stroke: var(--color-accent)" stroke-width="1.5" stroke-dasharray="6 4" />
      <g v-if="showSamples">
        <template v-for="p in pixels" :key="p.key">
          <circle
            v-for="(s, k) in p.samples"
            :key="k"
            :cx="s.x"
            :cy="s.y"
            :r="spp > 4 ? 1.8 : 2.6"
            :class="s.hit ? 'sample-in' : 'sample-out'"
          />
        </template>
      </g>
    </svg>

    <template #controls>
      <DemoRange v-model="level" label="échantillons / pixel" :min="0" :max="6" :step="1" :format="() => String(spp)" />
      <p class="font-sans font-light italic text-[13px] leading-[20px] text-mid m-0">
        Pointillé : le vrai bord. Points visibles jusqu'à 16 échantillons.
      </p>
    </template>

    <template #readout>
      <span>gris possibles par pixel : <b>{{ spp + 1 }}</b></span>
      <span>gris distincts sur le bord : <b>{{ edgeGreys }}</b></span>
      <span>rayons pour 1920×1080 : <b>{{ rays }} M</b></span>
      <span :class="spp >= 32 && 'text-accent'">coût : <b>×{{ spp }}</b></span>
    </template>
  </DemoPanel>
</template>

<style scoped>
.pixel {
  stroke: var(--color-text-greyed);
  stroke-width: 0.5;
}

.sample-in {
  fill: var(--color-accent);
}

.sample-out {
  fill: var(--color-text-mid);
}
</style>
