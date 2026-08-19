import { mountDevtools, vueAdapter, inspectorPanel, trailsPanel } from '@spices/devtools'
import { mountStudio } from '@spices/trails/studio'
import { useTrails } from '~/composables/useTrails'

/**
 * Montage de la spice devtools. Dev uniquement : elle lit des instances Vue et
 * type.__file, qui n'existent pas dans le build.
 * Imports statiques volontairement : en dynamique, un echec de resolution est
 * avale par la promesse du plugin et l'outil disparait sans erreur.
 * trails est injecte ici — la spice devtools ne doit pas en dependre.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.dev) return

  mountDevtools({
    adapters: [vueAdapter],
    panels: [
      inspectorPanel,
      trailsPanel({
        loadTheatre: (id) => useTrails(id),
        mountStudio: (theatre, parent) =>
          mountStudio(theatre as never, parent) as unknown as { stop?: () => void },
      }),
    ],
  })
})
