import type { Track } from './Trails.interface'
import { applyEase } from './easing'

export function sampleTrack(track: Track, t: number): number {
  const n = track.length
  if (n === 0) return NaN

  const first = track[0]!
  if (n === 1 || t <= first.t) return first.v

  const last = track[n - 1]!
  if (t >= last.t) return last.v

  for (let i = 0; i < n - 1; i++) {
    const a = track[i]!
    const b = track[i + 1]!
    if (t >= a.t && t < b.t) {
      if (a.e === 'hold') return a.v
      const span = b.t - a.t
      const u = span > 0 ? (t - a.t) / span : 0
      return a.v + (b.v - a.v) * applyEase(a.e, u, a.cp)
    }
  }
  return last.v
}
