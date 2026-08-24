// Chemin absolu et non alias : nuxt.config est charge avant que les alias de
// l'app existent. Le plugin est en apply:'serve', il n'atteint aucun build.
import { sondeModuleGraph } from '/Users/stan_husson/Dev/PV/_lib/devtools/vite/index.ts'

export default defineNuxtConfig({
  compatibilityDate: '2026-05-21',

  modules: [
    '@nuxt/content',
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-fonts',
    '@pinia/nuxt',
    '@vueuse/nuxt',
  ],

  ssr: true,
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/blog'],
      ignore: ['/_dev'],
    },
  },

  routeRules: {
    '/': { redirect: { to: '/blog', statusCode: 301 } },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      meta: [
        { name: 'theme-color', content: '#0a0a0a' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      ],
    },
  },

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  alias: {
    // Source unique des spices, partagee entre projets en attendant un module node.
    '@spices/trails': '/Users/stan_husson/Dev/PV/_lib/trails',
    '@spices/devtools/vite': '/Users/stan_husson/Dev/PV/_lib/devtools/vite/index.ts',
    '@spices/devtools': '/Users/stan_husson/Dev/PV/_lib/devtools',
  },

  vite: {
    plugins: [sondeModuleGraph()],
    server: { fs: { allow: ['..', '/Users/stan_husson/Dev/PV/_lib'] } },
  },

  css: [
    '~/assets/css/tokens.css',
    '~/assets/css/main.css',
    '~/assets/css/tailwind.css',
  ],

  googleFonts: {
    families: {
      Inter: [300, 400, 500, 600, 700],
      'JetBrains Mono': [500],
    },
    display: 'swap',
    download: true,
    inject: true,
  },

  build: {
    transpile: ['gsap'],
  },

  // La sonde remplace @nuxt/devtools : deux outils qui posent chacun un calque
  // plein viewport au-dessus de la page se disputent le pointeur pour rien.
  devtools: { enabled: false },
})
