<script setup lang="ts">
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three'
import { CHAPTERS_MANIFEST } from '~/utils/chapters'
import {
  DEFAULT_GAP,
  RAIL_WIDTH,
  activeIndex,
  chapterSize,
  slotsAt,
} from '~/utils/carousel-layout'
import { PIXEL_FOV, pixelPerfectZ, placeOnScreen } from '~/utils/dom-align'
import { useGlScene } from '~/composables/useGlScene'
import { applyEase } from '@spices/trails'

const { scrollOffset, gap = DEFAULT_GAP } = defineProps<{
  scrollOffset: number
  gap?: number
}>()

const ACTIVE_OPACITY = 1
const IDLE_OPACITY = 0.5
const CARD_COLOR = '#f7f7f5'

/**
 * Rapprochement de la carte survolee, en unites monde donc en pixels. La camera
 * est perspective : avancer grossit, c'est le grossissement du survol — inutile
 * d'y ajouter une echelle, qui ferait deux fois le meme effet.
 */
const HOVER_LIFT = 24
/** Aligne sur --dur-base. */
const HOVER_MS = 200
const HOVER_EASE = 'outCubic'

// useTemplateRef et non une ref homonyme : c'est la convention du repo
// (ImageCardStack.client.vue:41), et en Vue 3.5 la liaison implicite d'une
// ref portant le nom du template n'a plus lieu.
const surface = useTemplateRef<HTMLCanvasElement>('surface')
const slots = computed(() => slotsAt(scrollOffset, gap))
const active = computed(() => activeIndex(scrollOffset))

/** Chaque carte du DOM, indexee par la cle de son creneau. */
const cards = new Map<string, HTMLElement>()
function keepCard(key: string, el: Element | null) {
  if (el instanceof HTMLElement) cards.set(key, el)
  else cards.delete(key)
}

let renderer: WebGLRenderer | null = null
let scene: Scene | null = null
let camera: PerspectiveCamera | null = null
let geometry: PlaneGeometry | null = null
const planes = new Map<string, Mesh<PlaneGeometry, MeshStandardMaterial>>()
/** WebGL peut manquer : contexte refuse, GPU bloque, navigateur sans support. */
const failed = ref(false)

/**
 * Les planes sont indexes par CHAPITRE et non par creneau. Un creneau porte le
 * numero de cycle, qui change a chaque tour de rail : les indexer dessus ferait
 * creer et detruire un Mesh en continu pendant le defilement, et surtout
 * changerait son uuid sans arret — la sonde perdrait le noeud qu'elle edite
 * entre la selection et l'ecriture.
 */
function planeFor(key: string, index: number): Mesh<PlaneGeometry, MeshStandardMaterial> {
  const known = planes.get(key)
  if (known) return known
  const material = new MeshStandardMaterial({
    color: new Color(CARD_COLOR),
    roughness: 0.9,
    metalness: 0,
    transparent: true,
  })
  // Une seule geometrie partagee : le plane unite est mis a l'echelle du rect,
  // c'est tout l'interet de la methode.
  const mesh = new Mesh(geometry!, material)
  mesh.name = `chapitre ${CHAPTERS_MANIFEST[index]?.num ?? index}`
  planes.set(key, mesh)
  scene?.add(mesh)
  return mesh
}

/**
 * Les planes hors du rail sont MASQUES, jamais detruits. Le rail ne compte
 * qu'une poignee de chapitres, et un objet recree perd tout ce qu'on lui a fait
 * — une edition depuis la sonde, mais aussi tout tween pose de l'exterieur. Une
 * identite qui survit au defilement vaut mieux qu'une poignee d'octets.
 */
function hideOutOfRail(live: Set<string>) {
  for (const [key, mesh] of planes) {
    mesh.visible = live.has(key)
    // Le survol se perd avec le creneau : le pointeur ne quitte pas une carte
    // que le defilement lui retire, pointerleave ne partirait donc pas.
    if (!mesh.visible) {
      hoverAt.delete(key)
      if (hovered === key) hovered = null
    }
  }
}

