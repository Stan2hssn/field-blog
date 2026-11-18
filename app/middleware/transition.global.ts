import { beginTransition, markPhase } from '~/utils/transitions'
import { PAGE_FADE } from '~/utils/transitions'

/**
 * La config de transition appartient a la route, pas a nuxt.config.
 * Toutes les navigations partagent le meme fondu, sans exception.
 */
export default defineNuxtRouteMiddleware((to, from) => {
  // Entre pages du devlog, la View Transition native prend le relais (titre
  // partage liste -> article) ; le fondu Vue se superposerait a elle.
  const devlogPair = to.path.startsWith('/devlog') && from.path.startsWith('/devlog')
  if (import.meta.client && devlogPair && 'startViewTransition' in document) {
    to.meta.pageTransition = false
    beginTransition(`${from.path} → ${to.path}`)
    markPhase('navigate')
    return
  }

  to.meta.pageTransition = {
    name: 'page',
    mode: 'out-in',
    appear: true,
    duration: PAGE_FADE,
  }

  if (!import.meta.client) return
  beginTransition(`${from.path} → ${to.path}`)
  markPhase('navigate')
})
