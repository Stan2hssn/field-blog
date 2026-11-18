<script setup lang="ts">
const W = 640
const H = 300
const UNIT = 70
const EYE = { x: 50, y: 150 }
const VIEWPORT_H = 2

const uid = useId()
const arrowId = `demo-camera-rays-arrow-${uid}`

const focal = ref(1)
const n = ref(6)
const jRaw = ref(2)
const j = computed(() => Math.min(jRaw.value, n.value - 1))

const vx = computed(() => EYE.x + focal.value * UNIT)
const top = EYE.y - (VIEWPORT_H / 2) * UNIT
const dv = computed(() => VIEWPORT_H / n.value)
const fov = computed(() => (2 * Math.atan(VIEWPORT_H / 2 / focal.value) * 180) / Math.PI)

const centers = computed(() =>
  Array.from({ length: n.value }, (_, k) => {
    const yWorld = VIEWPORT_H / 2 - (k + 0.5) * dv.value
    const y = EYE.y - yWorld * UNIT
    const slope = (y - EYE.y) / (vx.value - EYE.x)
    const farX = W - 12
    return { k, yWorld, y, farX, farY: EYE.y + slope * (farX - EYE.x) }
  }),
)
const ticks = computed(() => Array.from({ length: n.value + 1 }, (_, k) => top + k * dv.value * UNIT))
const sel = computed(() => centers.value[j.value]!)

const fmt = (v: number) => v.toFixed(2)
const fmtInt = (v: number) => String(v)
</script>

<template>
  <DemoPanel title="Un rayon par centre de pixel">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full h-auto"
      role="img"
      aria-label="Vue de profil : l'œil à gauche, le viewport vertical découpé en pixels, un rayon part de l'œil et traverse le centre de chaque pixel."
    >
      <defs>
        <marker :id="arrowId" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--color-text-mid)" />
        </marker>
      </defs>

      <line :x1="EYE.x" :y1="EYE.y" :x2="W - 12" :y2="EYE.y" style="stroke: var(--color-text-greyed)" stroke-width="1" :marker-end="`url(#${arrowId})`" />
      <text :x="W - 90" :y="EYE.y + 18" class="demo-small">−z (devant)</text>
      <line :x1="EYE.x" :y1="H - 20" :x2="EYE.x" :y2="20" style="stroke: var(--color-text-greyed)" stroke-width="1" :marker-end="`url(#${arrowId})`" />
      <text :x="EYE.x + 8" :y="28" class="demo-small">+y</text>

      <line
        v-for="c in centers"
        :key="`r${c.k}`"
        :x1="EYE.x" :y1="EYE.y" :x2="c.farX" :y2="c.farY"
        :style="{ stroke: c.k === j ? 'var(--color-accent)' : 'var(--color-text-mid)' }"
        :stroke-width="c.k === j ? 2 : 1"
        :stroke-dasharray="c.k === j ? undefined : '3 4'"
      />

      <line :x1="vx" :y1="top" :x2="vx" :y2="top + VIEWPORT_H * UNIT" style="stroke: var(--color-text-primary)" stroke-width="3" />
      <line
        v-for="(t, k) in ticks"
        :key="`t${k}`"
        :x1="vx - 7" :y1="t" :x2="vx + 7" :y2="t"
        style="stroke: var(--color-text-primary)" stroke-width="1.5"
      />
      <circle
        v-for="c in centers"
        :key="`c${c.k}`"
        :cx="vx" :cy="c.y" r="3.5"
        :style="{ fill: c.k === j ? 'var(--color-accent)' : 'var(--color-text-primary)' }"
      />
      <text :x="vx + 12" :y="centers[0]!.y + 4" class="demo-small">j=0</text>
      <text :x="vx + 12" :y="centers[n - 1]!.y + 4" class="demo-small">j={{ n - 1 }}</text>

      <line :x1="EYE.x" :y1="H - 34" :x2="vx" :y2="H - 34" style="stroke: var(--color-text-mid)" stroke-width="1" />
      <line :x1="EYE.x" :y1="H - 40" :x2="EYE.x" :y2="H - 28" style="stroke: var(--color-text-mid)" stroke-width="1" />
      <line :x1="vx" :y1="H - 40" :x2="vx" :y2="H - 28" style="stroke: var(--color-text-mid)" stroke-width="1" />
      <text :x="(EYE.x + vx) / 2 - 8" :y="H - 14" class="demo-small">f</text>

      <circle :cx="EYE.x" :cy="EYE.y" r="6" style="fill: var(--color-text-primary)" />
      <text :x="EYE.x - 10" :y="EYE.y - 14" class="demo-label">œil</text>
    </svg>

    <template #controls>
      <DemoRange v-model="focal" label="focale f" :min="0.4" :max="3" :step="0.05" :format="fmt" />
      <DemoRange v-model="n" label="pixels" :min="2" :max="16" :step="1" :format="fmtInt" />
      <DemoRange v-model="jRaw" label="ligne j" :min="0" :max="15" :step="1" :format="(v: number) => String(Math.min(v, n - 1))" />
    </template>

    <template #readout>
      <span>hauteur viewport = <b>{{ fmt(VIEWPORT_H) }}</b></span>
      <span>FOV vertical = <b>{{ fov.toFixed(1) }}°</b></span>
      <span>Δv = 2 / {{ n }} = <b>{{ dv.toFixed(3) }}</b></span>
      <span>centre j = 1 − ({{ j }} + 0.5)·Δv = <b>{{ sel.yWorld.toFixed(3) }}</b></span>
      <span>direction (y, z) = (<b>{{ sel.yWorld.toFixed(3) }}</b>, <b>{{ fmt(-focal) }}</b>)</span>
    </template>
  </DemoPanel>
</template>

<style scoped>
.demo-label {
  font-family: var(--font-mono);
  font-size: 13px;
  fill: var(--color-text-primary);
}

.demo-small {
  font-family: var(--font-mono);
  font-size: 11px;
  fill: var(--color-text-mid);
}
</style>
