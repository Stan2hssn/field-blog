export type DevlogTheme = 'day' | 'night'

export function useDevlogTheme() {
  // Cookie plutot que localStorage : le SSR rend directement le bon theme,
  // sans flash blanc au chargement d'une page de nuit.
  const theme = useCookie<DevlogTheme>('devlog-theme', {
    default: () => 'day',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  useHead({
    htmlAttrs: {
      'data-devlog-theme': () => theme.value,
    },
  })

  function toggle() {
    theme.value = theme.value === 'night' ? 'day' : 'night'
  }

  return { theme, toggle }
}
