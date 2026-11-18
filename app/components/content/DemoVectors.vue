<script setup lang="ts">
import type { Point } from '~/composables/useSvgDrag'

const W = 640
const H = 320
const UNIT = 40
const O = { x: 280, y: 200 }

const uid = useId()
const gridId = `demo-vectors-grid-${uid}`
const arrowId = `demo-vectors-arrow-${uid}`
const arrowAccentId = `demo-vectors-arrow-accent-${uid}`

const svg = ref<SVGSVGElement | null>(null)
const aTip = ref<Point>({ x: O.x + 3 * UNIT, y: O.y - 3 * UNIT })
const bTip = ref<Point>({ x: O.x + 5 * UNIT, y: O.y })

const snap = (v: number) => Math.round(v * 4) / 4
const clamp = (_k: string, p: Point): Point => {
  const x = O.x + snap((Math.min(W - 12, Math.max(12, p.x)) - O.x) / UNIT) * UNIT
  const y = O.y + snap((Math.min(H - 12, Math.max(12, p.y)) - O.y) / UNIT) * UNIT
  return x === O.x && y === O.y ? { x: x + UNIT, y } : { x, y }
}
const { start } = useSvgDrag(svg, { aTip, bTip }, clamp)

const toWorld = (p: Point) => ({ x: (p.x - O.x) / UNIT, y: -(p.y - O.y) / UNIT })
const toSvg = (v: { x: number, y: number }) => ({ x: O.x + v.x * UNIT, y: O.y - v.y * UNIT })

const a = computed(() => toWorld(aTip.value))
const b = computed(() => toWorld(bTip.value))
const lenA = computed(() => Math.hypot(a.value.x, a.value.y))
const lenB = computed(() => Math.hypot(b.value.x, b.value.y))
const dot = computed(() => a.value.x * b.value.x + a.value.y * b.value.y)
const crossZ = computed(() => a.value.x * b.value.y - a.value.y * b.value.x)
const angle = computed(() => {
  const c = dot.value / (lenA.value * lenB.value)
  return (Math.acos(Math.min(1, Math.max(-1, c))) * 180) / Math.PI
})
const projK = computed(() => dot.value / (lenB.value * lenB.value))
const proj = computed(() => toSvg({ x: projK.value * b.value.x, y: projK.value * b.value.y }))
const bLine = computed(() => ({
  from: toSvg({ x: -20 * b.value.x / lenB.value, y: -20 * b.value.y / lenB.value }),
  to: toSvg({ x: 20 * b.value.x / lenB.value, y: 20 * b.value.y / lenB.value }),
}))
const parallelogram = computed(() => {
  const s = toSvg({ x: a.value.x + b.value.x, y: a.value.y + b.value.y })
  return `${O.x},${O.y} ${aTip.value.x},${aTip.value.y} ${s.x},${s.y} ${bTip.value.x},${bTip.value.y}`
})

const relation = computed(() => {
  if (Math.abs(dot.value) < 1e-9) return 'a · b = 0 : perpendiculaires'
  return dot.value > 0 ? 'a · b > 0 : même côté' : 'a · b < 0 : opposés'
})

const fmt = (v: number) => v.toFixed(2)
</script>

<template>
  <DemoPanel title="Produit scalaire, produit vectoriel">
    <svg
      ref="svg"
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full h-auto"
      role="img"
      aria-label="Deux vecteurs a et b partant de l'origine. La projection de a sur b est tracée, le parallélogramme formé par a et b a pour aire la norme du produit vectoriel."
    >
      <defs>
        <pattern :id="gridId" :width="UNIT" :height="UNIT" patternUnits="userSpaceOnUse" :x="O.x" :y="O.y">
          <path :d="`M ${UNIT} 0 L 0 0 0 ${UNIT}`" fill="none" style="stroke: var(--color-text-greyed)" stroke-width="0.5" />
        </pattern>
        <marker :id="arrowId" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--color-text-primary)" />
        </marker>
        <marker :id="arrowAccentId" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--color-accent)" />
        </marker>
      </defs>
      <rect :width="W" :height="H" :fill="`url(#${gridId})`" />

      <polygon :points="parallelogram" class="demo-area" />
      <line :x1="bLine.from.x" :y1="bLine.from.y" :x2="bLine.to.x" :y2="bLine.to.y" style="stroke: var(--color-text-mid)" stroke-width="1" stroke-dasharray="4 4" />
      <line :x1="aTip.x" :y1="aTip.y" :x2="proj.x" :y2="proj.y" style="stroke: var(--color-text-mid)" stroke-width="1" stroke-dasharray="2 3" />
      <line
        :x1="O.x" :y1="O.y" :x2="proj.x" :y2="proj.y"
        style="stroke: var(--color-accent)" stroke-width="4" stroke-linecap="round"
        :marker-end="Math.abs(projK) * lenB > 0.3 ? `url(#${arrowAccentId})` : undefined"
      />
      <text :x="proj.x + 8" :y="proj.y + 18" class="demo-label" style="fill: var(--color-accent)">proj</text>

      <line :x1="O.x" :y1="O.y" :x2="bTip.x" :y2="bTip.y" style="stroke: var(--color-text-primary)" stroke-width="2" :marker-end="`url(#${arrowId})`" />
      <line :x1="O.x" :y1="O.y" :x2="aTip.x" :y2="aTip.y" style="stroke: var(--color-text-primary)" stroke-width="2" :marker-end="`url(#${arrowId})`" />
      <circle :cx="O.x" :cy="O.y" r="3" style="fill: var(--color-text-primary)" />

      <circle :cx="aTip.x" :cy="aTip.y" r="9" class="demo-handle" @pointerdown="start('aTip', $event)" />
      <text :x="aTip.x + 12" :y="aTip.y - 8" class="demo-label">a</text>
      <circle :cx="bTip.x" :cy="bTip.y" r="9" class="demo-handle" @pointerdown="start('bTip', $event)" />
      <text :x="bTip.x + 12" :y="bTip.y - 8" class="demo-label">b</text>
    </svg>

    <template #controls>
      <p class="font-sans font-light italic text-[13px] leading-[20px] text-mid m-0">
        Glisse les pointes de a et b. Le trait orange est la projection de a sur b ; la zone grisée a pour aire |a × b|.
      </p>
    </template>

    <template #readout>
      <span>a = (<b>{{ fmt(a.x) }}</b>, <b>{{ fmt(a.y) }}</b>)</span>
      <span>b = (<b>{{ fmt(b.x) }}</b>, <b>{{ fmt(b.y) }}</b>)</span>
      <span>a · b = <b>{{ fmt(dot) }}</b></span>
      <span>(a × b).z = <b>{{ fmt(crossZ) }}</b></span>
      <span>θ = <b>{{ angle.toFixed(1) }}°</b></span>
      <span>|a| = <b>{{ fmt(lenA) }}</b>, |b| = <b>{{ fmt(lenB) }}</b></span>
      <span :class="Math.abs(dot) < 1e-9 && 'text-accent'">{{ relation }}</span>
    </template>
  </DemoPanel>
</template>

<style scoped>
.demo-area {
  fill: var(--color-text-greyed);
  fill-opacity: 0.35;
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
