import type { Ref } from 'vue'

export interface Point {
  x: number
  y: number
}

/**
 * Deplace des poignees dans le repere du viewBox, quelle que soit la taille
 * affichee du SVG. Chaque poignee est un Ref<Point> ; `start(key)` se branche
 * sur le pointerdown de son cercle.
 */
export function useSvgDrag<K extends string>(
  svg: Ref<SVGSVGElement | null>,
  handles: Record<K, Ref<Point>>,
  clamp?: (key: K, p: Point) => Point,
) {
  // shallowRef : ref<K> passerait K dans UnwrapRef et perdrait le lien avec `handles`.
  const dragging = shallowRef<K | null>(null)

  function toSvg(e: PointerEvent): Point | null {
    const el = svg.value
    const ctm = el?.getScreenCTM()
    if (!el || !ctm) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  function onMove(e: PointerEvent) {
    const key = dragging.value
    if (!key) return
    const p = toSvg(e)
    if (!p) return
    handles[key].value = clamp ? clamp(key, p) : p
  }

  function stop() {
    dragging.value = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', stop)
  }

  function start(key: K, e: PointerEvent) {
    e.preventDefault()
    dragging.value = key
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', stop)
  }

  onScopeDispose(stop)

  return { start, dragging }
}
