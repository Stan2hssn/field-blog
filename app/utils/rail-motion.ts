/**
 * Moteur de defilement porte du MoonRing d'Audemars Piguet
 * (graphics/motion/Magnet.helper.ts + nodes/moons/MoonRing.helper.ts),
 * applique au rail vertical des chapitres. Unite : le chapitre.
 */

export interface MagnetState {
  /** Entree pas encore liberee dans la cible. */
  impulse: number
  /** Position visee, que l'aimant ramene sur le chapitre le plus proche. */
  target: number
  /** Position affichee, qui poursuit la cible. */
  current: number
}

/** Taux par seconde. */
export interface MagnetRates {
  release: number
  magnet: number
  follow: number
}

/**
 * Taux de la galerie mfisher-apollonas, ramenes de « par image a 60 Hz » a
 * « par seconde » pour ne plus dependre de la frequence de l'ecran.
 */
export const GALLERY_RATES: MagnetRates = {
  release: 60 * Math.LN2,
  magnet: -60 * Math.log(1 - 0.09),
  follow: -60 * Math.log(1 - 0.05),
}

/**
 * Aimant du chapitre ou le rail s'est pose, plus faible que le permanent : il
 * ne retient pas la poussee qui le quitte, et le voisin la rattrape.
 */
export const RAIL_MAGNET = {
  magnet: GALLERY_RATES.magnet,
  activeMagnet: GALLERY_RATES.magnet / 4,
}

const part = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt)

export function stepMagnet(state: MagnetState, rates: MagnetRates, dt: number): MagnetState {
  const released = state.impulse * part(rates.release, dt)
  let target = state.target + released
  target += (Math.round(target) - target) * part(rates.magnet, dt)
  return {
    impulse: state.impulse - released,
    target,
    current: state.current + (target - state.current) * part(rates.follow, dt),
  }
}

export function isMagnetSettled(state: MagnetState): boolean {
  return (
    Math.abs(state.impulse) < 1e-3 &&
    Math.abs(state.target - Math.round(state.target)) < 0.01 &&
    Math.abs(state.current - state.target) < 0.005
  )
}

/** Offset qui amene `index`, choisi au plus pres de `near` : jamais un tour de trop. */
export function offsetForIndex(index: number, count: number, near: number): number {
  return index + Math.round((near - index) / count) * count
}

const LINE_PX = 16
const PAGE_PX = 800

/** Delta molette en pixels, lignes et pages (Firefox, souris Windows) converties. */
export function wheelPixels(delta: number, deltaMode: number): number {
  return deltaMode === 1 ? delta * LINE_PX : deltaMode === 2 ? delta * PAGE_PX : delta
}
