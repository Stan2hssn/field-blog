/**
 * Alignement DOM / three, repris de la methode de PFGOB25
 * (graphics/Managers/cameraManager.js:62 et Project/Project.js:537).
 *
 * Le principe : placer la camera de sorte qu'une unite du monde vaille
 * exactement un pixel CSS. Un plane de 1x1 mis a l'echelle du rect d'un
 * element se superpose alors pile a cet element, sans conversion nulle part.
 * C'est ce qui garantit que le visuel et la couche de liens qu'il double ne
 * peuvent pas deriver l'un de l'autre.
 */

/** Le fov des cameras de projet dans PFGOB25. */
export const PIXEL_FOV = 52

/**
 * Distance a laquelle le frustum vertical mesure exactement `height` unites.
 * tan(fov/2) en radians s'ecrit tan(fov·π/360).
 */
export function pixelPerfectZ(height: number, fov = PIXEL_FOV): number {
  return (height / Math.tan((fov * Math.PI) / 360)) * 0.5
}

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface Placement {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Rect DOM vers position monde. L'origine passe du coin haut-gauche au centre
 * du viewport, et l'axe Y s'inverse — le DOM descend, three monte.
 */
export function placeOnScreen(rect: Rect, viewport: { width: number; height: number }): Placement {
  return {
    x: rect.left + rect.width * 0.5 - viewport.width * 0.5,
    y: viewport.height * 0.5 - rect.height * 0.5 - rect.top,
    width: rect.width,
    height: rect.height,
  }
}
