export type EaseFn = (u: number) => number

const c1 = 1.70158
const c2 = c1 * 1.525
const c3 = c1 + 1
const c4 = (2 * Math.PI) / 3
const c5 = (2 * Math.PI) / 4.5
const n1 = 7.5625
const d1 = 2.75

const linear: EaseFn = (u) => u

const inQuad: EaseFn = (u) => u * u
const outQuad: EaseFn = (u) => 1 - (1 - u) * (1 - u)
const inOutQuad: EaseFn = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2)

const inCubic: EaseFn = (u) => u * u * u
const outCubic: EaseFn = (u) => 1 - Math.pow(1 - u, 3)
const inOutCubic: EaseFn = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)

const inQuart: EaseFn = (u) => u * u * u * u
const outQuart: EaseFn = (u) => 1 - Math.pow(1 - u, 4)
const inOutQuart: EaseFn = (u) => (u < 0.5 ? 8 * u * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2)

const inQuint: EaseFn = (u) => u ** 5
const outQuint: EaseFn = (u) => 1 - (1 - u) ** 5
const inOutQuint: EaseFn = (u) => (u < 0.5 ? 16 * u ** 5 : 1 - (-2 * u + 2) ** 5 / 2)

const inSine: EaseFn = (u) => 1 - Math.cos((u * Math.PI) / 2)
const outSine: EaseFn = (u) => Math.sin((u * Math.PI) / 2)
const inOutSine: EaseFn = (u) => -(Math.cos(Math.PI * u) - 1) / 2

const inExpo: EaseFn = (u) => (u === 0 ? 0 : Math.pow(2, 10 * u - 10))
const outExpo: EaseFn = (u) => (u === 1 ? 1 : 1 - Math.pow(2, -10 * u))
const inOutExpo: EaseFn = (u) =>
  u === 0 ? 0 : u === 1 ? 1 : u < 0.5 ? Math.pow(2, 20 * u - 10) / 2 : (2 - Math.pow(2, -20 * u + 10)) / 2

const inBack: EaseFn = (u) => c3 * u ** 3 - c1 * u ** 2
const outBack: EaseFn = (u) => 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2
const inOutBack: EaseFn = (u) =>
  u < 0.5
    ? ((2 * u) ** 2 * ((c2 + 1) * 2 * u - c2)) / 2
    : ((2 * u - 2) ** 2 * ((c2 + 1) * (u * 2 - 2) + c2) + 2) / 2

const inElastic: EaseFn = (u) =>
  u === 0 ? 0 : u === 1 ? 1 : -(2 ** (10 * u - 10)) * Math.sin((u * 10 - 10.75) * c4)
const outElastic: EaseFn = (u) =>
  u === 0 ? 0 : u === 1 ? 1 : 2 ** (-10 * u) * Math.sin((u * 10 - 0.75) * c4) + 1
const inOutElastic: EaseFn = (u) =>
  u === 0
    ? 0
    : u === 1
      ? 1
      : u < 0.5
        ? -(2 ** (20 * u - 10) * Math.sin((20 * u - 11.125) * c5)) / 2
        : (2 ** (-20 * u + 10) * Math.sin((20 * u - 11.125) * c5)) / 2 + 1

const outBounce: EaseFn = (u) => {
  if (u < 1 / d1) return n1 * u * u
  if (u < 2 / d1) {
    u -= 1.5 / d1
    return n1 * u * u + 0.75
  }
  if (u < 2.5 / d1) {
    u -= 2.25 / d1
    return n1 * u * u + 0.9375
  }
  u -= 2.625 / d1
  return n1 * u * u + 0.984375
}
const inBounce: EaseFn = (u) => 1 - outBounce(1 - u)
const inOutBounce: EaseFn = (u) => (u < 0.5 ? (1 - outBounce(1 - 2 * u)) / 2 : (1 + outBounce(2 * u - 1)) / 2)

export const EASINGS: Record<string, EaseFn> = {
  linear,
  inQuad,
  outQuad,
  inOutQuad,
  inCubic,
  outCubic,
  inOutCubic,
  inQuart,
  outQuart,
  inOutQuart,
  inQuint,
  outQuint,
  inOutQuint,
  inSine,
  outSine,
  inOutSine,
  inExpo,
  outExpo,
  inOutExpo,
  inBack,
  outBack,
  inOutBack,
  inElastic,
  outElastic,
  inOutElastic,
  inBounce,
  outBounce,
  inOutBounce,
}

// Noms canoniques trails (pour l'UI de l'éditeur), figés AVANT l'ajout des alias.
export const EASE_NAMES = Object.keys(EASINGS)

// Alias compatibles "opti" (EaseFunction.EaseOutQuad …) : mêmes fonctions, noms portables.
// `linear` -> `Linear` ; `outQuad` -> `EaseOutQuad` ; etc. Aucune dépendance à opti.
for (const name of EASE_NAMES) {
  const opti = name === 'linear' ? 'Linear' : `Ease${name.charAt(0).toUpperCase()}${name.slice(1)}`
  EASINGS[opti] = EASINGS[name]!
}

// Solveur cubic-bezier : recherche binaire de t tq X(t)=x, puis retourne Y(t).
export function cubicBezier(cp: readonly [number, number, number, number], x: number): number {
  const [x1, y1, x2, y2] = cp
  let lo = 0
  let hi = 1
  let t = x
  for (let i = 0; i < 20; i++) {
    const mt = 1 - t
    const xt = 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t
    const err = xt - x
    if (Math.abs(err) < 1e-5) break
    if (err > 0) hi = t
    else lo = t
    t = (lo + hi) / 2
  }
  const mt = 1 - t
  return 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t
}

export function applyEase(
  name: string | undefined,
  u: number,
  cp?: readonly [number, number, number, number],
): number {
  if (name === 'bezier' && cp) return cubicBezier(cp, u)
  const fn = (name && EASINGS[name]) || linear
  return fn(u)
}
