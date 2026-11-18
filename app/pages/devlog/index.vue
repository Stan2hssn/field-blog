<script setup lang="ts">
import type { Theatre, TrailObjectApi } from '@spices/trails'
import type { DevlogCamera } from '~/utils/timelines'
import { useTrails } from '~/composables/useTrails'
import {
  DEVLOG_CAMERA_SCENE,
  DEVLOG_INTRO_CAMERA_FROM,
  DEVLOG_INTRO_TIMELINE,
  DEVLOG_LIST_OFFSET_VH,
  DEVLOG_MARKERS,
  DEVLOG_TIMELINE,
  TIMELINE_BUILDERS,
} from '~/utils/timelines'

definePageMeta({ viewTransition: true })

// Seul le titre clique porte un nom de View Transition : il vole vers l'article
// (et en revient au retour), le reste de la liste suit le fondu de page.
const lastSlug = useState<string | null>('devlog-last-slug', () => null)

useDevlogTheme()

type ListEntry = {
  slug: string
  to: string
  title: string
  lede: string
  tags: string[]
  publishDate: string | Date
  readingTime: number
}

// Les chapitres du blog (premiere version du site) gardent leur page et leur
// mise en page checklist : la liste les range simplement avec le devlog.
const { data: entries } = await useAsyncData('devlog-index', async (): Promise<ListEntry[]> => {
  const [devlog, blog] = await Promise.all([
    queryCollection('devlog').all(),
    queryCollection('blog').all(),
  ])
  return [
    ...devlog.map(e => ({ slug: e.slug, to: `/devlog/${e.slug}`, title: e.title, lede: e.lede, tags: e.tags, publishDate: e.publishDate, readingTime: e.readingTime })),
    ...blog.map(e => ({ slug: e.slug, to: `/blog/${e.slug}`, title: e.title, lede: e.lede, tags: e.tags ?? [], publishDate: e.publishDate, readingTime: e.readingTime })),
  ].sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
})

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const HEADER_PARALLAX = 0.3

const years = computed(() => {
  const groups = new Map<number, ListEntry[]>()
  for (const e of entries.value ?? []) {
    const year = new Date(e.publishDate).getFullYear()
    groups.set(year, [...(groups.get(year) ?? []), e])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, items]) => ({ year, items }))
})

const total = computed(() => entries.value?.length ?? 0)
const latestSlug = computed(() => entries.value?.[0]?.slug)

function formatDate(value: string | Date) {
  return DATE_FORMAT.format(new Date(value))
}

// Deux etats sans scroll de page : la scene, puis la liste qui sort de
// derriere l'ilot. L'etat vit dans la query, pas dans le hash : le serveur la
// recoit, donc un rechargement rend directement le bon etat, 3D comprise.
const route = useRoute()
const router = useRouter()
const showArticles = computed(() => route.query.vue === 'articles')

function openArticles() {
  router.replace({ query: { vue: 'articles' } })
}

function backToScene() {
  router.replace({ query: {} })
}

const heroCopy = useTemplateRef<HTMLElement>('heroCopy')
const backButton = useTemplateRef<HTMLElement>('backButton')
const scroller = useTemplateRef<HTMLElement>('scroller')
const header = useTemplateRef<HTMLElement>('header')
const groupEls = ref<HTMLElement[]>([])
const yearEls = ref<HTMLElement[]>([])

// Parallaxe en animations CSS pilotees par le scroll : elles tournent sur le
// compositeur, donc collent au defilement sans l'image de retard d'un
// handler JS. On ne mesure ici que les amplitudes, au montage et au resize.
// L'annee derive d'une fraction de son groupe pendant qu'il traverse l'ecran.
const YEAR_DRIFT = 0.28

function measureParallax() {
  if (header.value) {
    const h = header.value.offsetHeight
    header.value.style.setProperty('--fade-end', `${Math.round(h * 0.55)}px`)
    header.value.style.setProperty('--fade-shift', `${Math.round(h * 0.55 * HEADER_PARALLAX)}px`)
  }
  groupEls.value.forEach((group, i) => {
    const label = yearEls.value[i]
    if (!label) return
    const travel = Math.max(0, group.offsetHeight - label.offsetHeight) * YEAR_DRIFT
    label.style.setProperty('--travel', `${Math.round(travel)}px`)
  })
}

