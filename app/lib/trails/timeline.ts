import { Theatre } from './Theatre'
import type { TrailState } from './Trails.interface'

export interface TimelineOpts {
  duration?: number
  loop?: boolean
}

// Cible une timeline par id puis on enchaîne les animations (to/from/fromTo/set).
// Le state ainsi construit est un BROUILLON : load() l'écrase si un JSON existe.
export function timeline(id: string, opts: TimelineOpts = {}): Theatre {
  const state: TrailState = { duration: opts.duration ?? 0, objects: {} }
  if (opts.loop) state.loop = true
  return new Theatre(state, id)
}
