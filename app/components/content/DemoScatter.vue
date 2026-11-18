<script setup lang="ts">
import type { Point } from '~/composables/useSvgDrag'

type Mode = 'lambert' | 'metal' | 'glass'
interface V2 { x: number, y: number }

const W = 640
const H = 340
const P: Point = { x: 320, y: 170 }
const U = 80
const L = 1.8
const MODES: { id: Mode, label: string }[] = [
  { id: 'lambert', label: 'Lambert' },
  { id: 'metal', label: 'Métal' },
  { id: 'glass', label: 'Verre' },
]

const svg = ref<SVGSVGElement | null>(null)
const mode = ref<Mode>('lambert')
const source = ref<Point>({ x: 150, y: 50 })
const fuzz = ref(0.2)
const eta = ref(1.5)
const seed = ref(1)

const clamp = (_k: string, p: Point): Point => {
  const x = Math.min(W - 12, Math.max(12, p.x))
  let y = Math.min(H - 12, Math.max(12, p.y))
  if (mode.value !== 'glass' || y < P.y) y = Math.min(y, P.y - 14)
  else y = Math.max(y, P.y + 14)
  return { x, y }
}
const { start } = useSvgDrag(svg, { source }, clamp)

watch(mode, (m) => {
  if (m !== 'glass' && source.value.y > P.y) source.value = { x: source.value.x, y: 2 * P.y - source.value.y }
})

