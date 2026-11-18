<script setup lang="ts">
import {
  ACESFilmicToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Timer,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { createMeadow, type Meadow } from '~/utils/devlog-meadow'
import { meadowParams } from '~/utils/devlog-meadow.config'
import { DEVLOG_CAMERA_ARTICLES, DEVLOG_CAMERA_SCENE, type DevlogCamera } from '~/utils/timelines'

/**
 * `docked` porte l'etat logique (pointeur, inert, rendu SSR) ; `camera` et
 * `controls` portent le mouvement, lus dans la timeline `devlog-open` de la
 * page. Absents tant que la timeline n'est pas chargee : on retombe alors sur
 * le cadrage final de `docked`.
 */
export interface DevlogIntroMotion {
  grow: number
  blend: number
  spin: number
  from: DevlogCamera
}

const { docked = false, camera: cameraKeys, controls, intro } = defineProps<{
  docked?: boolean
  camera?: DevlogCamera
  controls?: { opacity: number, y: number }
  /** Arrivee (`devlog-intro`) : composee par-dessus le cadrage de `camera`. */
  intro?: DevlogIntroMotion
}>()

const emit = defineEmits<{ ready: [] }>()

const mix = (a: number, b: number, t: number) => a + (b - a) * t

const BASE_SPEED = 0.12
const BOOST = 1.9
const BOOST_DECAY_S = 0.55
const DRAG_RAD_PER_PX = 0.006
const DRAG_FOLLOW_S = 0.09
// Au-dela de ce ratio, le champ vertical se resserre pour garder la largeur
// relative de l'ilot sur les ecrans tres larges.
const FOV_REF_ASPECT = 1.9

const host = useTemplateRef<HTMLDivElement>('host')
const { theme } = useDevlogTheme()
const sliderAngle = ref(0)

let renderer: WebGLRenderer | null = null
let camera: PerspectiveCamera | null = null
let scene: Scene | null = null
let meadow: Meadow | null = null
let timer: Timer | null = null
let raf = 0

let angle = 0.5
let target = 0.5
let velocity = 0
let appliedKey = ''
let reducedMotion = false
let drag: { x: number, start: number, lastX: number, lastT: number, speed: number } | null = null

const TAU = Math.PI * 2
const wrap = (a: number) => ((a % TAU) + TAU) % TAU

function resize() {
  if (!renderer) return
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  appliedKey = ''
  applyCamera()
}

/**
 * Cadrage pilote par la piste `camera` de la timeline : champ, recul, hauteur,
 * point vise et decalage vertical de l'image (fraction de hauteur, negatif =
 * l'ilot descend). Ecrit seulement quand une valeur change.
 */
function applyCamera() {
  if (!renderer || !camera) return
  const base = cameraKeys ?? (docked ? DEVLOG_CAMERA_ARTICLES : DEVLOG_CAMERA_SCENE)
  const t = intro?.blend ?? 1
  const from = intro?.from ?? base
  const keys: DevlogCamera = {
    fov: mix(from.fov, base.fov, t),
    distance: mix(from.distance, base.distance, t),
    height: mix(from.height, base.height, t),
    targetY: mix(from.targetY, base.targetY, t),
    shift: mix(from.shift, base.shift, t),
  }
  const w = window.innerWidth
  const h = window.innerHeight
  const key = `${keys.fov},${keys.distance},${keys.height},${keys.targetY},${keys.shift},${w},${h}`
  if (key === appliedKey) return
  appliedKey = key

  camera.aspect = w / h
  const half = (keys.fov * Math.PI) / 360
  const vHalf = camera.aspect > FOV_REF_ASPECT
    ? Math.atan((Math.tan(half) * FOV_REF_ASPECT) / camera.aspect)
    : half
  camera.fov = (vHalf * 360) / Math.PI
  camera.position.set(0, keys.height, keys.distance)
  camera.lookAt(0, keys.targetY, 0)
  camera.setViewOffset(w, h, 0, keys.shift * h, w, h)
}

function tick() {
  if (!renderer || !camera || !scene || !meadow || !timer) return
  timer.update()
  const dt = Math.min(0.05, timer.getDelta())
  const time = timer.getElapsed()

  if (drag) {
    angle += (target - angle) * (1 - Math.exp(-dt / DRAG_FOLLOW_S))
  }
  else {
    angle += ((reducedMotion ? 0 : BASE_SPEED) + velocity) * dt
    velocity *= Math.exp(-dt / BOOST_DECAY_S)
    target = angle
  }
  meadow.island.rotation.y = angle + (intro?.spin ?? 0)
  meadow.setGrow(intro?.grow ?? 1)
  sliderAngle.value = Math.round((wrap(angle) / TAU) * 359)

  applyCamera()

  meadow.update(reducedMotion ? 0 : time)
  if (!document.hidden) renderer.render(scene, camera)
  raf = requestAnimationFrame(tick)
}

function onPointerDown(e: PointerEvent) {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  drag = { x: e.clientX, start: target, lastX: e.clientX, lastT: performance.now(), speed: 0 }
  velocity = 0
}

function onPointerMove(e: PointerEvent) {
  if (!drag) return
  target = drag.start + (e.clientX - drag.x) * DRAG_RAD_PER_PX
  const now = performance.now()
  const dtMs = Math.max(1, now - drag.lastT)
  const instant = ((e.clientX - drag.lastX) * DRAG_RAD_PER_PX * 1000) / dtMs
  drag.speed = drag.speed * 0.7 + instant * 0.3
  drag.lastX = e.clientX
  drag.lastT = now
}

function onPointerUp() {
  if (!drag) return
  // Inertie au lacher : la vitesse du geste continue puis s'amortit.
  const idle = performance.now() - drag.lastT
  velocity = idle > 90 ? 0 : Math.max(-6, Math.min(6, drag.speed))
  drag = null
}

function onSlider(e: Event) {
  const value = Number((e.target as HTMLInputElement).value)
  const turns = Math.floor(angle / TAU)
  angle = turns * TAU + (value / 359) * TAU
  target = angle
  velocity = 0
}

function turn(dir: 1 | -1) {
  velocity += dir * BOOST
}

watch(theme, value => meadow?.setTheme(value))

// Dans un composant .client, la ref de template n'est pas encore posee a
// onMounted : on initialise des que l'element existe.
watch(host, (el) => {
  if (el && !renderer) init(el)
}, { immediate: true, flush: 'post' })

function init(el: HTMLDivElement) {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const small = window.innerWidth < 768

  renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.setClearColor(0x000000, 0)
  el.appendChild(renderer.domElement)
  renderer.domElement.className = 'block w-full h-full'

  scene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()

  camera = new PerspectiveCamera(40, 1, 0.1, 100)

  meadow = createMeadow({ params: meadowParams(), small, envMap })
  useDevlogMeadow().publish(meadow)
  meadow.setTheme(theme.value)
  meadow.setGrow(intro?.grow ?? 1)
  scene.add(meadow.root)
  void meadow.ready.then(() => emit('ready'))

  timer = new Timer()
  resize()
  window.addEventListener('resize', resize)
  raf = requestAnimationFrame(tick)
}

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
  useDevlogMeadow().publish(null)
  meadow?.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()
  timer?.dispose()
})
</script>