/**
 * La bascule est jouee par la timeline `devlog-open`, scrubbable dans l'onglet
 * Timeline de la sonde. Les classes is-hidden / is-open ne servent plus qu'au
 * rendu serveur et au premier paint : des que la timeline est chargee, ses
 * valeurs passent en style inline et prennent le dessus.
 * Le DOM de la page est ecrit a la main, sans reactivite : la liste d'articles
 * ne doit pas se re-differ a chaque image. Seule la scene recoit des props.
 */
type IntroMotion = { grow: number, blend: number, spin: number, from: DevlogCamera }
type Controls = { opacity: number, y: number }

const sceneMotion = shallowRef<{ camera: DevlogCamera, controls: Controls, intro: IntroMotion }>()

let devlogMotion: { camera: DevlogCamera, controls: Controls } | null = null
let introMotion: IntroMotion = { grow: 1, blend: 1, spin: 0, from: DEVLOG_INTRO_CAMERA_FROM }
let introControls: Controls = { opacity: 1, y: 0 }

// Les deux timelines se composent : l'intro module le cadrage et les controles
// de `devlog-open` au lieu de les ecraser.
function pushScene() {
  if (!devlogMotion) return
  sceneMotion.value = {
    camera: devlogMotion.camera,
    controls: {
      opacity: devlogMotion.controls.opacity * introControls.opacity,
      y: devlogMotion.controls.y + introControls.y,
    },
    intro: introMotion,
  }
}

let theatre: Theatre | null = null
let objects: TrailObjectApi[] = []
let lastKey = ''
let disposed = false
const EPS = 1e-4

function applyDevlog() {
  if (!theatre) return
  const hero = theatre.get('hero')
  const list = theatre.get('list')
  const island = theatre.get('island')
  const controls = theatre.get('controls')
  const back = theatre.get('back')
  const cam = theatre.get('camera')
  const dock = island.dock ?? 0
  const key = [
    hero.opacity, hero.y, list.opacity, dock, controls.opacity, controls.y, back.opacity,
    cam.fov, cam.distance, cam.height, cam.targetY, cam.shift,
  ].join()
  if (key === lastKey) return
  lastKey = key

  if (heroCopy.value) {
    heroCopy.value.style.opacity = String(hero.opacity)
    heroCopy.value.style.transform = `translate3d(0, ${hero.y}px, 0)`
  }
  if (scroller.value) {
    // Meme valeur que l'amarrage de l'ilot : la liste sort de derriere lui
    // d'un seul mouvement, au lieu de suivre sa propre courbe.
    scroller.value.style.opacity = String(list.opacity)
    scroller.value.style.transform = `translate3d(0, ${(1 - dock) * DEVLOG_LIST_OFFSET_VH}vh, 0)`
  }
  if (backButton.value) {
    backButton.value.style.opacity = String(back.opacity)
    backButton.value.style.transform = 'none'
  }
  devlogMotion = {
    camera: {
      fov: cam.fov ?? DEVLOG_CAMERA_SCENE.fov,
      distance: cam.distance ?? DEVLOG_CAMERA_SCENE.distance,
      height: cam.height ?? DEVLOG_CAMERA_SCENE.height,
      targetY: cam.targetY ?? DEVLOG_CAMERA_SCENE.targetY,
      shift: cam.shift ?? DEVLOG_CAMERA_SCENE.shift,
    },
    controls: { opacity: controls.opacity ?? 1, y: controls.y ?? 0 },
  }
  pushScene()
}

// --- Arrivee : timeline `devlog-intro` ---

const introTitle = useTemplateRef<HTMLElement>('introTitle')
const introLede = useTemplateRef<HTMLElement>('introLede')
const introCta = useTemplateRef<HTMLElement>('introCta')
// Masque le texte des le rendu serveur : sans ca, il clignoterait avant que
// l'intro ne prenne la main.
const introPending = ref(!showArticles.value)

let introTheatre: Theatre | null = null
let introObjects: TrailObjectApi[] = []
let sceneReady = false

