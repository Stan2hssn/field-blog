<script setup lang="ts">
const LINES = [
  { text: 'v 0 0 0', note: '→ 1' },
  { text: 'v 2 0 0', note: '→ 2' },
  { text: 'v 2 1.4 0', note: '→ 3' },
  { text: 'v 0 1.4 0', note: '→ 4' },
  { text: 'f 1 2 3 4', note: '' },
]

const Q = {
  1: { x: 380, y: 250 },
  2: { x: 600, y: 250 },
  3: { x: 600, y: 90 },
  4: { x: 380, y: 90 },
}
const quad = `${Q[1].x},${Q[1].y} ${Q[2].x},${Q[2].y} ${Q[3].x},${Q[3].y} ${Q[4].x},${Q[4].y}`
</script>

<template>
  <svg
    viewBox="0 0 640 330"
    class="w-full h-auto"
    role="img"
    aria-label="Quatre lignes v numérotées de 1 à 4, puis une face f 1 2 3 4. Le quad est découpé en éventail depuis le sommet 1 : triangles (1, 2, 3) et (1, 3, 4), soit les index C++ (0, 1, 2) et (0, 2, 3)."
  >
    <text x="24" y="40" class="s-kicker">fichier .obj</text>
    <g v-for="(l, i) in LINES" :key="i">
      <text x="24" :y="76 + i * 30" class="s-code" :class="i === 4 && 's-accent'">{{ l.text }}</text>
      <text x="150" :y="76 + i * 30" class="s-note">{{ l.note }}</text>
    </g>
    <text x="24" y="250" class="s-note">les index OBJ</text>
    <text x="24" y="270" class="s-note">commencent à 1</text>

    <path d="M 210 196 L 330 196" class="s-arrow" />
    <path d="M 322 190 L 332 196 L 322 202" class="s-arrow" />
    <text x="222" y="186" class="s-note">éventail</text>

    <polygon :points="quad" class="s-quad" />
    <line :x1="Q[1].x" :y1="Q[1].y" :x2="Q[3].x" :y2="Q[3].y" class="s-diag" />

    <text x="525" y="208" text-anchor="middle" class="s-code">T0</text>
    <text x="525" y="226" text-anchor="middle" class="s-note">(1, 2, 3)</text>
    <text x="455" y="130" text-anchor="middle" class="s-code">T1</text>
    <text x="455" y="148" text-anchor="middle" class="s-note">(1, 3, 4)</text>

    <g v-for="(p, k) in Q" :key="k">
      <circle :cx="p.x" :cy="p.y" r="5" class="s-vert" />
    </g>
    <text :x="Q[1].x - 8" :y="Q[1].y + 24" class="s-code">1 · [0]</text>
    <text :x="Q[2].x - 50" :y="Q[2].y + 24" class="s-code">2 · [1]</text>
    <text :x="Q[3].x - 50" :y="Q[3].y - 14" class="s-code">3 · [2]</text>
    <text :x="Q[4].x - 8" :y="Q[4].y - 14" class="s-code">4 · [3]</text>

    <text x="380" y="314" class="s-note">en C++ : (0, 1, 2) + (0, 2, 3)</text>
  </svg>
</template>

<style scoped>
.s-kicker {
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: var(--tracking-kicker);
  text-transform: uppercase;
  fill: var(--color-text-mid);
}

.s-code {
  font-family: var(--font-mono);
  font-size: 15px;
  fill: var(--color-text-primary);
}

.s-accent {
  fill: var(--color-accent);
}

.s-note {
  font-family: var(--font-mono);
  font-size: 13px;
  fill: var(--color-text-mid);
}

.s-arrow {
  fill: none;
  stroke: var(--color-text-primary);
  stroke-width: 1.5;
}

.s-quad {
  fill: var(--color-bg-card);
  stroke: var(--color-text-primary);
  stroke-width: 2;
}

.s-diag {
  stroke: var(--color-accent);
  stroke-width: 2;
  stroke-dasharray: 6 5;
}

.s-vert {
  fill: var(--color-bg-page);
  stroke: var(--color-text-primary);
  stroke-width: 2;
}
</style>
