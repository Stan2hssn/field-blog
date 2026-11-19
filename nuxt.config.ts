import { fileURLToPath } from 'node:url'
import type { SondeModuleOptions } from '@sonde/core/nuxt'

const SONDE: SondeModuleOptions = {
  panels: '~/sonde.config',
  routes: { meadow: 'app/utils/devlog-meadow.values.json' },
}

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

  // La sonde ne sert qu'en developpement, et vit dans un depot prive que le build
  // Vercel ne peut pas cloner : chargee en dev seulement, elle est une dependance
  // optionnelle, dont l'echec d'installation n'arrete pas pnpm. Ses options passent
  // par le module : hors dev, la cle `sonde` n'existerait pas dans le type de la config.
  $development: {
    modules: [['@sonde/core/nuxt', SONDE]],
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
    // Copie du runtime de trails (SONDE-DEVTOOLS/trails @ c87d8a3, sans studio) :
    // le site l'execute en production et Vercel ne peut pas cloner le depot
    // prive. A resynchroniser a la main quand trails evolue.
    '@spices/trails': fileURLToPath(new URL('./app/lib/trails', import.meta.url)),
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
