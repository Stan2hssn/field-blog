import { CHAPTERS_MANIFEST } from '~/utils/chapters'

/**
 * Geometrie du defilement de chapitres, partagee par le rendu 3D et la couche
 * de liens qui le double. Une seule source : si les deux divergeaient, on
 * cliquerait a cote de ce qu'on voit.
 */

export const RAIL_WIDTH = 220
/** Au-dela, une carte est hors du rail : inutile de la placer. */
export const RENDER_HALF_PX = 600
export const DEFAULT_GAP = 28

/** Rythme visuel du rail : trois formats qui se repetent. */
const SIZE_PATTERN = [
  { w: 163, h: 204, rotated: false },
  { w: 125, h: 162, rotated: false },
  { w: 130, h: 201, rotated: true },
  { w: 163, h: 204, rotated: false },
  { w: 125, h: 162, rotated: false },
  { w: 130, h: 201, rotated: true },
  { w: 163, h: 204, rotated: false },
] as const

export const TOTAL = CHAPTERS_MANIFEST.length

export interface Slot {
  chapter: (typeof CHAPTERS_MANIFEST)[number]
  chapterIdx: number
  /** Ecart vertical au centre du rail, en pixels. */
  y: number
  key: string
}

export function chapterSize(index: number) {
  return SIZE_PATTERN[index % SIZE_PATTERN.length]!
}

/** Une carte tournee occupe sa largeur en hauteur : c'est elle qui rythme le pas. */
export function chapterVisualHeight(index: number): number {
  const size = chapterSize(index)
  return size.rotated ? size.w : size.h
}

export function layoutOf(gap: number): { centers: number[]; cycleHeight: number } {
  const centers: number[] = []
  let cursor = 0
  for (let i = 0; i < TOTAL; i++) {
    cursor += chapterVisualHeight(i) / 2
    centers.push(cursor)
    cursor += chapterVisualHeight(i) / 2 + gap
  }
  return { centers, cycleHeight: cursor }
}

/** Position continue en pixels, interpolee entre deux chapitres. */
export function scrollToPixels(scrollOffset: number, gap: number): number {
  const { centers, cycleHeight } = layoutOf(gap)
  const cycles = Math.floor(scrollOffset / TOTAL)
  const local = ((scrollOffset % TOTAL) + TOTAL) % TOTAL
  const index = Math.floor(local)
  const frac = local - index
  const start = centers[index]!
  const next = (index + 1) % TOTAL
  const end = next === 0 ? centers[0]! + cycleHeight : centers[next]!
  return cycles * cycleHeight + start + frac * (end - start)
}

/** Cartes a placer, en boucle infinie autour de la position courante. */
export function slotsAt(scrollOffset: number, gap: number): Slot[] {
  const { centers, cycleHeight } = layoutOf(gap)
  const pixels = scrollToPixels(scrollOffset, gap)
  const out: Slot[] = []
  for (let i = 0; i < TOTAL; i++) {
    const base = centers[i]!
    const nearest = Math.round((pixels - base) / cycleHeight)
    for (let step = -1; step <= 1; step++) {
      const k = nearest + step
      const y = base + k * cycleHeight - pixels
      if (Math.abs(y) <= RENDER_HALF_PX) {
        out.push({ chapter: CHAPTERS_MANIFEST[i]!, chapterIdx: i, y, key: `${i}-${k}` })
      }
    }
  }
  return out
}

export function activeIndex(scrollOffset: number): number {
  return ((Math.round(scrollOffset) % TOTAL) + TOTAL) % TOTAL
}
