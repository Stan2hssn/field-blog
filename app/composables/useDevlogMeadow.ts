import type { Meadow } from '~/utils/devlog-meadow'

/**
 * Point de rendez-vous entre l'ilot du devlog et l'onglet Config de la sonde,
 * sur le modele de useGlScene : la scene publie, la sonde lit, sans que l'un
 * importe l'autre. Reference de module : un Meadow n'est pas serialisable.
 */
let current: Meadow | null = null

export function useDevlogMeadow() {
  return {
    publish(meadow: Meadow | null) {
      current = meadow
    },
    read(): Meadow | null {
      return current
    },
  }
}
