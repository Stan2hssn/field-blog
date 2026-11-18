<script setup lang="ts">
import type { Point } from '~/composables/useSvgDrag'

const W = 640
const H = 320

const svg = ref<SVGSVGElement | null>(null)
const a = ref<Point>({ x: 120, y: 270 })
const b = ref<Point>({ x: 520, y: 250 })
const c = ref<Point>({ x: 300, y: 50 })
const p = ref<Point>({ x: 310, y: 200 })

const clampToView = (_k: string, q: Point): Point => ({
  x: Math.min(W - 12, Math.max(12, q.x)),
  y: Math.min(H - 12, Math.max(12, q.y)),
})
const { start } = useSvgDrag(svg, { a, b, c, p }, clampToView)

const cross = (o: Point, s: Point, t: Point) => (s.x - o.x) * (t.y - o.y) - (s.y - o.y) * (t.x - o.x)

// Convention Möller–Trumbore : P = w·A + u·B + v·C, w = 1 − u − v.
const bary = computed(() => {
  const area = cross(a.value, b.value, c.value)
  if (Math.abs(area) < 1e-6) return null
  const u = cross(a.value, p.value, c.value) / area
  const v = cross(a.value, b.value, p.value) / area
  return { u, v, w: 1 - u - v }
})
const inside = computed(() => {
  const k = bary.value
  return k !== null && k.u >= 0 && k.v >= 0 && k.w >= 0
})

const COL_A = [255, 77, 31]
const COL_B = [10, 10, 10]
const COL_C = [196, 196, 194]
const mix = computed(() => {
  const k = bary.value
  if (!k) return 'transparent'
  const ch = (i: number) => {
    const raw = k.w * (COL_A[i] ?? 0) + k.u * (COL_B[i] ?? 0) + k.v * (COL_C[i] ?? 0)
    return Math.round(Math.min(255, Math.max(0, raw)))
  }
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`
})

const centroid = (s: Point, t: Point, q: Point): Point => ({ x: (s.x + t.x + q.x) / 3, y: (s.y + t.y + q.y) / 3 })
const subLabels = computed(() => {
  const k = bary.value
  if (!k) return []
  return [
    { at: centroid(p.value, b.value, c.value), text: `w ${fmt(k.w)}`, neg: k.w < 0 },
    { at: centroid(a.value, p.value, c.value), text: `u ${fmt(k.u)}`, neg: k.u < 0 },
    { at: centroid(a.value, b.value, p.value), text: `v ${fmt(k.v)}`, neg: k.v < 0 },
  ]
})

const fmt = (x: number) => x.toFixed(2)
const tri = computed(() => `${a.value.x},${a.value.y} ${b.value.x},${b.value.y} ${c.value.x},${c.value.y}`)
</script>

<template>
  <DemoPanel title="Coordonnées barycentriques">
    <svg
      ref="svg"
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full h-auto"
      role="img"
      aria-label="Triangle ABC et point P ; les poids barycentriques u, v, w de P sont recalculés quand on déplace les sommets ou le point."
    >
      <polygon :points="tri" class="tri" />
      <line v-for="(q, i) in [a, b, c]" :key="i" :x1="p.x" :y1="p.y" :x2="q.x" :y2="q.y" class="spoke" />

      <text
        v-for="(l, i) in subLabels"
        :key="`l${i}`"
        :x="l.at.x"
        :y="l.at.y"
        text-anchor="middle"
        class="demo-label demo-small"
        :style="l.neg ? 'fill: var(--color-accent)' : 'fill: var(--color-text-mid)'"
      >{{ l.text }}</text>

      <circle :cx="a.x" :cy="a.y" r="10" class="demo-handle" style="fill: var(--color-accent)" @pointerdown="start('a', $event)" />
      <circle :cx="b.x" :cy="b.y" r="10" class="demo-handle" style="fill: var(--color-text-primary)" @pointerdown="start('b', $event)" />
      <circle :cx="c.x" :cy="c.y" r="10" class="demo-handle" style="fill: var(--color-text-greyed)" @pointerdown="start('c', $event)" />
      <text :x="a.x - 26" :y="a.y + 6" class="demo-label">A</text>
      <text :x="b.x + 16" :y="b.y + 6" class="demo-label">B</text>
      <text :x="c.x + 16" :y="c.y + 4" class="demo-label">C</text>

      <circle
        :cx="p.x"
        :cy="p.y"
        r="13"
        class="demo-handle"
        :class="!inside && 'is-out'"
        :style="{ fill: mix }"
        @pointerdown="start('p', $event)"
      />
      <text :x="p.x + 18" :y="p.y - 14" class="demo-label" :style="!inside && 'fill: var(--color-accent)'">P</text>
    </svg>

    <template #controls>
      <p class="font-sans font-light italic text-[13px] leading-[20px] text-mid m-0">
        Glisse A, B, C et P. Chaque poids est l'aire du sous-triangle opposé, divisée par l'aire totale.
      </p>
    </template>

    <template #readout>
      <template v-if="bary">
        <span>u (poids de B) = <b>{{ fmt(bary.u) }}</b></span>
        <span>v (poids de C) = <b>{{ fmt(bary.v) }}</b></span>
        <span>w = 1 − u − v = <b>{{ fmt(bary.w) }}</b></span>
        <span :class="!inside && 'text-accent'">{{ inside ? 'u, v, w ≥ 0 : dedans' : 'un poids < 0 : dehors' }}</span>
      </template>
      <span v-else class="text-accent">Triangle dégénéré : aire nulle</span>
    </template>
  </DemoPanel>
</template>

<style scoped>
.tri {
  fill: var(--color-bg-page);
  stroke: var(--color-text-primary);
  stroke-width: 1.5;
}

.spoke {
  stroke: var(--color-text-mid);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.demo-handle {
  stroke: var(--color-text-primary);
  stroke-width: 2;
  cursor: grab;
  transition: stroke var(--dur-fast) var(--ease-out);
}

.demo-handle:hover,
.demo-handle.is-out {
  stroke: var(--color-accent);
}

.demo-label {
  font-family: var(--font-mono);
  font-size: 13px;
  fill: var(--color-text-primary);
}

.demo-small {
  font-size: 13px;
}
</style>