function applyIntro() {
  if (!introTheatre) return
  const title = introTheatre.get('title')
  const lede = introTheatre.get('lede')
  const cta = introTheatre.get('cta')
  const island = introTheatre.get('island')
  const camera = introTheatre.get('camera')
  const from = introTheatre.get('cameraFrom')
  const controls = introTheatre.get('controls')
  const style = (el: HTMLElement | null, o: Record<string, number>, unit: string) => {
    if (!el) return
    el.style.opacity = String(o.opacity ?? 1)
    el.style.transform = `translate3d(0, ${o.y ?? 0}${unit}, 0)`
  }
  style(introTitle.value, title, '%')
  style(introLede.value, lede, 'px')
  style(introCta.value, cta, 'px')
  introMotion = {
    grow: island.grow ?? 1,
    spin: island.spin ?? 0,
    blend: camera.blend ?? 1,
    from: {
      fov: from.fov ?? DEVLOG_INTRO_CAMERA_FROM.fov,
      distance: from.distance ?? DEVLOG_INTRO_CAMERA_FROM.distance,
      height: from.height ?? DEVLOG_INTRO_CAMERA_FROM.height,
      targetY: from.targetY ?? DEVLOG_INTRO_CAMERA_FROM.targetY,
      shift: from.shift ?? DEVLOG_INTRO_CAMERA_FROM.shift,
    },
  }
  introControls = { opacity: controls.opacity ?? 1, y: controls.y ?? 0 }
  introPending.value = false
  pushScene()
}

// L'intro attend que les touffes soient chargees : sinon l'herbe pousserait
// dans le vide puis apparaitrait d'un coup.
function startIntro() {
  if (!introTheatre || !sceneReady) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    introTheatre.seek(introTheatre.duration)
    applyIntro()
    return
  }
  introTheatre.seek(0)
  introTheatre.play()
}

function onSceneReady() {
  sceneReady = true
  startIntro()
}

onMounted(() => {
  void useTrails(DEVLOG_INTRO_TIMELINE, TIMELINE_BUILDERS[DEVLOG_INTRO_TIMELINE]).then((tl) => {
    if (disposed) return
    introTheatre = tl
    introObjects = [
      tl.subscribe('title', { opacity: 1, y: 0 }),
      tl.subscribe('lede', { opacity: 1, y: 0 }),
      tl.subscribe('cta', { opacity: 1, y: 0 }),
      tl.subscribe('island', { grow: 1, spin: 0 }),
      tl.subscribe('camera', { blend: 1 }),
      tl.subscribe('cameraFrom', { ...DEVLOG_INTRO_CAMERA_FROM }),
      tl.subscribe('controls', { opacity: 1, y: 0 }),
    ]
    introObjects[0]!.onApply(applyIntro)
    tl.pause()
    if (showArticles.value) {
      // Arrivee directe sur la liste : la scene est deja posee derriere.
      tl.seek(tl.duration)
      applyIntro()
      return
    }
    tl.seek(0)
    applyIntro()
    startIntro()
  })
})

function markerTime(name: string): number {
  return theatre?.markersMap()[name] ?? 0
}

/**
 * Va vers l'etat demande par le chemin le plus court sur la timeline : en
 * avant dans le segment voulu, ou a rebours si on interrompt l'autre segment
 * en cours de route — jamais de saut visible.
 */
function playDevlog(open: boolean) {
  if (!theatre) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const openAt = markerTime(DEVLOG_MARKERS.articles)
  const endAt = markerTime(DEVLOG_MARKERS.closed)
  let p = theatre.playhead
  if (open && p >= endAt - EPS) {
    theatre.seek(0)
    p = 0
  }
  const target = open
    ? DEVLOG_MARKERS.articles
    : p < openAt - EPS ? DEVLOG_MARKERS.scene : DEVLOG_MARKERS.closed
  const distance = Math.abs(markerTime(target) - p)
  theatre.goToMarker(target, { instant: reduced || distance < EPS, duration: distance, ease: 'linear' })
}

