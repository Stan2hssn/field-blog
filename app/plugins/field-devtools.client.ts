import {
  mountDevtools,
  vueAdapter,
  inspectorPanel,
  timelinePanel,
  tokensPanel,
  phasesPanel,
  layersPanel,
  a11yPanel,
  consolePanel,
  netPanel,
  settingsPanel,
  shortcutsPanel,
} from '@spices/devtools'
import { EASE_NAMES, applyEase } from '@spices/trails'
import { watch } from 'vue'
import { useTrails } from '~/composables/useTrails'
import { PAGE_FADE, transitionDebug } from '~/utils/transitions'

/** Duree attendue par phase, en ms : c'est elle qui rend l'ecart lisible. */
const EXPECTED: Record<string, number> = {
  navigate: PAGE_FADE,
}

const TIMELINES = ['page-fade']

/**
 * Montage de la spice devtools. Dev uniquement : elle lit des instances Vue et
 * type.__file, qui n'existent pas dans le build.
 * Imports statiques volontairement : en dynamique, un echec de resolution est
 * avale par la promesse du plugin et l'outil disparait sans erreur.
 * trails et le bus de transitions sont injectes ici — la spice ne doit
 * dependre ni de l'un ni de l'autre.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.dev) return

  useTrails('page-fade', (tl) => {
    tl.fromTo('page', { opacity: 0 }, { opacity: 1 }, { duration: PAGE_FADE / 1000, ease: 'outCubic' })
  })

  mountDevtools({
    // Nomme le projet : sans lui la cle retomberait sur le hostname, partage
    // par tous les projets servis depuis localhost.
    namespace: 'field-blog',
    adapters: [vueAdapter],
    // Ni diffPanel ni glPanel ici : ce projet n'a ni store a diffuser ni scene
    // three. Un panneau sans source ne se declare pas, il ne s'affiche pas vide.
    addons: [a11yPanel, consolePanel(), netPanel()],
    panels: [
      inspectorPanel,
      layersPanel,
      tokensPanel({ accept: (name) => !name.startsWith('--tw-') }),
      phasesPanel({
        read: () => ({ route: transitionDebug.route, marks: transitionDebug.marks }),
        // Le bus est un reactive Vue ; la spice ne connait que ce callback.
        // deep obligatoire : beginTransition vide les marks et markPhase en
        // repousse une dans le meme tick — une longueur revenue a l'identique
        // ne declencherait aucun watcher.
        subscribe: (cb) => watch(() => transitionDebug, cb, { deep: true }),
        expected: EXPECTED,
      }),
      timelinePanel({
        ids: TIMELINES,
        loadTheatre: (id) => useTrails(id),
        easeNames: EASE_NAMES,
        sampleEase: applyEase,
      }),
      // Epingles en bas du rail : la liste d'add-ons vient du montage, pas d'un
      // tableau en dur, sinon les interrupteurs mentiraient au premier ajout.
      settingsPanel({
        addons: [
          { id: 'a11y', label: 'A11y' },
          { id: 'console', label: 'Console' },
          { id: 'net', label: 'Reseau' },
        ],
      }),
      shortcutsPanel,
    ],
  })
})