function mulberry32(s: number) {
  let a = s >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const dot = (a: V2, b: V2) => a.x * b.x + a.y * b.y
const norm = (a: V2): V2 => {
  const l = Math.hypot(a.x, a.y) || 1
  return { x: a.x / l, y: a.y / l }
}
const toSvg = (d: V2, len = L): Point => ({ x: P.x + d.x * len * U, y: P.y - d.y * len * U })

const v = computed(() => norm({ x: P.x - source.value.x, y: -(P.y - source.value.y) }))
const frontFace = computed(() => v.value.y < 0)
const n = computed<V2>(() => (frontFace.value ? { x: 0, y: 1 } : { x: 0, y: -1 }))
const reflected = computed<V2>(() => {
  const k = 2 * dot(v.value, n.value)
  return { x: v.value.x - k * n.value.x, y: v.value.y - k * n.value.y }
})

const randomUnit = (rand: () => number): V2 => {
  const a = rand() * Math.PI * 2
  return { x: Math.cos(a), y: Math.sin(a) }
}

const lambertRays = computed(() => {
  const rand = mulberry32(seed.value * 101)
  return Array.from({ length: 28 }, () => {
    const u = randomUnit(rand)
    return toSvg(norm({ x: n.value.x + u.x, y: n.value.y + u.y }), 1.1 + rand() * 0.5)
  })
})

const metalRays = computed(() => {
  const rand = mulberry32(seed.value * 313)
  return Array.from({ length: 14 }, () => {
    const u = randomUnit(rand)
    const d = { x: reflected.value.x + fuzz.value * u.x, y: reflected.value.y + fuzz.value * u.y }
    return { tip: toSvg(norm(d)), absorbed: dot(d, n.value) <= 0 }
  })
})

const glass = computed(() => {
  const ratio = frontFace.value ? 1 / eta.value : eta.value
  const cos = Math.min(-dot(v.value, n.value), 1)
  const sin = Math.sqrt(1 - cos * cos)
  const tir = ratio * sin > 1
  const r0 = ((1 - ratio) / (1 + ratio)) ** 2
  const schlick = r0 + (1 - r0) * (1 - cos) ** 5
  const perp = { x: ratio * (v.value.x + cos * n.value.x), y: ratio * (v.value.y + cos * n.value.y) }
  const k = -Math.sqrt(Math.abs(1 - dot(perp, perp)))
  const refracted = { x: perp.x + k * n.value.x, y: perp.y + k * n.value.y }
  const deg = (r: number) => (r * 180) / Math.PI
  return {
    ratio,
    tir,
    reflectance: tir ? 1 : schlick,
    refracted,
    thetaI: deg(Math.acos(cos)),
    thetaT: tir ? null : deg(Math.asin(ratio * sin)),
  }
})

const reflTip = computed(() => toSvg(reflected.value))
const fmt = (x: number) => x.toFixed(2)
</script>

<template>
  <DemoPanel title="Trois façons de renvoyer un rayon">
    <svg
      ref="svg"
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full h-auto"
      role="img"
      :aria-label="`Coupe 2D d'une surface touchée par un rayon. Matériau : ${MODES.find((m) => m.id === mode)?.label}.`"
    >
      <defs>
        <marker id="demo-scatter-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--color-text-primary)" />
        </marker>
        <marker id="demo-scatter-arrow-accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--color-accent)" />
        </marker>
      </defs>

      <rect x="0" :y="P.y" :width="W" :height="H - P.y" :class="mode === 'glass' ? 'medium-glass' : 'medium-solid'" />
      <line x1="0" :x2="W" :y1="P.y" :y2="P.y" style="stroke: var(--color-text-primary)" stroke-width="1.5" />
      <text x="12" :y="P.y - 8" class="demo-label demo-small">air · η = 1</text>
      <text x="12" :y="P.y + 20" class="demo-label demo-small">{{ mode === 'glass' ? `verre · η = ${fmt(eta)}` : 'objet opaque' }}</text>

      <g v-if="mode === 'lambert'">
        <circle :cx="P.x + n.x * U" :cy="P.y - n.y * U" :r="U" fill="none" style="stroke: var(--color-text-greyed)" stroke-dasharray="4 4" />
        <line v-for="(t, i) in lambertRays" :key="i" :x1="P.x" :y1="P.y" :x2="t.x" :y2="t.y" style="stroke: var(--color-accent)" stroke-width="1" stroke-opacity="0.7" />
      </g>

      <g v-else-if="mode === 'metal'">
        <circle :cx="P.x + reflected.x * U" :cy="P.y - reflected.y * U" :r="Math.max(fuzz * U, 0.5)" fill="none" style="stroke: var(--color-text-mid)" stroke-dasharray="3 3" />
        <line
          v-for="(r, i) in metalRays"
          :key="i"
          :x1="P.x"
          :y1="P.y"
          :x2="r.tip.x"
          :y2="r.tip.y"
          :style="r.absorbed ? 'stroke: var(--color-text-greyed)' : 'stroke: var(--color-text-mid)'"
          :stroke-dasharray="r.absorbed ? '3 3' : undefined"
          stroke-width="1"
        />
        <line :x1="P.x" :y1="P.y" :x2="reflTip.x" :y2="reflTip.y" style="stroke: var(--color-accent)" stroke-width="2.5" marker-end="url(#demo-scatter-arrow-accent)" />
      </g>

      <g v-else>
        <line
          :x1="P.x"
          :y1="P.y"
          :x2="reflTip.x"
          :y2="reflTip.y"
          style="stroke: var(--color-text-primary)"
          :stroke-opacity="Math.max(glass.reflectance, 0.12)"
          stroke-width="2"
          marker-end="url(#demo-scatter-arrow)"
        />
        <line
          v-if="!glass.tir"
          :x1="P.x"
          :y1="P.y"
          :x2="toSvg(glass.refracted).x"
          :y2="toSvg(glass.refracted).y"
          style="stroke: var(--color-accent)"
          stroke-width="2.5"
          marker-end="url(#demo-scatter-arrow-accent)"
        />
      </g>

      <line :x1="P.x" :y1="P.y" :x2="P.x + n.x * 50" :y2="P.y - n.y * 50" style="stroke: var(--color-text-primary)" stroke-width="1.5" marker-end="url(#demo-scatter-arrow)" />
      <text :x="P.x + 8" :y="P.y - n.y * 50 + (frontFace ? 4 : 10)" class="demo-label demo-small">n</text>

      <line :x1="source.x" :y1="source.y" :x2="P.x" :y2="P.y" style="stroke: var(--color-text-primary)" stroke-width="2" marker-end="url(#demo-scatter-arrow)" />
      <circle :cx="P.x" :cy="P.y" r="4" style="fill: var(--color-text-primary)" />
      <circle :cx="source.x" :cy="source.y" r="9" class="demo-handle" @pointerdown="start('source', $event)" />
      <text :x="source.x + 12" :y="source.y - 10" class="demo-label">v</text>
    </svg>

    <template #controls>
      <div class="flex gap-[8px]" role="group" aria-label="Matériau">
        <button
          v-for="m in MODES"
          :key="m.id"
          type="button"
          :aria-pressed="mode === m.id"
          class="px-[10px] py-[4px] rounded-[4px] border font-mono font-medium text-[11px] leading-[16px] tracking-kicker uppercase cursor-pointer bg-transparent transition-colors duration-fast ease-out"
          :class="mode === m.id ? 'border-solid border-accent text-accent' : 'border-dashed border-primary text-primary hover:text-accent'"
          @click="mode = m.id"
        >
          {{ m.label }}
        </button>
      </div>
      <DemoRange v-if="mode === 'metal'" v-model="fuzz" label="fuzz" :min="0" :max="1" :step="0.01" :format="fmt" />
      <DemoRange v-if="mode === 'glass'" v-model="eta" label="η" :min="1" :max="2.4" :step="0.01" :format="fmt" />
      <button
        v-if="mode !== 'glass'"
        type="button"
        class="px-[10px] py-[4px] rounded-[4px] border border-dashed border-primary font-mono font-medium text-[11px] leading-[16px] tracking-kicker uppercase text-primary bg-transparent cursor-pointer hover:text-accent"
        @click="seed++"
      >
        Re-tirer
      </button>
      <p class="font-sans font-light italic text-[13px] leading-[20px] text-mid m-0">
        Glisse v. En verre, passe sous la surface.
      </p>
    </template>

    <template #readout>
      <span>front_face : <b>{{ frontFace ? 'oui' : 'non (intérieur)' }}</b></span>
      <template v-if="mode === 'lambert'">
        <span>direction : <b>n + vecteur unitaire aléatoire</b></span>
      </template>
      <template v-else-if="mode === 'metal'">
        <span>r = v − 2(v·n)n</span>
        <span>absorbés : <b>{{ metalRays.filter((r) => r.absorbed).length }} / {{ metalRays.length }}</b></span>
      </template>
      <template v-else>
        <span>ratio η : <b>{{ fmt(glass.ratio) }}</b></span>
        <span>θ incident : <b>{{ glass.thetaI.toFixed(1) }}°</b></span>
        <span>θ réfracté : <b>{{ glass.thetaT === null ? '—' : `${glass.thetaT.toFixed(1)}°` }}</b></span>
        <span>Schlick : <b>{{ Math.round(glass.reflectance * 100) }} % réfléchi</b></span>
        <span v-if="glass.tir" class="text-accent">Réflexion totale interne</span>
      </template>
    </template>
  </DemoPanel>
</template>

<style scoped>
.medium-glass {
  fill: var(--color-accent);
  fill-opacity: 0.06;
}

.medium-solid {
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

.demo-small {
  font-size: 11px;
}
</style>