/** Liberation reelle, au demontage seulement. */
function disposePlanes() {
  for (const [, mesh] of planes) {
    scene?.remove(mesh)
    mesh.material.dispose()
  }
  planes.clear()
}

/** Chapitre survole, et avancement 0..1 de chaque plane vers son etat de survol. */
let hovered: string | null = null
const hoverAt = new Map<string, number>()
let raf = 0
let lastFrame = 0

const snapHover = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Fait avancer les survols puis redessine. La boucle s'arrete des que tout est
 * arrive : le rail ne tourne pas en continu, il ne s'anime que pendant le
 * fondu du survol.
 */
function step(now: number) {
  const dt = lastFrame ? now - lastFrame : 0
  lastFrame = now
  let moving = false

  for (const [key, at] of hoverAt) {
    const goal = key === hovered ? 1 : 0
    if (at === goal) continue
    const delta = dt / HOVER_MS
    const next = goal > at ? Math.min(goal, at + delta) : Math.max(goal, at - delta)
    hoverAt.set(key, next)
    if (next !== goal) moving = true
  }

  align()
  raf = moving ? requestAnimationFrame(step) : 0
  if (!moving) lastFrame = 0
}

function setHover(key: string | null) {
  hovered = key
  if (key !== null && !hoverAt.has(key)) hoverAt.set(key, 0)

  if (snapHover()) {
    for (const known of hoverAt.keys()) hoverAt.set(known, known === key ? 1 : 0)
    align()
    return
  }
  if (!raf) {
    lastFrame = 0
    raf = requestAnimationFrame(step)
  }
}

/**
 * Aligne chaque plane sur le rect de sa carte DOM. Les positions ne sont jamais
 * recalculees ici : elles sont LUES sur le DOM, qui reste la seule source. Le
 * visuel ne peut donc pas deriver de la zone cliquable qu'il recouvre.
 */
function align() {
  if (!renderer || !scene || !camera) return
  const view = { width: window.innerWidth, height: window.innerHeight }
  const live = new Set<string>()

  for (const slot of slots.value) {
    const card = cards.get(slot.key)
    if (!card) continue
    const key = String(slot.chapterIdx)
    live.add(key)
    const placed = placeOnScreen(card.getBoundingClientRect(), view)
    const mesh = planeFor(key, slot.chapterIdx)
    const lift = applyEase(HOVER_EASE, hoverAt.get(key) ?? 0)
    mesh.position.set(placed.x, placed.y, HOVER_LIFT * lift)
    mesh.scale.set(placed.width, placed.height, 1)
    // Le survol ramene vers la pleine opacite : sur la carte active, deja a 1,
    // seul le rapprochement se voit.
    const base = slot.chapterIdx === active.value ? ACTIVE_OPACITY : IDLE_OPACITY
    mesh.material.opacity = base + (ACTIVE_OPACITY - base) * lift
  }

  hideOutOfRail(live)
  renderer.render(scene, camera)
}

function resize() {
  if (!renderer || !camera) return
  const width = window.innerWidth
  const height = window.innerHeight
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  // Une unite du monde vaut un pixel : c'est cette distance qui le garantit.
  camera.position.z = pixelPerfectZ(height)
  camera.updateProjectionMatrix()
  align()
}

let observer: ResizeObserver | null = null

/**
 * Un tick d'attente avant de lire la ref : dans un composant .client de Nuxt,
 * le DOM n'est pas encore attache au onMounted du composant lui-meme, et la ref
 * y vaut null. Verifie sur ce projet — ImageCardStack.client.vue:45 a la meme
 * garde et son observateur ne s'arme donc jamais.
 */
