<script setup lang="ts">
const W = 640
const H = 300
const EYE = { x: 180, y: 155 }
const R = 100
const STRIP = { x: 440, y: 30, w: 40, h: 240 }
const SKY = { r: 0.5, g: 0.7, b: 1.0 }

const uid = useId()
const gradId = `schema-sky-lerp-grad-${uid}`
const arrowId = `schema-sky-lerp-arrow-${uid}`

const skyAt = (a: number) => ({
  r: (1 - a) + a * SKY.r,
  g: (1 - a) + a * SKY.g,
  b: (1 - a) + a * SKY.b,
})
const css = (c: { r: number, g: number, b: number }) =>
  `rgb(${Math.round(255 * c.r)}, ${Math.round(255 * c.g)}, ${Math.round(255 * c.b)})`

const SEGMENTS = 72
const RING = R + 14
const ring = Array.from({ length: SEGMENTS }, (_, k) => {
  const t0 = (k / SEGMENTS) * 2 * Math.PI
  const t1 = ((k + 1) / SEGMENTS) * 2 * Math.PI
  const p = (t: number) => `${EYE.x + RING * Math.cos(t)} ${EYE.y - RING * Math.sin(t)}`
  return { d: `M ${p(t0)} A ${RING} ${RING} 0 0 0 ${p(t1)}`, stroke: css(skyAt(0.5 * (Math.sin((t0 + t1) / 2) + 1))) }
})

const dirs = [60, 0, -40].map((deg) => {
  const th = (deg * Math.PI) / 180
  const dy = Math.sin(th)
  const a = 0.5 * (dy + 1)
  return {
    deg,
    dy,
    a,
    color: css(skyAt(a)),
    tip: { x: EYE.x + R * Math.cos(th), y: EYE.y - R * Math.sin(th) },
    label: { x: EYE.x + (RING + 18) * Math.cos(th), y: EYE.y - (RING + 18) * Math.sin(th) },
    markY: STRIP.y + (1 - a) * STRIP.h,
  }
})
</script>

<template>
  <div class="w-full bg-bg-card">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full h-auto"
      role="img"
      aria-label="Trois rayons partent de l'œil : vers le haut à 60 degrés, a vaut 0,93 et la couleur est presque bleu ciel ; à l'horizontale, a vaut 0,5 ; vers le bas à 40 degrés, a vaut 0,18, presque blanc. À droite, le dégradé complet du blanc au bleu avec les trois valeurs repérées."
    >
      <defs>
        <linearGradient :id="gradId" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" :stop-color="css(skyAt(0))" />
          <stop offset="1" :stop-color="css(skyAt(1))" />
        </linearGradient>
        <marker :id="arrowId" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--color-text-primary)" />
        </marker>
      </defs>

      <path v-for="(s, k) in ring" :key="k" :d="s.d" fill="none" :style="{ stroke: s.stroke }" stroke-width="10" />
      <circle :cx="EYE.x" :cy="EYE.y" :r="R" fill="none" style="stroke: var(--color-text-greyed)" stroke-dasharray="3 4" />
      <line :x1="EYE.x - R - 30" :y1="EYE.y" :x2="EYE.x - 8" :y2="EYE.y" style="stroke: var(--color-text-greyed)" />

      <g v-for="d in dirs" :key="d.deg">
        <line :x1="EYE.x" :y1="EYE.y" :x2="d.tip.x" :y2="d.tip.y" style="stroke: var(--color-text-primary)" stroke-width="2" :marker-end="`url(#${arrowId})`" />
        <text
          :x="d.label.x"
          :y="d.label.y + 5"
          :text-anchor="d.deg === 0 ? 'start' : 'middle'"
          class="sm"
        >d.y = {{ d.dy.toFixed(2) }}</text>
        <line :x1="STRIP.x - 6" :y1="d.markY" :x2="STRIP.x + STRIP.w + 6" :y2="d.markY" style="stroke: var(--color-accent)" stroke-width="3" />
        <rect :x="STRIP.x + STRIP.w + 16" :y="d.markY - 11" width="22" height="22" :fill="d.color" style="stroke: var(--color-text-greyed)" />
        <text :x="STRIP.x + STRIP.w + 46" :y="d.markY + 5" class="lbl">a = {{ d.a.toFixed(2) }}</text>
      </g>
      <circle :cx="EYE.x" :cy="EYE.y" r="4" style="fill: var(--color-text-primary)" />
      <text :x="EYE.x - 12" :y="EYE.y + 22" text-anchor="end" class="sm">œil</text>

      <rect :x="STRIP.x" :y="STRIP.y" :width="STRIP.w" :height="STRIP.h" :fill="`url(#${gradId})`" style="stroke: var(--color-text-greyed)" />
      <text :x="STRIP.x - 10" :y="STRIP.y + 12" text-anchor="end" class="sm">bleu</text>
      <text :x="STRIP.x - 10" :y="STRIP.y + STRIP.h" text-anchor="end" class="sm">blanc</text>
      <text x="24" :y="H - 16" class="sm">a = 0.5 · (d.y + 1)</text>
    </svg>
  </div>
</template>

<style scoped>
.lbl {
  font-family: var(--font-mono);
  font-size: 14px;
  fill: var(--color-text-primary);
}

.sm {
  font-family: var(--font-mono);
  font-size: 13px;
  fill: var(--color-text-secondary);
}
</style>
