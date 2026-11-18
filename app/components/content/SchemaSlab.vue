<script setup lang="ts">
const BOX = { x0: 300, y0: 110, x1: 460, y1: 220 }
const W = 640
const H = 320

// Rayon touché : y = 290 − 0.5·(x − 40). On paramètre par x pour garder des positions lisibles.
const hitY = (x: number) => 290 - 0.5 * (x - 40)
const N = { x: 0.447, y: 0.894 }
const off = (x: number, k: number) => ({ x: x + N.x * k, y: hitY(x) + N.y * k })

const ty0 = 180
const tx0 = BOX.x0
const ty1 = 400
const tx1 = BOX.x1

// Rayon raté : y = 320 − 0.2·(x − 40), il passe sous le coin bas-droit de la boîte.
const missY = (x: number) => 320 - 0.2 * (x - 40)
const missTy0 = 40 + (320 - BOX.y1) / 0.2
</script>

<template>
  <svg
    :viewBox="`0 0 ${W} ${H}`"
    class="w-full h-auto"
    role="img"
    aria-label="Une boîte, intersection d'une dalle verticale (x) et d'une dalle horizontale (y). Le rayon principal est dans la dalle y entre ty0 et ty1, dans la dalle x entre tx0 et tx1 ; ces intervalles se chevauchent de tx0 à ty1, il touche. Le rayon du bas, en pointillés, sort de la dalle x avant d'entrer dans la dalle y : intervalles disjoints, il rate."
  >
    <rect :x="BOX.x0" y="0" :width="BOX.x1 - BOX.x0" :height="H" class="s-slab" />
    <rect x="0" :y="BOX.y0" :width="W" :height="BOX.y1 - BOX.y0" class="s-slab" />
    <rect :x="BOX.x0" :y="BOX.y0" :width="BOX.x1 - BOX.x0" :height="BOX.y1 - BOX.y0" class="s-box" />
    <text :x="BOX.x0 + 8" y="20" class="s-note">dalle x</text>
    <text x="8" :y="BOX.y1 - 8" class="s-note">dalle y</text>

    <line x1="40" :y1="hitY(40)" x2="620" :y2="hitY(620)" class="s-ray" />
    <line :x1="off(tx0, -9).x" :y1="off(tx0, -9).y" :x2="off(tx1, -9).x" :y2="off(tx1, -9).y" class="s-iv" />
    <line :x1="off(ty0, 9).x" :y1="off(ty0, 9).y" :x2="off(ty1, 9).x" :y2="off(ty1, 9).y" class="s-iv s-iv-y" />
    <line :x1="tx0" :y1="hitY(tx0)" :x2="ty1" :y2="hitY(ty1)" class="s-in" />
    <circle cx="40" :cy="hitY(40)" r="6" class="s-origin" />
    <text x="30" :y="hitY(40) + 24" class="s-label">O</text>

    <text :x="ty0 - 8" :y="hitY(ty0) + 32" class="s-label">ty0</text>
    <text :x="tx0 - 44" :y="hitY(tx0) - 6" class="s-label">tx0</text>
    <text :x="ty1 + 10" :y="hitY(ty1) + 26" class="s-label">ty1</text>
    <text :x="tx1 - 4" :y="hitY(tx1) - 14" class="s-label">tx1</text>

    <text x="24" y="40" class="s-accent">tmin = max(tx0, ty0) = tx0</text>
    <text x="24" y="60" class="s-accent">tmax = min(tx1, ty1) = ty1</text>
    <text x="24" y="80" class="s-accent">tmin ≤ tmax : touché</text>

    <line x1="60" :y1="missY(60)" x2="620" :y2="missY(620)" class="s-miss" />
    <circle :cx="tx1" :cy="missY(tx1)" r="4" class="s-tick" />
    <circle :cx="missTy0" :cy="missY(missTy0)" r="4" class="s-tick" />
    <text :x="tx1 - 16" :y="missY(tx1) + 26" class="s-note">tx1</text>
    <text :x="missTy0 - 8" :y="missY(missTy0) - 12" class="s-note">ty0</text>
    <text x="380" y="306" class="s-note">tx1 &lt; ty0 : raté</text>
  </svg>
</template>

<style scoped>
.s-slab {
  fill: var(--color-text-greyed);
  fill-opacity: 0.3;
}

.s-box {
  fill: none;
  stroke: var(--color-text-primary);
  stroke-width: 1.5;
}

.s-ray {
  stroke: var(--color-text-primary);
  stroke-width: 1;
}

.s-miss {
  stroke: var(--color-text-mid);
  stroke-width: 1;
  stroke-dasharray: 5 4;
}

.s-iv {
  stroke: var(--color-text-primary);
  stroke-width: 3;
}

.s-iv-y {
  stroke-dasharray: 7 4;
}

.s-in {
  stroke: var(--color-accent);
  stroke-width: 5;
}

.s-origin {
  fill: var(--color-bg-page);
  stroke: var(--color-text-primary);
  stroke-width: 2;
}

.s-tick {
  fill: var(--color-text-mid);
}

.s-label {
  font-family: var(--font-mono);
  font-size: 14px;
  fill: var(--color-text-primary);
}

.s-note {
  font-family: var(--font-mono);
  font-size: 13px;
  fill: var(--color-text-mid);
}

.s-accent {
  font-family: var(--font-mono);
  font-size: 13px;
  fill: var(--color-accent);
}
</style>