onMounted(async () => {
  await nextTick()
  const canvas = surface.value
  if (!canvas) return

  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  } catch {
    // Sans contexte, les cartes DOM redeviennent visibles : la page reste entiere.
    failed.value = true
    return
  }
  renderer.setClearAlpha(0)

  scene = new Scene()
  scene.name = 'rail des chapitres'
  camera = new PerspectiveCamera(PIXEL_FOV, 1, 1, 4000)
  camera.name = 'camera alignee au DOM'
  geometry = new PlaneGeometry(1, 1)

  const ambient = new AmbientLight(0xffffff, 2)
  ambient.name = 'ambiante'
  const key = new DirectionalLight(0xffffff, 1.4)
  key.name = 'lumiere principale'
  key.position.set(-0.5, 1, 2)
  scene.add(ambient, key)

  resize()
  observer = new ResizeObserver(resize)
  observer.observe(document.documentElement)

  // Publiee pour l'onglet Rendu 3D de la sonde.
  useGlScene().publish({ renderer, scene, camera, render: () => renderer?.render(scene!, camera!) })
})

// Le rendu suit le defilement : pas de boucle permanente, le rail ne bouge que
// lorsque la page bouge.
watch(
  () => [scrollOffset, gap],
  async () => {
    await nextTick()
    align()
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  hoverAt.clear()
  hovered = null
  observer?.disconnect()
  observer = null
  useGlScene().publish(null)
  disposePlanes()
  geometry?.dispose()
  geometry = null
  renderer?.dispose()
  renderer = null
  scene = null
  camera = null
  cards.clear()
})
</script>

<!--
  Le DOM porte la geometrie et la navigation ; la scene ne fait que s'y aligner.
  Les cartes restent focusables et cliquables, simplement transparentes — sauf
  si WebGL manque, auquel cas elles redeviennent le visuel.
  Racine a un seul noeud : un commentaire en tete ferait un fragment, et la
  classe passee par le parent n'aurait plus ou se poser.
-->
<template>
  <div
    class="scene-wrapper relative h-full"
    :style="{ width: `${RAIL_WIDTH}px` }"
    aria-roledescription="carousel"
  >
    <canvas ref="surface" aria-hidden="true" class="scene-canvas" />

    <NuxtLink
      v-for="slot in slots"
      :key="slot.key"
      :ref="(el) => keepCard(slot.key, (el as { $el?: Element })?.$el ?? (el as Element | null))"
      :to="`/blog/${slot.chapter.slug}`"
      class="absolute top-1/2 left-0 flex items-center justify-center will-change-transform"
      :class="failed ? 'bg-bg-card border border-rule/10' : ''"
      :style="{
        transform: `translateY(calc(-50% + ${slot.y}px))`,
        width: `${chapterSize(slot.chapterIdx).rotated ? chapterSize(slot.chapterIdx).h : chapterSize(slot.chapterIdx).w}px`,
        height: `${chapterSize(slot.chapterIdx).rotated ? chapterSize(slot.chapterIdx).w : chapterSize(slot.chapterIdx).h}px`,
        left: '50%',
        marginLeft: `${-(chapterSize(slot.chapterIdx).rotated ? chapterSize(slot.chapterIdx).h : chapterSize(slot.chapterIdx).w) / 2}px`,
      }"
      :aria-label="`Chapitre ${slot.chapter.num} — ${slot.chapter.fullTitle}`"
      :tabindex="slot.chapterIdx === active ? 0 : -1"
      @pointerenter="setHover(String(slot.chapterIdx))"
      @pointerleave="setHover(null)"
      @focus="setHover(String(slot.chapterIdx))"
      @blur="setHover(null)"
    >
      <span
        class="font-mono uppercase tracking-kicker text-greyed/50 text-[12px]"
        :style="{ opacity: failed ? 1 : 0 }"
      >
        {{ slot.chapter.num }}
      </span>
    </NuxtLink>

    <ul class="sr-only">
      <li v-for="ch in CHAPTERS_MANIFEST" :key="ch.slug">
        {{ ch.num }} · {{ ch.fullTitle }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* Plein viewport et non borne au rail : les coordonnees monde sont celles de
   l'ecran, comme dans PFGOB25. Le masque du rail reste porte par le CSS. */
.scene-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  display: block;
  pointer-events: none;
  z-index: 0;
}

.scene-wrapper {
  overflow: hidden;
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
}
</style>
