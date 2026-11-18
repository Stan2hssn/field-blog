<script setup lang="ts">
import type { Point } from '~/composables/useSvgDrag'

interface Seg { p: Point, q: Point, c: Point }
interface BNode { min: Point, max: Point, depth: number, axis: 'x' | 'y', prims: number[], kids: [BNode, BNode] | null }

const W = 640
const H = 360
const COUNT = 80
const PAD = 3

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(7)
const segs: Seg[] = Array.from({ length: COUNT }, () => {
  const c = { x: 170 + rand() * 440, y: 30 + rand() * 300 }
  const ang = rand() * Math.PI
  const half = 6 + rand() * 7
  const dx = Math.cos(ang) * half
  const dy = Math.sin(ang) * half
  return { p: { x: c.x - dx, y: c.y - dy }, q: { x: c.x + dx, y: c.y + dy }, c }
})

function build(ids: number[], depth: number, maxDepth: number): BNode {
  const pts = ids.flatMap(i => [segs[i]?.p, segs[i]?.q]).filter((q): q is Point => Boolean(q))
  // Padding : un segment horizontal donne une boîte d'épaisseur nulle, que le slab test rate.
  const min = { x: Math.min(...pts.map(q => q.x)) - PAD, y: Math.min(...pts.map(q => q.y)) - PAD }
  const max = { x: Math.max(...pts.map(q => q.x)) + PAD, y: Math.max(...pts.map(q => q.y)) + PAD }
  const axis = max.x - min.x >= max.y - min.y ? 'x' : 'y'
  if (ids.length <= 2 || depth >= maxDepth) return { min, max, depth, axis, prims: ids, kids: null }
  const sorted = [...ids].sort((i, j) => (segs[i]?.c[axis] ?? 0) - (segs[j]?.c[axis] ?? 0))
  const mid = Math.floor(sorted.length / 2)
  return {
    min, max, depth, axis, prims: [],
    kids: [build(sorted.slice(0, mid), depth + 1, maxDepth), build(sorted.slice(mid), depth + 1, maxDepth)],
  }
}

const depth = ref(4)
const root = computed(() => build(segs.map((_, i) => i), 0, depth.value))
const allNodes = computed(() => {
  const out: BNode[] = []
  const walk = (n: BNode) => {
    out.push(n)
    n.kids?.forEach(walk)
  }
  walk(root.value)
  return out
})

const svg = ref<SVGSVGElement | null>(null)
const origin = ref<Point>({ x: 50, y: 180 })
const tip = ref<Point>({ x: 150, y: 170 })
const clampToView = (_k: string, q: Point): Point => ({
  x: Math.min(W - 12, Math.max(12, q.x)),
  y: Math.min(H - 12, Math.max(12, q.y)),
})
const { start } = useSvgDrag(svg, { origin, tip }, clampToView)
const dir = computed(() => ({ x: tip.value.x - origin.value.x, y: tip.value.y - origin.value.y }))

function slab(n: BNode, o: Point, d: Point): number | null {
  let tmin = 0
  let tmax = Number.POSITIVE_INFINITY
  for (const ax of ['x', 'y'] as const) {
    if (Math.abs(d[ax]) < 1e-9) {
      if (o[ax] < n.min[ax] || o[ax] > n.max[ax]) return null
      continue
    }
    let t0 = (n.min[ax] - o[ax]) / d[ax]
    let t1 = (n.max[ax] - o[ax]) / d[ax]
    if (t0 > t1) [t0, t1] = [t1, t0]
    tmin = Math.max(tmin, t0)
    tmax = Math.min(tmax, t1)
    if (tmax < tmin) return null
  }
  return tmin
}

const crs = (a: Point, b: Point) => a.x * b.y - a.y * b.x
function hitSeg(s: Seg, o: Point, d: Point): number | null {
  const e = { x: s.q.x - s.p.x, y: s.q.y - s.p.y }
  const den = crs(d, e)
  if (Math.abs(den) < 1e-9) return null
  const w = { x: s.p.x - o.x, y: s.p.y - o.y }
  const t = crs(w, e) / den
  const u = crs(w, d) / den
  return t >= 0 && u >= 0 && u <= 1 ? t : null
}

