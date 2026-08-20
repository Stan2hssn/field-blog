import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three'

export interface GlSceneHandle {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
}

/**
 * Point de rendez-vous entre la scene et la sonde. Le composant publie ce qu'il
 * vient de creer, le plugin devtools le lit — sans que l'un importe l'autre.
 *
 * Une reference de module et non un state Nuxt : la sonde lit hors de tout
 * contexte de composant, et rien ici ne doit passer par la serialisation du
 * payload — un WebGLRenderer n'est pas serialisable.
 */
let current: GlSceneHandle | null = null

export function useGlScene() {
  return {
    publish(handle: GlSceneHandle | null) {
      current = handle
    },
    /** Relu a chaque appel : la scene meurt et renait aux changements de route. */
    read(): GlSceneHandle | null {
      return current
    },
  }
}
