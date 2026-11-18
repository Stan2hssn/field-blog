<script setup lang="ts">
const W = 640
const H = 345
const COLS = 6
const ROWS = 4
const CELL = 40
const GX = 40
const GY = 30
const SX = 40
const SY = 250
const SCELL = 560 / (COLS * ROWS)

const toByte = (v: number) => Math.floor(255.999 * v)
const rgb = (x: number, y: number) => ({ r: toByte(x / (COLS - 1)), g: toByte(y / (ROWS - 1)), b: 0 })
const fill = (x: number, y: number) => {
  const c = rgb(x, y)
  return `rgb(${c.r}, ${c.g}, ${c.b})`
}

const cells = Array.from({ length: COLS * ROWS }, (_, i) => ({ i, x: i % COLS, y: Math.floor(i / COLS) }))
const marks = [
  { name: 'A', x: 0, y: 0 },
  { name: 'B', x: 4, y: 1 },
  { name: 'C', x: 2, y: 3 },
].map((m) => {
  const i = m.y * COLS + m.x
  const c = rgb(m.x, m.y)
  return { ...m, i, ppm: `${c.r} ${c.g} ${c.b}`, line: i + 4 }
})
</script>

<template>
  <div class="w-full bg-bg-card">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full h-auto"
      role="img"
      aria-label="Une image de 6 par 4 pixels en dégradé et le même contenu rangé à plat en mémoire. Le pixel A (0,0) est à l'index 0, B (4,1) à l'index 10, C (2,3) à l'index 20 : index égal y fois largeur plus x."
    >
      <text :x="GX" :y="GY - 10" class="lbl">image w = {{ COLS }}, h = {{ ROWS }}</text>
      <rect
        v-for="c in cells"
        :key="`g${c.i}`"
        :x="GX + c.x * CELL"
        :y="GY + c.y * CELL"
        :width="CELL - 2"
        :height="CELL - 2"
        :fill="fill(c.x, c.y)"
      />
      <g v-for="m in marks" :key="`m${m.name}`">
        <rect :x="GX + m.x * CELL - 2" :y="GY + m.y * CELL - 2" :width="CELL + 2" :height="CELL + 2" fill="none" style="stroke: var(--color-accent)" stroke-width="3" />
        <circle :cx="GX + m.x * CELL + CELL / 2 - 1" :cy="GY + m.y * CELL + CELL / 2 - 1" r="10" style="fill: var(--color-bg-page)" />
        <text :x="GX + m.x * CELL + CELL / 2 - 1" :y="GY + m.y * CELL + CELL / 2 + 4" text-anchor="middle" class="lbl">{{ m.name }}</text>
      </g>

      <g v-for="(m, k) in marks" :key="`t${m.name}`">
        <text :x="310" :y="GY + 22 + k * 56" class="lbl">
          <tspan style="fill: var(--color-accent)">{{ m.name }}</tspan> ({{ m.x }}, {{ m.y }}) → {{ m.y }}·{{ COLS }} + {{ m.x }} = {{ m.i }}
        </text>
        <text :x="310" :y="GY + 42 + k * 56" class="sm">PPM ligne {{ m.line }} : {{ m.ppm }}</text>
      </g>

      <text :x="SX" :y="SY - 14" class="lbl">mémoire : index = y · w + x</text>
      <rect
        v-for="c in cells"
        :key="`s${c.i}`"
        :x="SX + c.i * SCELL"
        :y="SY"
        :width="SCELL - 1"
        height="30"
        :fill="fill(c.x, c.y)"
      />
      <line
        v-for="r in ROWS - 1"
        :key="`r${r}`"
        :x1="SX + r * COLS * SCELL - 0.5"
        :x2="SX + r * COLS * SCELL - 0.5"
        :y1="SY - 4"
        :y2="SY + 34"
        style="stroke: var(--color-text-primary)"
      />
      <text v-for="r in ROWS" :key="`y${r}`" :x="SX + (r - 1) * COLS * SCELL + 4" :y="SY + 54" class="sm">y = {{ r - 1 }}</text>
      <g v-for="m in marks" :key="`sm${m.name}`">
        <rect :x="SX + m.i * SCELL - 1.5" :y="SY - 3" :width="SCELL + 2" height="36" fill="none" style="stroke: var(--color-accent)" stroke-width="3" />
        <text :x="SX + m.i * SCELL + SCELL / 2" :y="SY + 76" text-anchor="middle" class="lbl acc">{{ m.name }} · {{ m.i }}</text>
      </g>
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
  fill: var(--color-text-mid);
}

.acc {
  fill: var(--color-accent);
}
</style>
