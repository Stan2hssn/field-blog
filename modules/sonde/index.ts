import { addPlugin, addVitePlugin, createResolver, defineNuxtModule } from 'nuxt/kit'

/**
 * Branche la sonde, et seulement en developpement.
 *
 * Elle etait cablee en deux endroits qui entraient tous les deux dans le build
 * de production : un `import` en tete de `nuxt.config.ts`, evalue a chaque
 * chargement de la config, et un plugin dans `app/plugins/`, que Nuxt
 * enregistre automatiquement. Le garde `import.meta.dev` du plugin arretait son
 * execution, pas le bundler : ses imports statiques restaient a resoudre.
 *
 * Ici les deux passent par ce module. Hors dev, `setup` rend la main avant tout
 * `import()`, et rien de la sonde n'entre dans le graphe.
 */
const LIB = '/Users/stan_husson/Dev/PV/_lib/devtools'

export default defineNuxtModule({
  meta: { name: 'sonde', configKey: 'sonde' },

  async setup(_options, nuxt) {
    if (!nuxt.options.dev) return

    // Chemin absolu assume : `_lib` n'est pas encore un paquet du workspace, et
    // les alias de l'app n'existent pas au moment ou la config se charge. Le
    // jour ou `_lib` devient un module node, cette constante disparait.
    const { sondeModuleGraph } = (await import(`${LIB}/vite/index.ts`)) as {
      sondeModuleGraph: () => unknown
    }
    addVitePlugin(sondeModuleGraph() as never)

    // Le fichier reste sous `app/` : la racine Vite de Nuxt y est fixee, et un
    // runtime pose dans `modules/` n'y resout plus ni `three` ni `~/`. Il vit
    // hors de `app/plugins/`, le seul dossier que Nuxt enregistre tout seul.
    const { resolve } = createResolver(import.meta.url)
    addPlugin({ src: resolve('../../app/sonde/devtools.client'), mode: 'client' })
  },
})
