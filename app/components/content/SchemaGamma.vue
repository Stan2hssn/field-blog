<script setup lang="ts">
const W = 640
const H = 360
const STEPS = 32
const X0 = 40
const X1 = 600
const SW = (X1 - X0) / STEPS
const PLOT = { top: 214, bottom: 324 }
const V = 0.5

const byte = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 255)
const grey = (x: number) => `rgb(${byte(x)} ${byte(x)} ${byte(x)})`

const steps = Array.from({ length: STEPS }, (_, i) => {
  const lin = (i + 0.5) / STEPS
  return { i, x: X0 + i * SW, raw: grey(lin), corrected: grey(Math.sqrt(lin)) }
})

const px = (x: number) => X0 + x * (X1 - X0)
const py = (y: number) => PLOT.bottom - y * (PLOT.bottom - PLOT.top)
const curve = (f: (x: number) => number) =>
  Array.from({ length: 65 }, (_, i) => {
    const x = i / 64
    return `${i ? 'L' : 'M'} ${px(x).toFixed(1)} ${py(f(x)).toFixed(1)}`
  }).join(' ')
const identityPath = curve((x) => x)
const sqrtPath = curve(Math.sqrt)
const sqrtV = Math.sqrt(V)
</script>

<template>
  <div class="w-full bg-bg-card">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full h-auto"
      role="img"
      aria-label="Deux dégradés du noir au blanc. Le premier écrit la lumière linéaire telle quelle : une lumière de 0,5 donne l'octet 128, que l'écran affiche à environ 25 %. Le second écrit la racine carrée : 0,5 donne l'octet 180, affiché à 50 %. En dessous, les courbes y = x et y = racine de x."
    >
      <text :x="X0" y="22" class="label">Écrit tel quel : octet = v</text>
      <rect v-for="s in steps" :key="`r${s.i}`" :x="s.x" y="30" :width="SW + 0.5" height="50" :style="`fill: ${s.raw}`" />
      <text :x="X0" y="114" class="label">Corrigé : octet = √v</text>
      <rect v-for="s in steps" :key="`c${s.i}`" :x="s.x" y="122" :width="SW + 0.5" height="50" :style="`fill: ${s.corrected}`" />
      <rect :x="X0" y="30" :width="X1 - X0" height="50" fill="none" style="stroke: var(--color-text-greyed)" />
      <rect :x="X0" y="122" :width="X1 - X0" height="50" fill="none" style="stroke: var(--color-text-greyed)" />

      <line :x1="px(V)" :x2="px(V)" y1="26" y2="178" style="stroke: var(--color-accent)" stroke-width="2" />
      <text :x="px(V) + 8" y="98" class="label label-accent">v = 0.5 → octet {{ byte(V) }} → écran ≈ 25 %</text>
      <text :x="px(V) + 8" y="192" class="label label-accent">v = 0.5 → octet {{ byte(sqrtV) }} → écran 50 %</text>

      <line :x1="X0" :x2="X1" :y1="PLOT.bottom" :y2="PLOT.bottom" style="stroke: var(--color-text-mid)" />
      <line :x1="X0" :x2="X0" :y1="PLOT.top" :y2="PLOT.bottom" style="stroke: var(--color-text-mid)" />
      <path :d="identityPath" fill="none" style="stroke: var(--color-text-mid)" stroke-width="1.5" stroke-dasharray="4 4" />
      <path :d="sqrtPath" fill="none" style="stroke: var(--color-accent)" stroke-width="2" />
      <line :x1="px(V)" :x2="px(V)" :y1="PLOT.bottom" :y2="py(sqrtV)" style="stroke: var(--color-text-greyed)" stroke-dasharray="2 3" />
      <circle :cx="px(V)" :cy="py(V)" r="4" style="fill: var(--color-text-mid)" />
      <circle :cx="px(V)" :cy="py(sqrtV)" r="5" style="fill: var(--color-accent)" />
      <text :x="px(V) - 10" :y="py(sqrtV) - 8" text-anchor="end" class="label label-accent">0.71</text>
      <text :x="px(V) + 10" :y="py(V) + 16" class="label label-mid">0.50</text>
      <text :x="X1 - 4" :y="py(1) - 6" text-anchor="end" class="label label-accent">y = √v</text>
      <text :x="X1 - 4" :y="py(0.84)" text-anchor="end" class="label label-mid">y = v</text>
      <text :x="X1" :y="PLOT.bottom + 20" text-anchor="end" class="label label-mid">lumière linéaire v →</text>
    </svg>
  </div>
</template>

<style scoped>
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