const trace = computed(() => {
  const o = origin.value
  const d = dir.value
  const visited = new Set<BNode>()
  const rejected = new Set<BNode>()
  const tested = new Set<number>()
  let closest = Number.POSITIVE_INFINITY
  let hit = -1
  const stack: BNode[] = [root.value]
  while (stack.length) {
    const n = stack.pop() as BNode
    const tEnter = slab(n, o, d)
    if (tEnter === null || tEnter > closest) {
      rejected.add(n)
      continue
    }
    visited.add(n)
    if (n.kids) {
      const [lo, hi] = n.kids
      // On empile le plus lointain d'abord : le proche sort en premier et resserre closest.
      if (d[n.axis] >= 0) stack.push(hi, lo)
      else stack.push(lo, hi)
      continue
    }
    for (const i of n.prims) {
      tested.add(i)
      const s = segs[i]
      const t = s ? hitSeg(s, o, d) : null
      if (t !== null && t < closest) {
        closest = t
        hit = i
      }
    }
  }
  return { visited, rejected, tested, closest, hit }
})

const rayEnd = computed(() => {
  const t = Number.isFinite(trace.value.closest) ? trace.value.closest : 40
  return { x: origin.value.x + dir.value.x * t, y: origin.value.y + dir.value.y * t }
})
const boxClass = (n: BNode) => (trace.value.visited.has(n) ? 'box-hit' : trace.value.rejected.has(n) ? 'box-miss' : 'box-idle')
const fmtInt = (v: number) => String(v)
</script>

<template>
  <DemoPanel title="BVH : ne tester que ce que le rayon peut toucher">
    <svg
      ref="svg"
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full h-auto"
      role="img"
      aria-label="Quatre-vingts segments rangés dans une hiérarchie de boîtes englobantes ; un rayon déplaçable ne teste que les boîtes qu'il traverse."
    >
      <defs>
        <clipPath id="demo-bvh-clip">
          <rect :width="W" :height="H" />
        </clipPath>
      </defs>
      <g clip-path="url(#demo-bvh-clip)">
        <rect
          v-for="(n, i) in allNodes"
          :key="`b${i}`"
          :x="n.min.x"
          :y="n.min.y"
          :width="n.max.x - n.min.x"
          :height="n.max.y - n.min.y"
          :class="boxClass(n)"
        />
        <line
          v-for="(s, i) in segs"
          :key="`s${i}`"
          :x1="s.p.x"
          :y1="s.p.y"
          :x2="s.q.x"
          :y2="s.q.y"
          :class="i === trace.hit ? 'seg-hit' : trace.tested.has(i) ? 'seg-tested' : 'seg-idle'"
        />
        <line :x1="origin.x" :y1="origin.y" :x2="rayEnd.x" :y2="rayEnd.y" class="ray" />
        <circle v-if="trace.hit >= 0" :cx="rayEnd.x" :cy="rayEnd.y" r="5" style="fill: var(--color-accent)" />
      </g>
      <circle :cx="origin.x" :cy="origin.y" r="9" class="demo-handle" @pointerdown="start('origin', $event)" />
      <circle :cx="tip.x" :cy="tip.y" r="7" class="demo-handle" @pointerdown="start('tip', $event)" />
      <text :x="origin.x - 6" :y="origin.y + 26" class="demo-label">O</text>
    </svg>

    <template #controls>
      <DemoRange v-model="depth" label="profondeur" :min="0" :max="6" :step="1" :format="fmtInt" />
      <p class="font-sans font-light italic text-[13px] leading-[20px] text-mid m-0">
        Glisse O et la poignée de direction. Orange : boîtes traversées. Pointillés : boîtes testées puis rejetées.
      </p>
    </template>

    <template #readout>
      <span>force brute <b>{{ COUNT }}</b> segments testés</span>
      <span>BVH <b>{{ trace.tested.size }}</b> segments testés</span>
      <span>boîtes testées <b>{{ trace.visited.size + trace.rejected.size }}</b> / {{ allNodes.length }}</span>
      <span :class="trace.hit >= 0 && 'text-accent'">{{ trace.hit >= 0 ? `touché : segment ${trace.hit}` : 'aucun impact' }}</span>
    </template>
  </DemoPanel>
</template>

<style scoped>
.box-idle,
.box-hit,
.box-miss {
  fill: none;
  stroke-width: 1;
}

.box-idle {
  stroke: var(--color-text-greyed);
}

.box-hit {
  stroke: var(--color-accent);
  stroke-width: 1.5;
}

.box-miss {
  stroke: var(--color-text-mid);
  stroke-dasharray: 3 3;
}

.seg-idle {
  stroke: var(--color-text-greyed);
  stroke-width: 2;
}

.seg-tested {
  stroke: var(--color-text-primary);
  stroke-width: 2.5;
}

.seg-hit {
  stroke: var(--color-accent);
  stroke-width: 3.5;
}

.ray {
  stroke: var(--color-accent);
  stroke-width: 1.5;
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
