import type { Theatre } from '@spices/trails'

/**
 * Declarations des timelines du projet, dans un module partage plutot que dans
 * la page qui les joue.
 *
 * useTrails met en cache un Theatre par id, et c'est le PREMIER appelant qui en
 * fixe la forme : si le panneau Timeline de la sonde demandait `index-intro`
 * avant que la page l'ait declaree, il mettait en cache un theatre vide et
 * n'affichait aucune piste. Les deux passent maintenant par les memes
 * constructeurs, l'ordre n'importe plus.
 */
export const PAGE_FADE_TIMELINE = 'page-fade'
export const INTRO_TIMELINE = 'index-intro'
export const DEVLOG_TIMELINE = 'devlog-open'
export const DEVLOG_INTRO_TIMELINE = 'devlog-intro'

/** Duree du deroule du rail a l'arrivee sur l'index, en secondes. */
export const INTRO_RUN_SECONDS = 1.4
/** Chapitres parcourus par l'intro avant de se poser sur le premier. */
export const INTRO_RUN_CHAPTERS = 4
/** Doit rester aligne sur --dur-base. */
export const PAGE_FADE_SECONDS = 0.2

/**
 * Index du devlog, scene <-> liste. Une seule timeline en deux segments :
 * l'ouverture sur [0, OPEN], la fermeture sur [OPEN, OPEN + CLOSE], dont la fin
 * vaut l'etat de depart. Jouer l'ouverture a l'envers inverserait aussi l'ordre
 * fondu / translation, or chaque opacite doit finir avant sa translation.
 *
 * La liste n'a PAS de piste de translation : elle se deduit de `island.dock`
 * (voir DEVLOG_LIST_OFFSET_VH), pour sortir de derriere l'ilot d'un seul
 * mouvement. `island.dock` et `camera` partagent depart, duree et courbe :
 * changer l'ease de l'une sans l'autre les desynchronise.
 */
export const DEVLOG_OPEN_SECONDS = 1.2
export const DEVLOG_CLOSE_SECONDS = 1.2
/** Course de la liste, en vh, quand l'ilot n'est pas amarre (dock = 0). */
export const DEVLOG_LIST_OFFSET_VH = 28
export const DEVLOG_MARKERS = {
  scene: 'scene',
  articles: 'articles',
  closed: 'closed',
} as const

/**
 * Cadrage de l'ilot, piste `camera` : fov vertical (en degres, resserre au-dela
 * d'un ratio 1.9), recul et hauteur de la camera, hauteur visee, et decalage
 * vertical de l'image en fraction de hauteur (negatif = l'ilot descend).
 * Ces deux jeux sont les premieres et dernieres cles de la piste, editables
 * dans l'onglet Timeline ; la scene s'en sert aussi avant que la timeline soit
 * chargee.
 */
export interface DevlogCamera {
  fov: number
  distance: number
  height: number
  targetY: number
  shift: number
}

export const DEVLOG_CAMERA_SCENE: DevlogCamera = {
  fov: 55,
  distance: 10.4,
  height: 2.1,
  targetY: 0.45,
  shift: -0.13,
}

/** Plus serre que la scene : les sommets qui depassent en bas de la liste
 *  doivent se lire en grand. */
export const DEVLOG_CAMERA_ARTICLES: DevlogCamera = {
  fov: 50,
  distance: 6.9,
  height: 1.7,
  targetY: 0.5,
  shift: -0.321,
}

/**
 * Arrivee sur la scene du devlog. La camera part de `cameraFrom` (vue plongeante
 * et lointaine, editable) et rejoint le cadrage courant de `devlog-open` selon
 * `camera.blend` : les deux timelines se composent au lieu de se battre.
 * L'herbe pousse du centre vers le bord (`island.grow`), l'ilot finit un quart
 * de tour (`island.spin`), puis le texte monte ligne par ligne.
 */
export const DEVLOG_INTRO_SECONDS = 2.6
export const DEVLOG_INTRO_CAMERA_FROM: DevlogCamera = {
  fov: 34,
  distance: 15,
  height: 9,
  targetY: 0,
  shift: 0,
}

const FADE_EASE = 'outCubic'
/** Le plus proche de --ease-out, cubic-bezier(0.16, 1, 0.3, 1). */
const MOVE_EASE = 'outExpo'
const DOCK_EASE = 'outQuart'

