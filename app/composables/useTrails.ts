import { timeline, type Theatre, type TimelineOpts } from '@spices/trails'

// Cache module: un seul Theatre partagé par id (les consumers + le studio pilotent le même playhead).
// build = déclaration brouillon (façon GSAP), écrasée par load() si un JSON existe.
const cache = new Map<string, Promise<Theatre>>()

export function useTrails(
  id: string,
  build?: (tl: Theatre) => void,
  opts?: TimelineOpts,
): Promise<Theatre> {
  let pending = cache.get(id)
  if (!pending) {
    const tl = timeline(id, opts)
    build?.(tl)
    pending = tl.load().then((t) => {
      t.start()
      return t
    })
    cache.set(id, pending)
  }
  return pending
}
