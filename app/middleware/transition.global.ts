import { beginTransition, markPhase } from '~/utils/transitions'
import { PAGE_FADE } from '~/utils/transitions'

/**
 * La config de transition appartient a la route, pas a nuxt.config.
 * Toutes les navigations partagent le meme fondu, sans exception.
 */
export default defineNuxtRouteMiddleware((to, from) => {
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