onMounted(() => {
  void useTrails(DEVLOG_TIMELINE, TIMELINE_BUILDERS[DEVLOG_TIMELINE]).then((tl) => {
    if (disposed) return
    theatre = tl
    objects = [
      tl.subscribe('hero', { opacity: 1, y: 0 }),
      tl.subscribe('list', { opacity: 0 }),
      tl.subscribe('island', { dock: 0 }),
      tl.subscribe('camera', { ...DEVLOG_CAMERA_SCENE }),
      tl.subscribe('controls', { opacity: 1, y: 0 }),
      tl.subscribe('back', { opacity: 0 }),
    ]
    // Etat de depart sans animation : un rechargement sur ?vue=articles arrive
    // directement sur la liste, comme le rendu serveur.
    tl.pause()
    tl.seek(markerTime(showArticles.value ? DEVLOG_MARKERS.articles : DEVLOG_MARKERS.scene))
    objects[0]!.onApply(applyDevlog)
    applyDevlog()
  })
})

watch(showArticles, open => playDevlog(open))

onBeforeUnmount(() => {
  disposed = true
  for (const object of [...objects, ...introObjects]) object.release()
  objects = []
  introObjects = []
  theatre = null
  introTheatre = null
})

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  measureParallax()
  resizeObserver = new ResizeObserver(measureParallax)
  if (scroller.value?.firstElementChild) resizeObserver.observe(scroller.value.firstElementChild)
})
onBeforeUnmount(() => resizeObserver?.disconnect())

useSeoMeta({
  title: 'Devlog — FIELD',
  description: 'Construire un moteur 3D à la main, en C++, un jour après l\'autre.',
})
</script>