function buildDevlog(tl: Theatre): void {
  const open = DEVLOG_OPEN_SECONDS
  const end = open + DEVLOG_CLOSE_SECONDS

  tl.fromTo('hero', { opacity: 1 }, { opacity: 0 }, { at: 0, duration: 0.32, ease: FADE_EASE })
  tl.fromTo('hero', { y: 0 }, { y: -48 }, { at: 0, duration: 0.8, ease: MOVE_EASE })
  tl.fromTo('controls', { opacity: 1 }, { opacity: 0 }, { at: 0, duration: 0.3, ease: FADE_EASE })
  tl.fromTo('controls', { y: 0 }, { y: 24 }, { at: 0, duration: 0.7, ease: MOVE_EASE })
  tl.fromTo('island', { dock: 0 }, { dock: 1 }, { at: 0, duration: open, ease: DOCK_EASE })
  tl.fromTo('camera', { ...DEVLOG_CAMERA_SCENE }, { ...DEVLOG_CAMERA_ARTICLES }, { at: 0, duration: open, ease: DOCK_EASE })
  tl.fromTo('list', { opacity: 0 }, { opacity: 1 }, { at: 0.12, duration: 0.45, ease: FADE_EASE })
  tl.fromTo('back', { opacity: 0 }, { opacity: 1 }, { at: 0.25, duration: 0.35, ease: FADE_EASE })

  tl.fromTo('list', { opacity: 1 }, { opacity: 0 }, { at: open, duration: 0.26, ease: FADE_EASE })
  tl.fromTo('back', { opacity: 1 }, { opacity: 0 }, { at: open, duration: 0.2, ease: FADE_EASE })
  tl.fromTo('island', { dock: 1 }, { dock: 0 }, { at: open, duration: DEVLOG_CLOSE_SECONDS, ease: DOCK_EASE })
  tl.fromTo('camera', { ...DEVLOG_CAMERA_ARTICLES }, { ...DEVLOG_CAMERA_SCENE }, { at: open, duration: DEVLOG_CLOSE_SECONDS, ease: DOCK_EASE })
  tl.fromTo('hero', { opacity: 0 }, { opacity: 1 }, { at: open, duration: 0.32, ease: FADE_EASE })
  tl.fromTo('hero', { y: -48 }, { y: 0 }, { at: open, duration: 0.8, ease: MOVE_EASE })
  tl.fromTo('controls', { opacity: 0 }, { opacity: 1 }, { at: open, duration: 0.3, ease: FADE_EASE })
  tl.fromTo('controls', { y: 24 }, { y: 0 }, { at: open, duration: 0.7, ease: MOVE_EASE })

  // trails n'a pas de setter de marqueurs : on les pose dans l'etat.
  tl.replaceState({
    ...tl.snapshot(),
    duration: end,
    markers: {
      [DEVLOG_MARKERS.scene]: 0,
      [DEVLOG_MARKERS.articles]: open,
      [DEVLOG_MARKERS.closed]: end,
    },
  })
}

function buildDevlogIntro(tl: Theatre): void {
  tl.fromTo('cameraFrom', { ...DEVLOG_INTRO_CAMERA_FROM }, { ...DEVLOG_INTRO_CAMERA_FROM }, { at: 0, duration: DEVLOG_INTRO_SECONDS })
  tl.fromTo('camera', { blend: 0 }, { blend: 1 }, { at: 0, duration: 2.4, ease: 'inOutCubic' })
  tl.fromTo('island', { grow: 0 }, { grow: 1 }, { at: 0.2, duration: 2.1, ease: 'inOutCubic' })
  tl.fromTo('island', { spin: -1.6 }, { spin: 0 }, { at: 0, duration: 2.5, ease: MOVE_EASE })
  tl.fromTo('title', { opacity: 0 }, { opacity: 1 }, { at: 0.9, duration: 0.45, ease: FADE_EASE })
  tl.fromTo('title', { y: 105 }, { y: 0 }, { at: 0.9, duration: 1.1, ease: MOVE_EASE })
  tl.fromTo('lede', { opacity: 0 }, { opacity: 1 }, { at: 1.2, duration: 0.4, ease: FADE_EASE })
  tl.fromTo('lede', { y: 18 }, { y: 0 }, { at: 1.2, duration: 0.9, ease: MOVE_EASE })
  tl.fromTo('cta', { opacity: 0 }, { opacity: 1 }, { at: 1.35, duration: 0.4, ease: FADE_EASE })
  tl.fromTo('cta', { y: 18 }, { y: 0 }, { at: 1.35, duration: 0.9, ease: MOVE_EASE })
  tl.fromTo('controls', { opacity: 0 }, { opacity: 1 }, { at: 1.7, duration: 0.4, ease: FADE_EASE })
  tl.fromTo('controls', { y: 24 }, { y: 0 }, { at: 1.7, duration: 0.8, ease: MOVE_EASE })
}

export const TIMELINE_BUILDERS: Record<string, (tl: Theatre) => void> = {
  [INTRO_TIMELINE]: (tl) => {
    tl.fromTo(
      'rail',
      { offset: -INTRO_RUN_CHAPTERS },
      { offset: 0 },
      { duration: INTRO_RUN_SECONDS, ease: 'outQuart' },
    )
  },
  [DEVLOG_TIMELINE]: buildDevlog,
  [DEVLOG_INTRO_TIMELINE]: buildDevlogIntro,
  [PAGE_FADE_TIMELINE]: (tl) => {
    tl.fromTo('page', { opacity: 0 }, { opacity: 1 }, {
      duration: PAGE_FADE_SECONDS,
      ease: 'outCubic',
    })
  },
}

/** Ids proposes par le selecteur du panneau Timeline. */
export const TIMELINE_IDS = Object.keys(TIMELINE_BUILDERS)
