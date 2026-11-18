<script setup lang="ts">
const W = 640
const H = 340
const UNIT = 36
const OX = 40
const RAY_Y = 110
const T_MIN = 0.001
const T_MAX = 16

const SPHERES = [
  { name: 'A', cx: 360, cy: 120, r: 50 },
  { name: 'B', cx: 190, cy: 104, r: 44 },
  { name: 'C', cx: 520, cy: 116, r: 38 },
] as const

const xOf = (t: number) => OX + t * UNIT

function roots(cx: number, cy: number, r: number): [number, number] {
  const half = Math.sqrt(r * r - (cy - RAY_Y) ** 2)
  return [(cx - OX - half) / UNIT, (cx - OX + half) / UNIT]
}

let closest = T_MAX
const steps = SPHERES.map((s, i) => {
  const all = roots(s.cx, s.cy, s.r)
  const before = closest
  const hit = all.find((t) => t >= T_MIN && t <= closest)
  if (hit !== undefined) closest = hit
  return { ...s, i, all, before, hit }
})
const winner = [...steps].reverse().find((s) => s.hit !== undefined)

const fmt = (v: number) => v.toFixed(2)
const BAR_Y = (i: number) => 220 + i * 40
</script>

<template>
  <div class="schema w-full bg-bg-card">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full h-auto"
      role="img"
      :aria-label="`Un rayon traverse trois sphères testées dans l'ordre A, B, C. A est touchée en t = ${fmt(steps[0]!.all[0])}, ce qui ramène t_max à cette valeur. B est touchée plus près, en t = ${fmt(steps[1]!.all[0])}. Les racines de C sont au-delà du nouveau t_max : C est rejetée sans changer le résultat.`"
    >
      <defs>
        <marker id="schema-closest-hit-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--color-text-mid)" />
        </marker>
      </defs>

      <g v-for="s in steps" :key="s.name">
        <circle :cx="s.cx" :cy="s.cy" :r="s.r" :class="s === winner ? 'sphere sphere-win' : 'sphere'" />
        <text :x="s.cx" :y="s.cy - s.r - 8" text-anchor="middle" class="label">{{ s.name }}</text>
      </g>

      <line :x1="OX" :y1="RAY_Y" :x2="xOf(T_MAX)" :y2="RAY_Y" style="stroke: var(--color-text-mid)" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#schema-closest-hit-arrow)" />
      <line :x1="OX" :y1="RAY_Y" :x2="xOf(winner?.hit ?? T_MAX)" :y2="RAY_Y" style="stroke: var(--color-accent)" stroke-width="2.5" />
      <circle :cx="OX" :cy="RAY_Y" r="5" style="fill: var(--color-text-primary)" />
      <text :x="OX" :y="RAY_Y + 24" text-anchor="middle" class="label">O</text>

      <template v-for="s in steps" :key="`r${s.name}`">
        <g v-for="(t, k) in s.all" :key="k">
          <circle :cx="xOf(t)" :cy="RAY_Y" :r="t === s.hit ? 5.5 : 4" :class="t === s.hit ? (s === winner ? 'root-win' : 'root-cand') : 'root-out'" />
          <text v-if="k === 0" :x="xOf(t)" :y="RAY_Y + (s.i % 2 ? -14 : 26)" text-anchor="middle" class="label" :class="s === winner && 'label-accent'">{{ fmt(t) }}</text>
        </g>
      </template>

      <text x="40" y="200" class="label label-mid">ordre de test → intervalle [t_min, plus_proche]</text>
      <g v-for="s in steps" :key="`b${s.name}`">
        <text x="14" :y="BAR_Y(s.i) + 5" class="label">{{ s.name }}</text>
        <rect :x="xOf(T_MIN)" :y="BAR_Y(s.i) - 4" :width="(s.before - T_MIN) * UNIT" height="8" class="bar" />
        <line :x1="xOf(s.before)" :x2="xOf(s.before)" :y1="BAR_Y(s.i) - 10" :y2="BAR_Y(s.i) + 10" style="stroke: var(--color-text-primary)" stroke-width="2" />
        <circle v-for="(t, k) in s.all" :key="k" :cx="xOf(t)" :cy="BAR_Y(s.i)" r="4" :class="t === s.hit ? 'root-win' : 'root-out'" />
        <text :x="Math.min(xOf(s.before) + 10, 470)" :y="BAR_Y(s.i) - 10" class="label" :class="s.hit === undefined && 'label-mid'">
          {{ s.hit !== undefined ? `max ${fmt(s.before)} → hit ${fmt(s.hit)}` : `max ${fmt(s.before)} → rejeté` }}
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.sphere {
  fill: var(--color-bg-page);
  stroke: var(--color-text-mid);
  stroke-width: 1.5;
}

.sphere-win {
  stroke: var(--color-accent);
  stroke-width: 2;
}

.root-win {
  fill: var(--color-accent);
}

.root-cand {
  fill: var(--color-text-primary);
}

.root-out {
  fill: var(--color-bg-page);
  stroke: var(--color-text-mid);
  stroke-width: 1.5;
}

.bar {
  fill: var(--color-text-greyed);
}

.label {
  font-family: var(--font-mono);
  font-size: 13px;
  fill: var(--color-text-primary);
}

.label-accent {
  fill: var(--color-accent);
}

.label-mid {
  fill: var(--color-text-mid);
}
</style>
