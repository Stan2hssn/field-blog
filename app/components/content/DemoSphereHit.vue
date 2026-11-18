<script setup lang="ts">
import type { Point } from '~/composables/useSvgDrag'

const W = 640
const H = 320
const UNIT = 40
const C: Point = { x: 420, y: 160 }

const svg = ref<SVGSVGElement | null>(null)
const origin = ref<Point>({ x: 90, y: 230 })
const dirTip = ref<Point>({ x: 190, y: 205 })
const radius = ref(2.2)

const clampToView = (_k: string, p: Point): Point => ({
  x: Math.min(W - 12, Math.max(12, p.x)),
  y: Math.min(H - 12, Math.max(12, p.y)),
})
const { start } = useSvgDrag(svg, { origin, dirTip }, clampToView)

// Les t sont invariants par changement d'échelle uniforme : on calcule en pixels,
// on n'affiche en unités que les grandeurs qui en dépendent (a, h, c, Δ).
const solve = computed(() => {
  const o = origin.value
  const d = { x: dirTip.value.x - o.x, y: dirTip.value.y - o.y }
  const oc = { x: C.x - o.x, y: C.y - o.y }
  const r = radius.value * UNIT
  const a = d.x * d.x + d.y * d.y
  const h = d.x * oc.x + d.y * oc.y
  const c = oc.x * oc.x + oc.y * oc.y - r * r
  const disc = h * h - a * c
  const roots = disc >= 0 && a > 0 ? [(h - Math.sqrt(disc)) / a, (h + Math.sqrt(disc)) / a] : []
  const nearest = roots.find((t) => t > 0.001)
  return { d, a, h, c, disc, roots, nearest }
})

const at = (t: number): Point => ({
  x: origin.value.x + t * solve.value.d.x,
  y: origin.value.y + t * solve.value.d.y,
})

const farEnd = computed(() => at(30))

const normal = computed(() => {
  const t = solve.value.nearest
  if (t === undefined) return null
  const p = at(t)
  const r = radius.value * UNIT
  const n = { x: (p.x - C.x) / r, y: (p.y - C.y) / r }
  const inside = solve.value.c < 0
  return { p, tip: { x: p.x + n.x * 56, y: p.y + n.y * 56 }, inside }
})

const U2 = UNIT * UNIT
const fmt = (v: number) => v.toFixed(2)
const status = computed(() => {
  const s = solve.value
  if (s.disc < 0) return 'Δ < 0 : le rayon rate la sphère'
  if (Math.abs(s.disc) < 1e-6 * U2 * U2) return 'Δ = 0 : tangent, une seule racine'
  if (s.nearest === undefined) return 'Deux racines, toutes derrière O'
  return normal.value?.inside ? 'O est dans la sphère : t₁ < 0, on garde t₂' : 'Δ > 0 : deux intersections'
})
</script>