<template>
  <main id="main-content" class="relative h-[100dvh] overflow-hidden bg-bg transition-colors duration-slow" :class="introPending ? 'intro-pending' : ''">
    <div class="fixed top-[32px] right-[32px] z-40">
      <DevlogThemeToggle />
    </div>

    <button
      ref="backButton"
      type="button"
      class="fixed top-[24px] left-[32px] z-40 inline-flex items-center gap-[12px] h-[40px] px-[14px] rounded-[6px] border border-[color-mix(in_srgb,var(--color-rule)_15%,transparent)] font-sans text-[14px] text-primary bg-bg focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
      :class="showArticles ? '' : 'opacity-0 -translate-y-[8px] pointer-events-none'"
      :inert="!showArticles"
      @click="backToScene"
    >
      <span aria-hidden="true">←</span>
      Retour à la scène
    </button>

    <!-- Liste : sous le canvas, elle defile dans son propre conteneur pour que
         l'ilot reste au premier plan comme un decor. -->
    <div
      ref="scroller"
      class="articles-layer fixed inset-0 z-10 overflow-y-auto overscroll-contain"
      :class="showArticles ? 'is-open' : 'pointer-events-none'"
      :inert="!showArticles"
    >
      <section class="px-[16px] md:px-[32px] pt-[160px] pb-[55vh]" aria-labelledby="articles-title">
        <div class="mx-auto w-[min(1000px,100%)] grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)]">
          <header ref="header" class="list-header md:col-start-2 flex flex-col gap-[16px] mb-[72px]">
            <h2 id="articles-title" class="font-serif font-normal text-[clamp(40px,4.4vw,64px)] leading-[1.02] tracking-[-0.02em] text-primary">
              Build your handmade 3D software
            </h2>
            <p class="font-sans font-light text-[18px] leading-[28px] text-secondary">
              {{ total }} articles, du design au moteur 3D.
            </p>
          </header>

          <template v-for="group in years" :key="group.year">
            <div ref="groupEls" class="year-group relative mb-[16px] md:mb-0 pt-[22px]">
              <p ref="yearEls" class="year-label flex flex-col gap-[4px]">
                <span class="font-serif font-normal text-[44px] leading-[1] tracking-[-0.02em] text-primary">{{ group.year }}</span>
                <span class="font-sans text-[13px] leading-[18px] text-secondary">
                  {{ group.items.length }} {{ group.items.length > 1 ? 'entrées' : 'entrée' }}
                </span>
              </p>
            </div>

            <ol class="flex flex-col mb-[96px]">
              <li
                v-for="e in group.items"
                :key="e.to"
                class="border-b border-[color-mix(in_srgb,var(--color-rule)_12%,transparent)] last:border-b-0"
              >
                <NuxtLink
                  :to="e.to"
                  @click="lastSlug = e.slug"
                  class="group flex flex-col gap-[6px] py-[22px] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <h3 class="flex items-baseline gap-[12px] font-serif font-normal text-[24px] leading-[32px] tracking-[-0.01em] text-primary">
                    <span class="devlog-title decoration-1 underline-offset-[5px] group-hover:underline" :style="{ viewTransitionName: e.slug === lastSlug ? `devlog-title-${e.slug}` : undefined }">{{ e.title }}</span>
                    <span v-if="e.slug === latestSlug" class="inline-flex items-center gap-[6px] font-sans text-[13px] leading-[18px] text-accent whitespace-nowrap">
                      <span class="w-[6px] h-[6px] rounded-full bg-accent" aria-hidden="true" />
                      Dernier
                    </span>
                  </h3>
                  <p class="font-sans font-light text-[17px] leading-[26px] text-secondary truncate">
                    {{ e.lede }}
                  </p>
                  <p class="flex flex-wrap items-center gap-x-[10px] font-sans text-[13px] leading-[20px] text-mid">
                    <span v-for="tag in e.tags" :key="tag" class="text-accent">{{ tag }}</span>
                    <time :datetime="String(e.publishDate)">{{ formatDate(e.publishDate) }}</time>
                    <span>{{ e.readingTime }} min</span>
                  </p>
                </NuxtLink>
              </li>
            </ol>
          </template>
        </div>
      </section>
    </div>

    <DevlogHeroScene
      :docked="showArticles"
      :camera="sceneMotion?.camera"
      :controls="sceneMotion?.controls"
      :intro="sceneMotion?.intro"
      @ready="onSceneReady"
    />

    <!-- Le texte laisse passer le pointeur vers le canvas, sauf le bouton. -->
    <section
      ref="heroCopy"
      class="hero-copy fixed inset-x-0 top-0 z-30 flex flex-col items-center text-center gap-[24px] px-[16px] pt-[clamp(72px,13dvh,140px)] pointer-events-none"
      :class="showArticles ? 'is-hidden' : ''"
      :inert="showArticles"
    >
      <h1 class="overflow-hidden pb-[0.16em] -mb-[0.16em] font-serif font-normal text-[clamp(52px,7.2vw,124px)] leading-[0.98] tracking-[-0.03em] text-primary">
        <span ref="introTitle" class="intro-item block">Le devlog R3D</span>
      </h1>
      <p ref="introLede" class="intro-item font-sans font-light text-[18px] leading-[30px] text-secondary max-w-[46ch]">
        Un moteur 3D écrit à la main en C++, un rayon après l'autre.
      </p>
      <button
        ref="introCta"
        type="button"
        class="intro-item pointer-events-auto mt-[4px] inline-flex items-center gap-[24px] h-[52px] px-[22px] rounded-[6px] bg-primary text-bg font-sans text-[16px] transition-opacity duration-fast hover:opacity-85 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent"
        @click="openArticles"
      >
        Lire les articles
        <span aria-hidden="true">→</span>
      </button>
    </section>
  </main>
</template>

<style scoped>
@supports (animation-timeline: view()) {
  .year-group {
    view-timeline: --year-group block;
  }

  .year-label {
    animation: year-drift linear both;
    animation-timeline: --year-group;
    animation-range: exit-crossing 0% exit-crossing 100%;
  }

  .list-header {
    animation: header-drift linear both;
    animation-timeline: scroll(nearest block);
    animation-range: 0px var(--fade-end, 300px);
  }
}

@keyframes year-drift {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(0, var(--travel, 0px), 0); }
}

@keyframes header-drift {
  from { transform: translate3d(0, 0, 0); opacity: 1; }
  to { transform: translate3d(0, var(--fade-shift, 0px), 0); opacity: 0; }
}

.intro-pending .intro-item,
.intro-pending :deep(.turn-controls) {
  opacity: 0;
}

.hero-copy.is-hidden {
  opacity: 0;
  transform: translateY(-48px);
}

.articles-layer {
  opacity: 0;
  transform: translateY(28vh);
}

.articles-layer.is-open {
  opacity: 1;
  transform: none;
}
</style>
