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
  codePanel,
} from '@spices/devtools'
import type { PhaseCapture, WaterfallLane, WaterfallRecord } from '@spices/devtools'
import type { Router } from 'vue-router'
import { EASE_NAMES, applyEase } from '@spices/trails'
import { watch } from 'vue'
import { useTrails } from '~/composables/useTrails'
import { PAGE_FADE, transitionDebug } from '~/utils/transitions'

/** Duree attendue par phase, en ms : c'est elle qui rend l'ecart lisible. */
const EXPECTED: Record<string, number> = {
  navigate: PAGE_FADE,
}

const TIMELINES = ['page-fade']

/** initiatorType du navigateur vers les lanes du waterfall. */
const LANES: Record<string, WaterfallLane> = {
  fetch: 'reseau',
  xmlhttprequest: 'reseau',
  beacon: 'reseau',
  script: 'script',
  css: 'style',
  link: 'style',
}

/** Au-dela, le waterfall devient illisible : en dev, une page charge des centaines
 *  de modules. On garde les plus longs, ce sont eux qui expliquent le temps. */
const MAX_RECORDS = 40

/**
 * Le waterfall se lit dans l'API Performance, pas dans le bus : c'est le
 * navigateur qui mesure. Pas de lane `layout`, aucune API ne l'expose.
 */
function waterfall(): WaterfallRecord[] {
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  const records: WaterfallRecord[] = []
  for (const entry of resources) {
    const lane = LANES[entry.initiatorType]
    if (!lane || entry.duration <= 0) continue
    records.push({
      lane,
      label: entry.name.split('/').pop() ?? entry.name,
      start: entry.startTime,
      duration: entry.duration,
    })
  }
  records.sort((a, b) => b.duration - a.duration)
  const kept = records.slice(0, MAX_RECORDS)
  for (const paint of performance.getEntriesByType('paint')) {
    kept.push({ lane: 'paint', label: paint.name, start: paint.startTime, duration: 0 })
  }
  return kept
}

/** Sans navigation d'ici la, l'enregistrement rend la main plutot que d'attendre. */
const CAPTURE_TIMEOUT = 15_000
/** Laisse le paint et les dernieres ressources entrer dans les mesures. */
const SETTLE = 600

let captureCount = 0

/**
 * Arme l'enregistrement de la PROCHAINE navigation : c'est le geste que la
 * maquette attend du bouton Rec. On lit apres coup ce que le navigateur et le
 * bus ont mesure — rien n'est simule.
 */
function record(router: Router): Promise<PhaseCapture> {
  return new Promise((resolve, reject) => {
    let stop: (() => void) | null = null
    const timer = setTimeout(() => {
      stop?.()
      reject(new Error('aucune navigation en 15 s'))
    }, CAPTURE_TIMEOUT)

    stop = router.afterEach(() => {
      clearTimeout(timer)
      stop?.()
      setTimeout(() => {
        captureCount++
        resolve({
          id: `capture-${captureCount}`,
          label: `capture #${captureCount} · ${transitionDebug.route}`,
          // Copie : le bus sera vide par la navigation suivante.
          feed: { route: transitionDebug.route, marks: [...transitionDebug.marks] },
          records: waterfall(),
        })
      }, SETTLE)
    })
  })
}

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

  const router = useRouter()

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
    addons: [
      timelinePanel({
        ids: TIMELINES,
        loadTheatre: (id) => useTrails(id),
        easeNames: EASE_NAMES,
        sampleEase: applyEase,
      }),
      a11yPanel,
      consolePanel(),
      netPanel(),
    ],
    panels: [
      inspectorPanel,
      layersPanel,
      // Le graphe vient du plugin Vite dev-only : sans lui, l'onglet dirait
      // simplement qu'aucun fournisseur n'est branche.
      codePanel({ graph: () => fetch('/__sonde/module-graph').then((r) => r.json()) }),
      tokensPanel({ accept: (name) => !name.startsWith('--tw-') }),
      phasesPanel({
        read: () => ({ route: transitionDebug.route, marks: transitionDebug.marks }),
        // Le bus est un reactive Vue ; la spice ne connait que ce callback.
        // deep obligatoire : beginTransition vide les marks et markPhase en
        // repousse une dans le meme tick — une longueur revenue a l'identique
        // ne declencherait aucun watcher.
        subscribe: (cb) => watch(() => transitionDebug, cb, { deep: true }),
        expected: EXPECTED,
        waterfall,
        record: () => record(router),
      }),
      // Epingles en bas du rail : la liste d'add-ons vient du montage, pas d'un
      // tableau en dur, sinon les interrupteurs mentiraient au premier ajout.
      settingsPanel({
        addons: [
          { id: 'timeline', label: 'Timeline' },
          { id: 'a11y', label: 'A11y' },
          { id: 'console', label: 'Console' },
          { id: 'net', label: 'Reseau' },
        ],
      }),
      shortcutsPanel,
    ],
  })
})