<template>
  <DemoPanel title="Rayon contre sphère : une équation du second degré">
    <svg
      ref="svg"
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full h-auto"
      role="img"
      aria-label="Un rayon partant de O dans la direction D traverse ou rate un cercle de centre C. Les racines t1 et t2 et la normale au point le plus proche sont affichées."
    >
      <defs>
        <pattern id="demo-sphere-hit-grid" :width="UNIT" :height="UNIT" patternUnits="userSpaceOnUse">
          <path :d="`M ${UNIT} 0 L 0 0 0 ${UNIT}`" fill="none" style="stroke: var(--color-text-greyed)" stroke-width="0.5" />
        </pattern>
        <marker id="demo-sphere-hit-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--color-text-primary)" />
        </marker>
        <marker id="demo-sphere-hit-arrow-accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--color-accent)" />
        </marker>
      </defs>
      <rect :width="W" :height="H" fill="url(#demo-sphere-hit-grid)" />

      <circle :cx="C.x" :cy="C.y" :r="radius * UNIT" class="sphere" />
      <circle :cx="C.x" :cy="C.y" r="3" style="fill: var(--color-text-primary)" />
      <text :x="C.x + 8" :y="C.y - 8" class="demo-label">C</text>

      <line :x1="origin.x" :y1="origin.y" :x2="farEnd.x" :y2="farEnd.y" style="stroke: var(--color-text-mid)" stroke-width="1" stroke-dasharray="4 4" />
      <line :x1="origin.x" :y1="origin.y" :x2="dirTip.x" :y2="dirTip.y" style="stroke: var(--color-text-primary)" stroke-width="2" marker-end="url(#demo-sphere-hit-arrow)" />

      <g v-for="(t, i) in solve.roots" :key="i">
        <circle
          :cx="at(t).x"
          :cy="at(t).y"
          r="6"
          :class="t === solve.nearest ? 'hit-near' : 'hit-far'"
        />
        <text :x="at(t).x + 10" :y="at(t).y + (i === 0 ? -10 : 20)" class="demo-label" :style="t === solve.nearest ? 'fill: var(--color-accent)' : ''">
          t{{ i === 0 ? '₁' : '₂' }}
        </text>
      </g>

      <line
        v-if="normal"
        :x1="normal.p.x"
        :y1="normal.p.y"
        :x2="normal.tip.x"
        :y2="normal.tip.y"
        style="stroke: var(--color-accent)"
        stroke-width="2"
        marker-end="url(#demo-sphere-hit-arrow-accent)"
      />
      <text v-if="normal" :x="normal.tip.x + 6" :y="normal.tip.y - 6" class="demo-label" style="fill: var(--color-accent)">n</text>

      <circle :cx="origin.x" :cy="origin.y" r="9" class="demo-handle" @pointerdown="start('origin', $event)" />
      <text :x="origin.x - 22" :y="origin.y + 22" class="demo-label">O</text>
      <circle :cx="dirTip.x" :cy="dirTip.y" r="9" class="demo-handle" @pointerdown="start('dirTip', $event)" />
      <text :x="dirTip.x + 12" :y="dirTip.y + 4" class="demo-label">D</text>
    </svg>

    <template #controls>
      <DemoRange v-model="radius" label="rayon r" :min="0.5" :max="3.5" :step="0.05" :format="fmt" />
      <p class="font-sans font-light italic text-[13px] leading-[20px] text-mid m-0">
        Glisse O et D. Mets O dans la sphère, ou vise à côté.
      </p>
    </template>

    <template #readout>
      <span>a = D·D = <b>{{ fmt(solve.a / U2) }}</b></span>
      <span>h = D·(C−O) = <b>{{ fmt(solve.h / U2) }}</b></span>
      <span>c = |C−O|² − r² = <b>{{ fmt(solve.c / U2) }}</b></span>
      <span>Δ = h² − ac = <b>{{ fmt(solve.disc / (U2 * U2)) }}</b></span>
      <span>t₁ = <b>{{ solve.roots[0] !== undefined ? fmt(solve.roots[0]) : '—' }}</b></span>
      <span>t₂ = <b>{{ solve.roots[1] !== undefined ? fmt(solve.roots[1]) : '—' }}</b></span>
      <span class="text-accent">{{ status }}</span>
    </template>
  </DemoPanel>
</template>

<style scoped>
.sphere {
  fill: var(--color-bg-page);
  fill-opacity: 0.6;
  stroke: var(--color-text-primary);
  stroke-width: 1.5;
}

.hit-near {
  fill: var(--color-accent);
}

.hit-far {
  fill: var(--color-bg-page);
  stroke: var(--color-text-mid);
  stroke-width: 2;
}

.demo-handle {
  fill: var(--color-bg-page);
  stroke: var(--color-text-primary);
  stroke-width: 2;
  cursor: grab;
  transition: stroke var(--dur-fast) var(--ease-out);
}

.demo-handle:hover {
  stroke: var(--color-accent);
}

.demo-label {
  font-family: var(--font-mono);
  font-size: 13px;
  fill: var(--color-text-primary);
}
</style>
