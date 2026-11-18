export default defineNuxtConfig({
  compatibilityDate: '2026-05-21',

  modules: [
    '@nuxt/content',
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-fonts',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    // SONDE est une dependance : le module ne fait rien hors developpement.
    '@sonde/core/nuxt',
  ],

  sonde: {
    panels: '~/sonde.config',
    routes: { meadow: 'app/utils/devlog-meadow.values.json' },
  },

  content: {
    build: {
      markdown: {
        remarkPlugins: { 'remark-math': {} },
        rehypePlugins: { 'rehype-katex': { output: 'html' } },
        highlight: {
          theme: { default: 'github-light', dark: 'github-dark' },
          langs: ['cpp', 'cmake', 'bash'],
        },
      },
    },
  },

  ssr: true,
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/blog', '/devlog'],
      ignore: ['/_dev'],
    },
  },

  routeRules: {
    '/': { redirect: { to: '/blog', statusCode: 301 } },
  },

  experimental: {
    viewTransition: true,
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
    // global : obligatoire pour que le Markdown (MDC) resolve ces composants.
    { path: '~/components/content', pathPrefix: false, global: true },
    { path: '~/components', pathPrefix: false },
  ],

  alias: {
    // trails n'est pas dans @sonde/core : il reste la source partagee de `_lib`
    // en attendant son propre paquet. Il est importe a l'execution (blog,
    // devlog), donc aussi par le build de production.
    '@spices/trails': '/Users/stan_husson/Dev/PV/_lib/trails',
  },

  // Autorise le serveur de dev a servir `_lib/trails`, hors de la racine.
  vite: {
    server: { fs: { allow: ['..', '/Users/stan_husson/Dev/PV/_lib/trails'] } },
  },

  css: [
    '~/assets/css/tokens.css',
    '~/assets/css/main.css',
    '~/assets/css/tailwind.css',
    'katex/dist/katex.min.css',
    '~/assets/css/devlog.css',
  ],

  googleFonts: {
    families: {
      Inter: [300, 400, 500, 600, 700],
      'JetBrains Mono': [500],
      Newsreader: { wght: [300, 400, 500], ital: [300, 400] },
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
