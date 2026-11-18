<script setup lang="ts">
const W = 640
const H = 260
const UNIT = 40
const O = { x: 150, y: 180 }
const D = { x: 2.2, y: 0.85 }

const uid = useId()
const gridId = `schema-ray-grid-${uid}`
const arrowId = `schema-ray-arrow-${uid}`

const at = (t: number) => ({ x: O.x + t * D.x * UNIT, y: O.y - t * D.y * UNIT })
const behind = at(-1.3)
const far = at(6)
const samples = [
  { t: 0, label: 't = 0 : O' },
  { t: 1, label: 't = 1 : O + D' },
  { t: 2, label: 't = 2' },
  { t: 3, label: 't = 3' },
].map(s => ({ ...s, p: at(s.t) }))
const back = at(-1)
const tip = at(1)
</script>

<template>
  <div class="w-full bg-bg-card">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full h-auto"
      role="img"
      aria-label="Un rayon part de l'origine O dans la direction D. Les points P(t) pour t égal 0, 1, 2 et 3 sont régulièrement espacés le long du rayon ; pour t négatif, le point est derrière l'origine."
    >
      <defs>
        <pattern :id="gridId" :width="UNIT" :height="UNIT" patternUnits="userSpaceOnUse">
          <path :d="`M ${UNIT} 0 L 0 0 0 ${UNIT}`" fill="none" style="stroke: var(--color-text-greyed)" stroke-width="0.5" />
        </pattern>
        <marker :id="arrowId" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--color-text-primary)" />
        </marker>
      </defs>
      <rect :width="W" :height="H" :fill="`url(#${gridId})`" />

      <line :x1="O.x" :y1="O.y" :x2="behind.x" :y2="behind.y" style="stroke: var(--color-text-mid)" stroke-width="1.5" stroke-dasharray="4 5" />
      <line :x1="O.x" :y1="O.y" :x2="far.x" :y2="far.y" style="stroke: var(--color-accent)" stroke-width="2" />
      <line :x1="O.x" :y1="O.y" :x2="tip.x" :y2="tip.y" style="stroke: var(--color-text-primary)" stroke-width="3" :marker-end="`url(#${arrowId})`" />
      <text :x="(O.x + tip.x) / 2 - 6" :y="(O.y + tip.y) / 2 - 12" class="lbl">D</text>

      <g v-for="s in samples" :key="s.t">
        <circle :cx="s.p.x" :cy="s.p.y" :r="s.t === 0 ? 6 : 5" :style="{ fill: s.t === 0 ? 'var(--color-text-primary)' : 'var(--color-accent)' }" />
        <text :x="s.p.x + 6" :y="s.p.y + 24" class="sm">{{ s.label }}</text>
      </g>

      <circle :cx="back.x" :cy="back.y" r="5" fill="none" style="stroke: var(--color-text-mid)" stroke-width="1.5" />
      <text :x="back.x - 30" :y="back.y + 28" class="sm">t = −1 : derrière</text>

      <text :x="W - 24" :y="H - 24" text-anchor="end" class="lbl">P(t) = O + t · D</text>
    </svg>
  </div>
</template>

<style scoped>
.lbl {
  font-family: var(--font-mono);
  font-size: 15px;
  fill: var(--color-text-primary);
}

.sm {
  font-family: var(--font-mono);
  font-size: 13px;
  fill: var(--color-text-secondary);
}
</style>
