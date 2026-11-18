<script setup lang="ts">
import {
  ACESFilmicToneMapping,
  CubeCamera,
  HalfFloatType,
  PCFShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Timer,
  Vector2,
  WebGLCubeRenderTarget,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { createMeadow, type Meadow } from '~/utils/devlog-meadow'
import { meadowParams } from '~/utils/devlog-meadow.config'
import { createWindField, type WindField } from '~/utils/devlog-wind'
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
const CUBE_EVERY = 4
// Le reflet tient dans une petite sphere : un cinquieme des touffes suffit.
const CUBE_DETAIL = 0.2
const REFRACT_DETAIL = 0.6

const host = useTemplateRef<HTMLDivElement>('host')
const { theme } = useDevlogTheme()
const sliderAngle = ref(0)

let renderer: WebGLRenderer | null = null
let camera: PerspectiveCamera | null = null
let scene: Scene | null = null
let meadow: Meadow | null = null
let timer: Timer | null = null
let raf = 0
let frame = 0
let cubeTarget: WebGLCubeRenderTarget | null = null
let cubeCamera: CubeCamera | null = null
let refractTarget: WebGLRenderTarget | null = null
let pointer: Vector2 | null = null
let wind: WindField | null = null
const bufferSize = new Vector2()

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
  renderer.getDrawingBufferSize(bufferSize)
  // Demi-resolution : la refraction est floue par nature, la moitie suffit.
  refractTarget?.setSize(Math.ceil(bufferSize.x / 2), Math.ceil(bufferSize.y / 2))
  if (refractTarget) meadow?.optics.setRefraction(refractTarget.texture, bufferSize.x, bufferSize.y)
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

  meadow.setPointer(docked ? null : pointer, camera)
  meadow.update(time, !reducedMotion)
  if (wind && !document.hidden) {
    const { pointerRadius, pointerSoftness } = meadow.params()
    wind.step(renderer, dt, meadow.pointer.point, meadow.pointer.velocity, pointerRadius, pointerSoftness)
  }
  if (!document.hidden) renderFrame()
  raf = requestAnimationFrame(tick)
}

/**
 * Trois passes : le metal reflete une cube map rendue a sa place (une image
 * sur deux), le verre lit la scene rendue sans lui, puis l'image finale.
 * L'ombre n'est calculee qu'une fois par image, a la premiere passe.
 */
function renderFrame() {
  if (!renderer || !camera || !scene || !meadow || !cubeCamera || !refractTarget) return
  const { reflector, refractors, sky } = meadow.optics
  renderer.shadowMap.needsUpdate = true
  for (const m of refractors) m.visible = false

  // L'ilot tourne lentement : un reflet rafraichi a 15 Hz ne se voit pas,
  // et chaque mise a jour coute six rendus plus le filtrage PMREM.
  if (frame++ % CUBE_EVERY === 0) {
    reflector.getWorldPosition(cubeCamera.position)
    cubeCamera.updateMatrixWorld()
    reflector.visible = false
    scene.background = sky
    meadow.optics.setDetail(CUBE_DETAIL)
    cubeCamera.update(renderer, scene)
    scene.background = null
    reflector.visible = true
  }

  meadow.optics.setDetail(REFRACT_DETAIL)
  renderer.setRenderTarget(refractTarget)
  renderer.clear()
  renderer.render(scene, camera)
  renderer.setRenderTarget(null)
  for (const m of refractors) m.visible = true
  meadow.optics.setDetail(1)

  renderer.render(scene, camera)
}

function onPointerDown(e: PointerEvent) {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  drag = { x: e.clientX, start: target, lastX: e.clientX, lastT: performance.now(), speed: 0 }
  velocity = 0
}

function trackPointer(e: PointerEvent) {
  pointer ??= new Vector2()
  pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
}

function onPointerLeave() {
  pointer = null
}

function onPointerMove(e: PointerEvent) {
  if (e.pointerType === 'mouse' || drag) trackPointer(e)
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
  renderer.shadowMap.autoUpdate = false
  renderer.setClearColor(0x000000, 0)
  el.appendChild(renderer.domElement)
  renderer.domElement.className = 'block w-full h-full'

  scene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()

  camera = new PerspectiveCamera(40, 1, 0.1, 100)

  cubeTarget = new WebGLCubeRenderTarget(small ? 128 : 256, { type: HalfFloatType })
  cubeCamera = new CubeCamera(0.05, 40, cubeTarget)
  refractTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType })

  wind = createWindField(small ? 64 : 128)
  meadow = createMeadow({ params: meadowParams(), small, envMap, wind: wind.uniforms })
  meadow.optics.setReflection(cubeTarget.texture)
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
  cubeTarget?.dispose()
  wind?.dispose()
  refractTarget?.dispose()
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
    @pointerleave="onPointerLeave"
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