<template>
  <div
    ref="host"
    role="img"
    aria-label="Îlot d'herbe et de sphères en 3D, qui tourne lentement"
    class="fixed inset-0 z-20 select-none touch-pan-y"
    :class="docked ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing'"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  />

  <div
    class="turn-controls fixed left-1/2 bottom-[28px] z-30 -translate-x-1/2 w-[min(680px,calc(100%-32px))] flex flex-col gap-[6px]"
    :class="docked ? 'is-hidden' : ''"
    :style="controls && { opacity: controls.opacity, transform: `translate(-50%, ${controls.y}px)` }"
    :inert="docked"
  >
    <label class="sr-only" for="devlog-turn">Angle de l'îlot</label>
    <input
      id="devlog-turn"
      :value="sliderAngle"
      type="range"
      min="0"
      max="359"
      step="1"
      class="turn-range w-full"
      @input="onSlider"
    >
    <div class="flex items-center justify-between font-sans text-[13px] leading-[20px] text-secondary">
      <span>Glisse pour tourner</span>
      <span class="flex gap-[4px]">
        <button type="button" class="turn-btn" aria-label="Accélérer vers la gauche" @click="turn(-1)">←</button>
        <button type="button" class="turn-btn" aria-label="Accélérer vers la droite" @click="turn(1)">→</button>
      </span>
    </div>
  </div>
</template>

<style scoped>
.turn-controls.is-hidden {
  opacity: 0;
  transform: translate(-50%, 24px);
  pointer-events: none;
}

.turn-range {
  appearance: none;
  height: 12px;
  background: transparent;
  cursor: pointer;
}

.turn-range::-webkit-slider-runnable-track {
  height: 1px;
  background: var(--color-text-greyed);
}

.turn-range::-moz-range-track {
  height: 1px;
  background: var(--color-text-greyed);
}

.turn-range::-webkit-slider-thumb {
  appearance: none;
  width: 5px;
  height: 12px;
  margin-top: -5.5px;
  border-radius: 3px;
  background: var(--color-accent);
}

.turn-range::-moz-range-thumb {
  width: 5px;
  height: 12px;
  border: 0;
  border-radius: 3px;
  background: var(--color-accent);
}

.turn-range:focus-visible {
  outline: 1px solid var(--color-accent);
  outline-offset: 4px;
}

.turn-btn {
  width: 32px;
  height: 32px;
  display: inline-grid;
  place-items: center;
  color: var(--color-text-secondary);
  transition: color var(--dur-fast) var(--ease-out);
}

.turn-btn:hover {
  color: var(--color-text-primary);
}

.turn-btn:focus-visible {
  outline: 1px solid var(--color-accent);
}
</style>
