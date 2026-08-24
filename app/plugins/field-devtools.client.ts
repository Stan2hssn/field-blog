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
  diffPanel,
  buildPanel,
  settingsPanel,
  shortcutsPanel,
  codePanel,
  glPanel,
  threeAdapter,
} from '@spices/devtools'
import type { PhaseCapture, WaterfallLane, WaterfallRecord } from '@spices/devtools'
import type { Router } from 'vue-router'
import { EASE_NAMES, applyEase } from '@spices/trails'
import { watch } from 'vue'
import { REVISION } from 'three'
import { useTrails } from '~/composables/useTrails'
import { useGlScene } from '~/composables/useGlScene'
import { useRailState } from '~/composables/useRailState'
import { PAGE_FADE, transitionDebug } from '~/utils/transitions'
import {
  PAGE_FADE_TIMELINE,
  TIMELINE_BUILDERS,
  TIMELINE_IDS,
} from '~/utils/timelines'

/** Duree attendue par phase, en ms : c'est elle qui rend l'ecart lisible. */
const EXPECTED: Record<string, number> = {
  navigate: PAGE_FADE,
}



/** Ordre d'affichage des domaines du State Δ ; le reste suit par ordre alpha. */
const DIFF_GROUPS = ['route', 'rail', 'transition', 'scene']

/** Deux decimales : la position d'une camera bouge en flottants, pas au pixel. */
const round = (n: number) => Math.round(n * 100) / 100

/**
 * Ce projet n'a pas de store — son etat vit dans le routeur, le bus de
 * transitions, la position du rail et sa scene. Le snapshot les rassemble sous
 * quatre domaines : c'est ce que le panneau compare avant/apres chaque interaction.
 * Lecture ponctuelle et copies plates : le panneau doit pouvoir relire le
 * snapshot d'avant apres que la source a mute en place.
 */
function storeSnapshot(router: Router): Record<string, unknown> {
  const route = router.currentRoute.value
  const gl = useGlScene().read()
  const rail = useRailState().read()
  return {
    route: {
      path: route.path,
      name: String(route.name ?? ''),
      params: { ...route.params },
    },
    rail: rail ? { offset: round(rail.offset()), chapitreActif: rail.active() } : { monte: false },
    transition: {
      route: transitionDebug.route,
      marks: transitionDebug.marks.map((mark) => ({ phase: mark.phase, at: round(mark.at) })),
    },
    scene: gl
      ? {
          montee: true,
          objets: gl.scene.children.length,
          visibles: gl.scene.children.filter((child) => child.visible).length,
          cameraZ: round(gl.camera.position.z),
          survole: gl.hovered(),
        }
      : { montee: false },
  }
}


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

  useTrails(PAGE_FADE_TIMELINE, TIMELINE_BUILDERS[PAGE_FADE_TIMELINE])

  mountDevtools({
    // Nomme le projet : sans lui la cle retomberait sur le hostname, partage
    // par tous les projets servis depuis localhost.
    namespace: 'field-blog',
    adapters: [vueAdapter],
    addons: [
      timelinePanel({
        ids: TIMELINE_IDS,
        // Le constructeur suit l'id : le panneau peut demander une timeline avant
        // que la page qui la joue soit montee, sans mettre un theatre vide en cache.
        loadTheatre: (id) => useTrails(id, TIMELINE_BUILDERS[id]),
        easeNames: EASE_NAMES,
        sampleEase: applyEase,
      }),
      // La scene du rail de chapitres, publiee par ChapterScene. Des lecteurs et
      // non des references : elle meurt et renait a chaque changement de route.
      glPanel({
        adapter: threeAdapter({
          renderer: () => useGlScene().read()?.renderer ?? null,
          scene: () => useGlScene().read()?.scene ?? null,
          name: 'three ' + REVISION,
          invalidate: () => useGlScene().read()?.render(),
        }),
      }),
      consolePanel(),
      diffPanel({ snapshot: () => storeSnapshot(router), groups: DIFF_GROUPS }),
      netPanel(),
      a11yPanel,
      // Rejeu de la construction : arme, recharge, et filme la mise en page.
      buildPanel(),
    ],
    panels: [
      inspectorPanel,
      // Le graphe vient du plugin Vite dev-only : sans lui, l'onglet dirait
      // simplement qu'aucun fournisseur n'est branche.
      codePanel({ graph: () => fetch('/__sonde/module-graph').then((r) => r.json()) }),
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
        waterfall,
        record: () => record(router),
      }),
      // Epingle en bas du rail. Sans liste : les interrupteurs sont ceux des
      // add-ons reellement montes ci-dessus, ils ne peuvent pas en oublier un.
      settingsPanel({}),
      shortcutsPanel,
    ],
  })
})
