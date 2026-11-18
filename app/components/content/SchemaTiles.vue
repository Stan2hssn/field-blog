<script setup lang="ts">
const COLS = 10
const ROWS = 6
const TILE = 52
const THREADS = 4
const N = COLS * ROWS

// Même modèle de coût que dans l'article : un objet cher au centre-droit, un ciel bon marché.
const cost = Array.from({ length: N }, (_, i) => {
  const cx = (i % COLS) + 0.5
  const cy = Math.floor(i / COLS) + 0.5
  return 0.3 + 4 * Math.exp(-(((cx - 6.5) ** 2) / 4 + ((cy - 3.2) ** 2) / 2.5))
})

const freeAt = Array.from({ length: THREADS }, () => 0)
const jobs = cost.map((c) => {
  let t = 0
  for (let j = 1; j < THREADS; j++) if ((freeAt[j] ?? 0) < (freeAt[t] ?? 0)) t = j
  const start = freeAt[t] ?? 0
  freeAt[t] = start + c
  return { thread: t, start, end: start + c }
})
const NOW = Math.max(...freeAt) * 0.55

const tiles = jobs.map((j, k) => ({
  x: (k % COLS) * TILE,
  y: Math.floor(k / COLS) * TILE,
  thread: j.thread,
  state: NOW < j.start ? 'todo' : NOW >= j.end ? 'done' : 'busy',
}))
const next = tiles.filter(t => t.state !== 'todo').length
const opacity = (t: number) => 0.2 + (0.7 * t) / (THREADS - 1)
const doneBy = (t: number) => tiles.filter(x => x.thread === t && x.state === 'done').length
</script>

<template>
  <svg
    viewBox="0 0 640 330"
    class="w-full h-auto"
    role="img"
    :aria-label="`Instantané d'un rendu à ${THREADS} threads : les tuiles terminées portent le numéro du thread qui les a calculées, quatre tuiles sont en cours, et le compteur atomique vaut ${next}.`"
  >
    <g v-for="(t, k) in tiles" :key="k">
      <rect :x="t.x" :y="t.y" :width="TILE" :height="TILE" class="t-cost" :style="{ fillOpacity: (cost[k] ?? 0) / 5 }" />
      <template v-if="t.state !== 'todo'">
        <rect :x="t.x + 2" :y="t.y + 2" :width="TILE - 4" :height="TILE - 4" class="t-base" />
        <rect
          :x="t.x + 2"
          :y="t.y + 2"
          :width="TILE - 4"
          :height="TILE - 4"
          :class="t.state === 'done' ? 't-done' : 't-busy'"
          :style="t.state === 'done' ? { fillOpacity: opacity(t.thread) } : undefined"
        />
        <text :x="t.x + TILE / 2" :y="t.y + TILE / 2 + 5" text-anchor="middle" class="t-label">T{{ t.thread }}</text>
      </template>
    </g>

    <text x="540" y="20" class="t-note">compteur</text>
    <rect x="540" y="30" width="92" height="44" class="t-counter" />
    <text x="586" y="59" text-anchor="middle" class="t-big">{{ next }}</text>
    <text x="540" y="94" class="t-note">fetch_add(1)</text>
    <text x="540" y="112" class="t-note">→ tuile {{ next }}</text>

    <text x="540" y="132" class="t-note">finies</text>
    <g v-for="t in THREADS" :key="t">
      <rect x="540" :y="140 + (t - 1) * 32" width="22" height="22" class="t-done" :style="{ fillOpacity: opacity(t - 1) }" />
      <text x="570" :y="156 + (t - 1) * 32" class="t-label">T{{ t - 1 }} · {{ doneBy(t - 1) }}</text>
    </g>
    <rect x="540" y="272" width="22" height="22" class="t-busy" />
    <text x="570" y="288" class="t-label">en cours</text>
  </svg>
</template>

<style scoped>
.t-cost {
  fill: var(--color-text-mid);
  stroke: var(--color-bg-page);
  stroke-width: 1;
}

.t-base {
  fill: var(--color-bg-page);
}

.t-done {
  fill: var(--color-accent);
}

.t-busy {
  fill: var(--color-bg-page);
  stroke: var(--color-accent);
  stroke-width: 2;
  stroke-dasharray: 4 3;
}

.t-counter {
  fill: none;
  stroke: var(--color-text-primary);
  stroke-width: 1.5;
}

.t-label {
  font-family: var(--font-mono);
  font-size: 13px;
  fill: var(--color-text-primary);
}

.t-note {
  font-family: var(--font-mono);
  font-size: 13px;
  fill: var(--color-text-mid);
}

.t-big {
  font-family: var(--font-mono);
  font-size: 22px;
  fill: var(--color-accent);
}
</style>
