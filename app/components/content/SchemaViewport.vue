<script setup lang="ts">
const W = 640
const H = 320
const COLS = 8
const ROWS = 4
const CELL = 48
const X0 = 150
const Y0 = 70
const HI = { i: 5, j: 2 }

const uid = useId()
const arrowId = `schema-viewport-arrow-${uid}`
const arrowAccentId = `schema-viewport-arrow-accent-${uid}`

const cells = Array.from({ length: COLS * ROWS }, (_, k) => ({ i: k % COLS, j: Math.floor(k / COLS) }))
const center = (i: number, j: number) => ({ x: X0 + (i + 0.5) * CELL, y: Y0 + (j + 0.5) * CELL })
const p00 = center(0, 0)
const pij = center(HI.i, HI.j)
</script>

<template>
  <div class="w-full bg-bg-card">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full h-auto"
      role="img"
      aria-label="Le viewport vu de face, découpé en 8 par 4 pixels. Le coin haut gauche, les vecteurs viewport_u vers la droite et viewport_v vers le bas, le centre du pixel 0,0 décalé d'un demi-pixel, et le pixel i,j atteint en ajoutant i fois delta u et j fois delta v."
    >
      <defs>
        <marker :id="arrowId" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--color-text-primary)" />
        </marker>
        <marker :id="arrowAccentId" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--color-accent)" />
        </marker>
      </defs>

      <rect
        v-for="c in cells"
        :key="`${c.i}-${c.j}`"
        :x="X0 + c.i * CELL"
        :y="Y0 + c.j * CELL"
        :width="CELL"
        :height="CELL"
        :class="c.i === HI.i && c.j === HI.j ? 'cell-hi' : 'cell'"
      />
      <circle
        v-for="c in cells"
        :key="`d${c.i}-${c.j}`"
        :cx="center(c.i, c.j).x"
        :cy="center(c.i, c.j).y"
        r="2"
        style="fill: var(--color-text-mid)"
      />

      <line :x1="X0" :y1="Y0 - 24" :x2="X0 + COLS * CELL" :y2="Y0 - 24" style="stroke: var(--color-text-primary)" stroke-width="2" :marker-end="`url(#${arrowId})`" />
      <text :x="X0 + COLS * CELL / 2 - 40" :y="Y0 - 34" class="lbl">viewport_u</text>
      <line :x1="X0 - 24" :y1="Y0" :x2="X0 - 24" :y2="Y0 + ROWS * CELL" style="stroke: var(--color-text-primary)" stroke-width="2" :marker-end="`url(#${arrowId})`" />
      <text :x="X0 - 34" :y="Y0 + ROWS * CELL / 2" text-anchor="end" class="lbl">viewport_v</text>

      <circle :cx="X0" :cy="Y0" r="5" style="fill: var(--color-text-primary)" />
      <text :x="X0 - 10" :y="Y0 - 6" text-anchor="end" class="lbl">upper_left</text>

      <line :x1="X0" :y1="Y0" :x2="p00.x" :y2="p00.y" style="stroke: var(--color-text-mid)" stroke-width="1" stroke-dasharray="2 3" />
      <circle :cx="p00.x" :cy="p00.y" r="5" style="fill: var(--color-accent)" />
      <text :x="p00.x + 2" :y="Y0 + CELL + 16" class="sm">pixel00</text>

      <line :x1="p00.x" :y1="p00.y" :x2="pij.x" :y2="p00.y" style="stroke: var(--color-accent)" stroke-width="2" :marker-end="`url(#${arrowAccentId})`" />
      <line :x1="pij.x" :y1="p00.y" :x2="pij.x" :y2="pij.y" style="stroke: var(--color-accent)" stroke-width="2" :marker-end="`url(#${arrowAccentId})`" />
      <text :x="(p00.x + pij.x) / 2 - 20" :y="p00.y - 8" class="sm acc">i · Δu</text>
      <text :x="pij.x + 8" :y="(p00.y + pij.y) / 2 + 4" class="sm acc">j · Δv</text>
      <circle :cx="pij.x" :cy="pij.y" r="5" style="fill: var(--color-accent)" />
      <text :x="pij.x + 8" :y="pij.y + 18" class="sm">({{ HI.i }}, {{ HI.j }})</text>

      <line :x1="X0 + 7 * CELL" :y1="Y0 + ROWS * CELL + 14" :x2="X0 + 8 * CELL" :y2="Y0 + ROWS * CELL + 14" style="stroke: var(--color-text-mid)" stroke-width="1" />
      <text :x="X0 + 7 * CELL + 14" :y="Y0 + ROWS * CELL + 30" class="sm">Δu</text>

      <g :transform="`translate(40 ${H - 30})`">
        <line x1="0" y1="0" x2="40" y2="0" style="stroke: var(--color-text-mid)" :marker-end="`url(#${arrowId})`" />
        <line x1="0" y1="0" x2="0" y2="-40" style="stroke: var(--color-text-mid)" :marker-end="`url(#${arrowId})`" />
        <text x="46" y="4" class="sm">x</text>
        <text x="-4" y="-46" class="sm">y</text>
        <text x="0" y="18" class="sm">monde</text>
      </g>
      <g :transform="`translate(${W - 80} ${H - 80})`">
        <line x1="0" y1="0" x2="40" y2="0" style="stroke: var(--color-text-mid)" :marker-end="`url(#${arrowId})`" />
        <line x1="0" y1="0" x2="0" y2="40" style="stroke: var(--color-text-mid)" :marker-end="`url(#${arrowId})`" />
        <text x="46" y="4" class="sm">i</text>
        <text x="-4" y="54" class="sm">j</text>
        <text x="12" y="30" class="sm">image</text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.cell {
  fill: var(--color-bg-page);
  stroke: var(--color-text-greyed);
}

.cell-hi {
  fill: var(--color-bg-page);
  stroke: var(--color-accent);
  stroke-width: 2;
}

.lbl {
  font-family: var(--font-mono);
  font-size: 13px;
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
