import type { Keyframe, Track } from './Trails.interface'

// Fonctions pures d'édition de track. Identité d'une keyframe = son temps `t`.
// Toutes retournent une nouvelle Track triée par t croissant.

export function upsertKeyframe(track: Track, kf: Keyframe): Track {
  const out = track.filter((k) => k.t !== kf.t)
  out.push(kf)
  return out.sort((a, b) => a.t - b.t)
}

export function removeKeyframeAt(track: Track, t: number): Track {
  return track.filter((k) => k.t !== t)
}

export function moveKeyframe(track: Track, fromT: number, toT: number): Track {
  const kf = track.find((k) => k.t === fromT)
  if (!kf) return track.slice()
  const rest = track.filter((k) => k.t !== fromT)
  return upsertKeyframe(rest, { ...kf, t: toT })
}

// L'easing décrit le SEGMENT sortant (lien k[i] -> k[i+1]), stocké sur la keyframe de gauche.
// `cp` n'a de sens que pour ease === 'bezier' ; sinon on le retire.
export function setEaseAt(
  track: Track,
  t: number,
  ease: string,
  cp?: [number, number, number, number],
): Track {
  return track.map((k) => {
    if (k.t !== t) return k
    const out: Keyframe = { t: k.t, v: k.v, e: ease }
    if (ease === 'bezier' && cp) out.cp = cp
    return out
  })
}
