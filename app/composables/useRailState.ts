export interface RailState {
  /** Position du rail en chapitres. Fractionnaire pendant l'inertie. */
  offset: () => number
  /** Index du chapitre au centre du rail. */
  active: () => number
}

/**
 * Position du rail, publiee pour la sonde. Un canal distinct de useGlScene :
 * l'offset appartient a la page, pas a la scene — il existe encore si WebGL
 * manque et que les cartes DOM reprennent la main.
 *
 * Des lecteurs et non des valeurs : la sonde interroge quand elle veut, sans
 * abonnement a la reactivite de Vue.
 */
let current: RailState | null = null

export function useRailState() {
  return {
    publish(state: RailState | null) {
      current = state
    },
    read(): RailState | null {
      return current
    },
  }
}
