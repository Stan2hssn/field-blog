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

/** Duree du deroule du rail a l'arrivee sur l'index, en secondes. */
export const INTRO_RUN_SECONDS = 1.4
/** Chapitres parcourus par l'intro avant de se poser sur le premier. */
export const INTRO_RUN_CHAPTERS = 4
/** Doit rester aligne sur --dur-base. */
export const PAGE_FADE_SECONDS = 0.2

export const TIMELINE_BUILDERS: Record<string, (tl: Theatre) => void> = {
  [INTRO_TIMELINE]: (tl) => {
    tl.fromTo(
      'rail',
      { offset: -INTRO_RUN_CHAPTERS },
      { offset: 0 },
      { duration: INTRO_RUN_SECONDS, ease: 'outQuart' },
    )
  },
  [PAGE_FADE_TIMELINE]: (tl) => {
    tl.fromTo('page', { opacity: 0 }, { opacity: 1 }, {
      duration: PAGE_FADE_SECONDS,
      ease: 'outCubic',
    })
  },
}

/** Ids proposes par le selecteur du panneau Timeline. */
export const TIMELINE_IDS = Object.keys(TIMELINE_BUILDERS)
