import {
  CanvasTexture,
  CircleGeometry,
  Color,
  EquirectangularReflectionMapping,
  SRGBColorSpace,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Quaternion,
  ShadowMaterial,
  ShaderMaterial,
  SphereGeometry,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
  Vector4,
  type BufferGeometry,
  type Camera,
  type IUniform,
  type Texture,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MEADOW_SCATTER_KEYS, type MeadowParams } from './devlog-meadow.config'
import type { WindField } from './devlog-wind'

export type MeadowTheme = 'day' | 'night'

const TUFTS_URL = '/models/grass-tufts.glb'

type SphereSpec = { x: number, z: number, r: number, kind: 'accent' | 'ivory' | 'metal' | 'sage' | 'glass' }

const SPHERES: SphereSpec[] = [
  { x: 0.2, z: 0.1, r: 0.95, kind: 'accent' },
  { x: -2.3, z: 0.6, r: 0.6, kind: 'metal' },
  { x: 2.2, z: -0.6, r: 0.46, kind: 'glass' },
  { x: 1.1, z: 1.9, r: 0.3, kind: 'accent' },
  { x: -1.0, z: -2.1, r: 0.26, kind: 'ivory' },
  { x: 3.1, z: 1.1, r: 0.2, kind: 'sage' },
]

const KIND = { Green: 0, Red: 1, Pale: 2 } as const
type Kind = (typeof KIND)[keyof typeof KIND]

// Sauge saturee pour la masse, touffes terre cuite, pointes paille : la
// palette de la reference, recalee sur l'orange Field.
const PALETTE = {
  day: {
    greenRoot: '#3f5a2e', greenTip: '#c3d394', greenCool: '#86a777', redRoot: '#a8432a', redTip: '#e2693f',
    paleTip: '#e6e2b0', speck: '#fbf6e8', ivory: '#ece4d2', accent: '#e15a33', sage: '#97a77c',
    sky: '#fbf7ee', bounce: '#77895d', sun: '#fff0d8', sunIntensity: 2.2, skyIntensity: 1.35, light: 1,
    paper: '#f8f6f0', glassTint: '#f4fbf6',
  },
  night: {
    greenRoot: '#22301c', greenTip: '#62744f', greenCool: '#3f5547', redRoot: '#4e2219', redTip: '#9c4630',
    paleTip: '#80825f', speck: '#b9b6a8', ivory: '#a49d8f', accent: '#c9532f', sage: '#5c6a4c',
    sky: '#7c88a8', bounce: '#283222', sun: '#c8d2ff', sunIntensity: 0.85, skyIntensity: 0.6, light: 0.78,
    paper: '#141416', glassTint: '#dfe6ee',
  },
} as const

export function islandRadius(angle: number) {
  return 4.4 + 0.45 * Math.sin(3 * angle + 0.8) + 0.3 * Math.sin(7 * angle + 1.3) + 0.12 * Math.sin(17 * angle)
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Commun a l'herbe et aux fleurs : pousse, vent et curseur sont evalues au
// pied de chaque instance, dans le repere de l'ilot.
const FIELD_CHUNK = /* glsl */ `
uniform float uTime;
uniform float uGrow;
uniform float uWind;
uniform sampler2D uWindField;
uniform float uWindExtent;
uniform float uWindBend;

float growAt(vec2 xz) {
  float g = clamp(uGrow * 1.45 - length(xz) / 4.6 * 0.45, 0.0, 1.0);
  return 1.0 - pow(1.0 - g, 3.0);
}

float gustAt(vec2 xz, float rnd) {
  float phase = dot(xz, vec2(0.7, 0.45)) + rnd * 6.2831;
  return sin(uTime * 1.1 + phase) * 0.6 + sin(uTime * 2.3 + phase * 1.6) * 0.2;
}

// Vent du curseur : la vitesse du fluide (monde) est lue au pied de
// l'instance puis ramenee dans le repere de l'ilot. Saturee en douceur pour
// qu'un geste brusque couche l'herbe sans la retourner.
vec2 windAt(vec3 local) {
  vec3 w = (modelMatrix * vec4(local, 1.0)).xyz;
  vec2 v = texture2D(uWindField, w.xz / (uWindExtent * 2.0) + 0.5).xy;
  vec3 l = transpose(mat3(modelMatrix)) * vec3(v.x, 0.0, v.y);
  l /= dot(modelMatrix[0].xyz, modelMatrix[0].xyz);
  vec2 b = l.xz * uWindBend;
  return b / sqrt(1.0 + dot(b, b));
}
`

// Touffes en geometrie (`__tuft_clump`), teintees et ventees en shader.
const CLUMP_VERTEX = /* glsl */ `
attribute vec3 aOffset;
attribute vec4 aShape; // lacet, echelle, largeur, aleatoire
attribute vec2 aStyle; // famille, eclat
${FIELD_CHUNK}
uniform float uModelHeight;
uniform float uHeightScale;
uniform float uWidthScale;
uniform vec4 uSpheres[${SPHERES.length}];
varying float vHeight;
varying float vRandom;
varying float vKind;
varying float vBright;
varying float vShade;
varying vec3 vNormalW;

void main() {
  vec3 p = position;
  float hn = clamp(p.y / uModelHeight, 0.0, 1.0);

  // Houle : prise quadratique, le pied reste ancre et la cime porte tout.
  float gust = gustAt(aOffset.xz, aShape.w);
  p.x += gust * hn * hn * uModelHeight * 0.12 * uWind;
  p.z += gust * hn * hn * uModelHeight * 0.05 * uWind;

  float c = cos(aShape.x), s = sin(aShape.x);
  vec3 r = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c) * aShape.y;
  // Pousse d'arrivee : le centre sort de terre d'abord, le bord suit.
  float g = growAt(aOffset.xz);
  r.y *= g;
  // A pousse nulle la touffe disparait entierement, sinon elle resterait
  // visible au sol en etoile plate.
  r.xz *= mix(0.35, 1.0, g) * smoothstep(0.0, 0.08, g) * aShape.z * uWidthScale;
  r.y *= uHeightScale;
  vec3 world = r + aOffset;
  float tip = uModelHeight * aShape.y * uHeightScale * g;
  vec2 push = windAt(aOffset);
  push *= 1.0 + 0.12 * sin(uTime * 5.0 + aShape.w * 6.2831) * min(1.0, length(push) * 2.0);
  push *= hn * hn;
  world.xz += push * tip * 0.9;
  world.y -= length(push) * tip * 0.35;
  vNormalW = vec3(normal.x * c - normal.z * s, normal.y, normal.x * s + normal.z * c);

  float occ = 0.0;
  for (int i = 0; i < ${SPHERES.length}; i++) {
    vec4 sp = uSpheres[i];
    float d = length(aOffset.xz - sp.xz) / (sp.w * 1.4);
    occ = max(occ, (1.0 - smoothstep(0.6, 1.0, d)) * 0.3);
  }

  vHeight = hn;
  vRandom = aShape.w;
  vKind = aStyle.x;
  vBright = aStyle.y;
  vShade = 1.0 - occ * (1.0 - hn * 0.6);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
}
`

const CLUMP_FRAGMENT = /* glsl */ `
uniform vec3 uGreenRoot;
uniform vec3 uGreenTip;
uniform vec3 uGreenCool;
uniform vec3 uRedRoot;
uniform vec3 uRedTip;
uniform vec3 uPaleTip;
uniform float uLight;
varying float vHeight;
varying float vRandom;
varying float vKind;
varying float vBright;
varying float vShade;
varying vec3 vNormalW;

const vec3 LIGHT_DIR = normalize(vec3(-0.5, 0.8, 0.35));

void main() {
  float t = smoothstep(0.0, 0.85, vHeight);
  vec3 tip = mix(uGreenCool, uGreenTip, vBright);
  vec3 green = mix(uGreenRoot, tip, t);
  vec3 red = mix(uRedRoot, uRedTip, smoothstep(0.0, 0.8, vHeight));
  vec3 pale = mix(uGreenRoot, uPaleTip, t);
  vec3 col = vKind < 0.5 ? green : (vKind < 1.5 ? red : pale);
  // Deux faces : l'eclairage peint prend la valeur absolue.
  float lit = abs(dot(normalize(vNormalW), LIGHT_DIR));
  col *= 0.62 + lit * 0.5;
  col *= 0.92 + vRandom * 0.14;
  col *= vShade * uLight;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`

// Fleurs : chaque instance grandit autour de son propre centre, a la cime de
// l'herbe qui pousse, et suit le meme vent et le meme curseur que les touffes.
const SPECK_PROJECT = /* glsl */ `
vec3 inst = instanceMatrix[3].xyz;
float sg = growAt(inst.xz);
float bloom = smoothstep(0.55, 1.0, sg);
vec3 p = vec3(inst.x, inst.y * sg, inst.z) + mat3(instanceMatrix) * transformed * bloom;
float rnd = fract(sin(dot(inst.xz, vec2(12.9898, 78.233))) * 43758.5453);
p.x += gustAt(inst.xz, rnd) * inst.y * 0.12 * uWind;
vec2 push = windAt(vec3(inst.x, 0.0, inst.z));
p.xz += push * inst.y * 0.9;
p.y -= length(push) * inst.y * 0.35;
vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
gl_Position = projectionMatrix * mvPosition;
`

// Argile : bosses de modelage en bruit 3D, calculees dans le repere de l'objet
// pour rester collees a la sphere quand l'ilot tourne.
const CLAY_NOISE = /* glsl */ `
uniform float uClayBump;
uniform float uClayScale;
uniform mat3 normalMatrix;
varying vec3 vObjPos;

float clayHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float clayNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(clayHash(i), clayHash(i + vec3(1, 0, 0)), f.x),
                 mix(clayHash(i + vec3(0, 1, 0)), clayHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(clayHash(i + vec3(0, 0, 1)), clayHash(i + vec3(1, 0, 1)), f.x),
                 mix(clayHash(i + vec3(0, 1, 1)), clayHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

float clayField(vec3 p) {
  return clayNoise(p) * 0.6 + clayNoise(p * 2.3 + 7.1) * 0.28 + clayNoise(p * 6.1 + 3.7) * 0.12;
}
`

const CLAY_PERTURB = /* glsl */ `
{
  vec3 q = vObjPos * uClayScale;
  float e = 0.04;
  float c0 = clayField(q);
  vec3 grad = vec3(clayField(q + vec3(e, 0, 0)) - c0, clayField(q + vec3(0, e, 0)) - c0, clayField(q + vec3(0, 0, e)) - c0) / e;
  vec3 nObj = normalize(vObjPos);
  grad -= dot(grad, nObj) * nObj;
  normal = normalize(normal - normalMatrix * grad * uClayBump * 0.12);
  roughnessFactor = clamp(roughnessFactor + (c0 - 0.5) * 0.25, 0.0, 1.0);
}
`

// Verre : la scene sans le verre est rendue dans une texture, puis lue a
// travers le vecteur refracte, une fois par canal pour la dispersion
// (methode de Maxime Heckel, « Refraction, dispersion and other shader light effects »).
const GLASS_VERTEX = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vEye;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vEye = normalize(world.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const GLASS_FRAGMENT = /* glsl */ `
uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uRefract;
uniform float uDispersion;
uniform vec3 uTint;
uniform float uLight;
varying vec3 vNormalW;
varying vec3 vEye;

const int LOOP = 12;
const vec3 LIGHT_DIR = normalize(vec3(-0.5, 0.8, 0.35));

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec3 n = normalize(vNormalW);
  vec3 rR = refract(vEye, n, 1.0 / 1.15);
  vec3 rG = refract(vEye, n, 1.0 / 1.18);
  vec3 rB = refract(vEye, n, 1.0 / 1.22);
  vec4 acc = vec4(0.0);
  for (int i = 0; i < LOOP; i++) {
    float slide = float(i) / float(LOOP) * 0.1 * uDispersion;
    vec4 g = texture2D(uScene, uv + rG.xy * (uRefract + slide * 2.0));
    acc.r += texture2D(uScene, uv + rR.xy * (uRefract + slide)).r;
    acc.g += g.g;
    acc.b += texture2D(uScene, uv + rB.xy * (uRefract + slide * 3.0)).b;
    acc.a += g.a;
  }
  acc /= float(LOOP);

  float facing = max(0.0, dot(-vEye, n));
  float fresnel = pow(1.0 - facing, 3.0);
  float spec = pow(max(0.0, dot(reflect(-LIGHT_DIR, n), -vEye)), 80.0);
  float rim = fresnel * 0.55 + spec * 1.4;
  // Texture premultipliee : la couleur garde le fond transparent de la page.
  vec3 col = acc.rgb * uTint + vec3(rim) * uLight;
  float alpha = clamp(acc.a + rim, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

type Placement = { x: number, z: number, yaw: number, height: number, width: number, kind: Kind, bright: number, rand: number }
type PlacedSphere = SphereSpec & { scale: number }

// Bruit basse frequence : les couleurs se regroupent en plaques, comme des
// touches de peinture, au lieu d'un semis uniforme qui grise la masse.
function patch(x: number, z: number, seed: number) {
  return (Math.sin(x * 0.9 + seed) * Math.cos(z * 1.1 - seed * 0.7)
    + Math.sin((x + z) * 1.7 + seed * 2.3) * 0.5) / 1.5
}

function sphereScale(spec: SphereSpec, params: MeadowParams) {
  const own = spec.kind === 'metal' ? params.metalSphere : spec.r >= 0.9 ? params.mainSphere : params.smallSpheres
  return params.sphereScale * own
}

// Tapis dense jusqu'au contour, sans touffes isolees au-dela : la masse se
// lit comme un ilot. Les hauteurs restent proches avec quelques touffes hautes,
// et rien dans l'emprise des spheres pour qu'elles restent posees DANS l'herbe.
function scatterTufts(count: number, params: MeadowParams, spheres: PlacedSphere[]): Placement[] {
  const rand = mulberry32(11)
  const redCut = 1 - params.redAmount
  const paleCut = 1 - params.paleAmount
  const out: Placement[] = []
  let guard = 0
  while (out.length < count && guard++ < count * 20) {
    const a = rand() * Math.PI * 2
    const edge = islandRadius(a) * params.grassRadius
    const r = Math.sqrt(rand()) * edge
    const toEdge = r / edge
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r * 0.92
    if (spheres.some(sp => Math.hypot(x - sp.x, z - sp.z) < sp.r * sp.scale * 0.9)) continue
    const red = patch(x, z, 1.3) > redCut ? rand() < 0.7 : rand() < params.redAmount * 0.05
    const pale = !red && (patch(x, z, 4.1) > paleCut ? rand() < 0.5 : rand() < params.paleAmount * 0.06)
    const kind = red ? KIND.Red : pale ? KIND.Pale : KIND.Green
    const tall = rand() < params.tallChance ? params.tallBoost * (1 + rand()) : 0
    const radial = Math.pow(smoothstep(params.radialStart, 1, toEdge), params.radialPower)
    const height = (0.42 + rand() * params.heightVariance + tall) * lerp(params.centerHeight, params.edgeHeight, radial)
    const width = lerp(params.centerWidth, params.edgeWidth, radial)
    const bright = Math.min(1, Math.max(0, 0.5 + patch(x, z, 7.7) * 0.6 + (rand() - 0.5) * 0.3))
    out.push({ x, z, yaw: rand() * Math.PI * 2, height, width, kind, bright, rand: rand() })
  }
  return out
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function smoothstep(a: number, b: number, v: number) {
  if (b <= a) return v >= b ? 1 : 0
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function modelHeight(geometry: BufferGeometry) {
  if (!geometry.boundingBox) geometry.computeBoundingBox()
  return Math.max(1e-3, geometry.boundingBox!.max.y)
}

/**
 * Passes que la scene doit preparer avant chaque image : le rendu se fait dans
 * le module de rendu, le meadow ne fait que designer les cibles.
 */
export type MeadowOptics = {
  /** Sphere qui reflete son entourage (cube map rendue sur place). */
  reflector: Mesh
  /** Spheres a cacher pendant le rendu de la texture de refraction. */
  refractors: Mesh[]
  setReflection: (texture: Texture) => void
  /**
   * Part des touffes dessinees, de 0 a 1. Le semis est aleatoire, donc un
   * prefixe est un sous-echantillon uniforme : les passes secondaires (reflet,
   * refraction) n'ont pas besoin de toute la densite.
   */
  setDetail: (fraction: number) => void
  setRefraction: (texture: Texture, width: number, height: number) => void
  /** Fond de la cube map : sans horizon, le metal ne reflete qu'un aplat. */
  sky: Texture
}

export type Meadow = {
  root: Group
  island: Group
  optics: MeadowOptics
  ready: Promise<void>
  setGrow: (value: number) => void
  /** Applique des reglages a chaud ; re-seme seulement si la repartition change. */
  configure: (params: MeadowParams) => void
  params: () => Readonly<MeadowParams>
  /** `animate` a faux fige le vent (mouvement reduit) sans figer le curseur. */
  update: (time: number, animate: boolean) => void
  /** Position du curseur en NDC, ou null quand il quitte la scene. */
  setPointer: (ndc: Vector2 | null, camera: Camera) => void
  /** Curseur en monde (x, z) et sa vitesse, qui alimentent le vent. */
  pointer: { readonly point: Vector2, readonly velocity: Vector2 }
  setTheme: (theme: MeadowTheme) => void
  dispose: () => void
}

export function createMeadow(options: {
  params: MeadowParams
  small: boolean
  envMap: Texture | null
  wind: WindField['uniforms']
}): Meadow {
  const root = new Group()
  const island = new Group()
  root.add(island)

  let params = { ...options.params }
  let currentTheme: MeadowTheme = 'day'
  let disposed = false
  let grow = 1
  const disposables: { dispose: () => void }[] = []

  // Sol invisible : il ne garde que l'ombre portee des spheres.
  const ground = new Mesh(new CircleGeometry(1, 96), new ShadowMaterial({ opacity: 0.18 }))
  const gp = ground.geometry.attributes.position!
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), y = gp.getY(i)
    if (x === 0 && y === 0) continue
    const k = islandRadius(Math.atan2(y, x)) * 0.72
    gp.setXY(i, x * k, y * k * 0.92)
  }
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  island.add(ground)
  disposables.push(ground.geometry, ground.material as ShadowMaterial)

  const clayUniforms: Record<string, IUniform> = {
    uClayBump: { value: params.clayBump },
    uClayScale: { value: params.clayScale },
  }
  const clay = (roughness: number) => {
    const material = new MeshStandardMaterial({ roughness })
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, clayUniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${CLAY_NOISE}`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${CLAY_PERTURB}`)
    }
    material.customProgramCacheKey = () => 'devlog-clay'
    return material
  }

  const skyCanvas = document.createElement('canvas')
  skyCanvas.width = 4
  skyCanvas.height = 128
  const sky = new CanvasTexture(skyCanvas)
  sky.mapping = EquirectangularReflectionMapping
  sky.colorSpace = SRGBColorSpace

  function paintSky(p: (typeof PALETTE)[MeadowTheme]) {
    const ctx = skyCanvas.getContext('2d')!
    const paper = new Color(p.paper)
    const horizon = paper.clone().lerp(new Color(p.bounce), 0.35).multiplyScalar(0.82)
    const g = ctx.createLinearGradient(0, 0, 0, 128)
    g.addColorStop(0, `#${paper.getHexString()}`)
    g.addColorStop(0.4, `#${paper.clone().multiplyScalar(0.94).getHexString()}`)
    g.addColorStop(0.5, `#${horizon.getHexString()}`)
    g.addColorStop(0.56, `#${new Color(p.bounce).multiplyScalar(0.7).getHexString()}`)
    g.addColorStop(1, `#${new Color(p.greenRoot).getHexString()}`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 4, 128)
    sky.needsUpdate = true
  }
  const glassUniforms: Record<string, IUniform> = {
    uScene: { value: null },
    uResolution: { value: new Vector2(1, 1) },
    uRefract: { value: params.glassRefraction },
    uDispersion: { value: params.glassDispersion },
    uTint: { value: new Color() },
    uLight: { value: 1 },
  }
  const sphereMaterials = {
    accent: clay(0.82),
    ivory: clay(0.88),
    sage: clay(0.85),
    metal: new MeshStandardMaterial({ metalness: 1, roughness: params.metalRoughness, envMap: options.envMap }),
    glass: new ShaderMaterial({
      vertexShader: GLASS_VERTEX,
      fragmentShader: GLASS_FRAGMENT,
      uniforms: glassUniforms,
      transparent: true,
      premultipliedAlpha: true,
    }),
  }
  const sphereGeo = new SphereGeometry(1, 64, 48)
  const sphereMeshes: Mesh[] = []
  for (const s of SPHERES) {
    const m = new Mesh(sphereGeo, sphereMaterials[s.kind])
    sphereMeshes.push(m)
    m.position.set(s.x, 0, s.z)
    m.castShadow = s.kind !== 'glass'
    island.add(m)
  }
  disposables.push(sphereGeo, sky, ...Object.values(sphereMaterials))

  const optics: MeadowOptics = {
    reflector: sphereMeshes[SPHERES.findIndex(s => s.kind === 'metal')]!,
    refractors: sphereMeshes.filter((_, i) => SPHERES[i]!.kind === 'glass'),
    setReflection(texture) {
      if (sphereMaterials.metal.envMap === texture) return
      sphereMaterials.metal.envMap = texture
      sphereMaterials.metal.needsUpdate = true
    },
    setDetail(fraction) {
      if (clumpMesh) clumpMesh.geometry.instanceCount = Math.max(1, Math.round(clumpCount * fraction))
      if (specksMesh) specksMesh.count = Math.round(speckCount * fraction)
    },
    setRefraction(texture, width, height) {
      glassUniforms.uScene!.value = texture
      ;(glassUniforms.uResolution!.value as Vector2).set(width, height)
    },
    sky,
  }

  const uniforms: Record<string, IUniform> = {
    uTime: { value: 0 },
    uModelHeight: { value: 1 },
    uGrow: { value: 1 },
    uWind: { value: 1 },
    uHeightScale: { value: 1 },
    uWidthScale: { value: 1 },
    uSpheres: { value: SPHERES.map(s => new Vector4(s.x, s.r, s.z, s.r)) },
    uWindField: options.wind.uWindField,
    uWindExtent: options.wind.uWindExtent,
    uWindBend: { value: 0.18 },
    uGreenRoot: { value: new Color() },
    uGreenTip: { value: new Color() },
    uGreenCool: { value: new Color() },
    uRedRoot: { value: new Color() },
    uRedTip: { value: new Color() },
    uPaleTip: { value: new Color() },
    uLight: { value: 1 },
  }

  const clumpMaterial = new ShaderMaterial({
    vertexShader: CLUMP_VERTEX,
    fragmentShader: CLUMP_FRAGMENT,
    uniforms,
    side: DoubleSide,
  })
  const speckGeo = new IcosahedronGeometry(0.035, 0)
  const specksMaterial = new MeshLambertMaterial({ emissive: new Color('#ffffff'), emissiveIntensity: 0.35 })
  specksMaterial.onBeforeCompile = (shader) => {
    for (const key of ['uTime', 'uGrow', 'uWind', 'uWindField', 'uWindExtent', 'uWindBend']) shader.uniforms[key] = uniforms[key]!
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${FIELD_CHUNK}`)
      .replace('#include <project_vertex>', SPECK_PROJECT)
  }
  specksMaterial.customProgramCacheKey = () => 'devlog-specks'
  disposables.push(clumpMaterial, speckGeo, specksMaterial)

  // Ce qui est re-seme a chaque changement de repartition.
  let clumpSource: BufferGeometry | null = null
  let clumpMesh: Mesh<InstancedBufferGeometry, ShaderMaterial> | null = null
  let specksMesh: InstancedMesh | null = null
  let clumpCount = 0
  let speckCount = 0

  const hemi = new HemisphereLight()
  root.add(hemi)
  const sun = new DirectionalLight()
  sun.position.set(-4, 7, 3)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -5
  sun.shadow.camera.right = 5
  sun.shadow.camera.top = 5
  sun.shadow.camera.bottom = -5
  sun.shadow.bias = -0.0005
  root.add(sun)

  function placedSpheres(): PlacedSphere[] {
    return SPHERES.map(s => ({ ...s, scale: sphereScale(s, params) }))
  }

  function buildClumps(geometry: BufferGeometry, placements: Placement[]) {
    const h = modelHeight(geometry)
    uniforms.uModelHeight!.value = h
    const geo = new InstancedBufferGeometry()
    geo.index = geometry.index
    geo.setAttribute('position', geometry.attributes.position!)
    geo.setAttribute('normal', geometry.attributes.normal!)
    const offsets = new Float32Array(placements.length * 3)
    const shapes = new Float32Array(placements.length * 4)
    const styles = new Float32Array(placements.length * 2)
    placements.forEach((p, i) => {
      offsets.set([p.x, 0, p.z], i * 3)
      shapes.set([p.yaw, p.height / h, p.width, p.rand], i * 4)
      styles.set([p.kind, p.bright], i * 2)
    })
    geo.setAttribute('aOffset', new InstancedBufferAttribute(offsets, 3))
    geo.setAttribute('aShape', new InstancedBufferAttribute(shapes, 4))
    geo.setAttribute('aStyle', new InstancedBufferAttribute(styles, 2))
    geo.instanceCount = placements.length
    clumpCount = placements.length
    const mesh = new Mesh(geo, clumpMaterial)
    mesh.frustumCulled = false
    island.add(mesh)
    clumpMesh = mesh
  }

  // Petites fleurs blanches au-dessus du tapis : les points clairs de la
  // reference. Les cartes `__tuft_dandelion` du GLB, feuillage sombre, salissaient
  // la masse : on ne les instancie plus.
  function buildSpecks(placements: Placement[]) {
    const mesh = new InstancedMesh(speckGeo, specksMaterial, Math.max(1, placements.length))
    mesh.count = placements.length
    speckCount = placements.length
    const m = new Matrix4()
    const q = new Quaternion()
    const pos = new Vector3()
    const scl = new Vector3()
    placements.forEach((p, i) => {
      pos.set(p.x, p.height * 0.95 * params.grassHeight, p.z)
      scl.setScalar((0.7 + p.rand * 0.6) * params.speckSize)
      mesh.setMatrixAt(i, m.compose(pos, q, scl))
    })
    mesh.instanceMatrix.needsUpdate = true
    island.add(mesh)
    specksMesh = mesh
  }

  function clearScatter() {
    if (clumpMesh) {
      island.remove(clumpMesh)
      clumpMesh.geometry.dispose()
      clumpMesh = null
    }
    if (specksMesh) {
      island.remove(specksMesh)
      specksMesh.dispose()
      specksMesh = null
    }
  }

  function scatter() {
    if (!clumpSource) return
    clearScatter()
    const count = Math.round(params.tuftCount / (options.small ? 3 : 1))
    const tufts = scatterTufts(count, params, placedSpheres())
    buildClumps(clumpSource, tufts)
    const every = params.speckDensity > 0 ? Math.max(1, Math.round(1 / params.speckDensity)) : 0
    buildSpecks(every ? tufts.filter((_, i) => i % every === 0) : [])
    setGrow(grow)
  }

  const ready = new GLTFLoader().loadAsync(TUFTS_URL).then((gltf) => {
    if (disposed) return
    gltf.scene.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      if (mesh.name === '__tuft_clump') clumpSource = mesh.geometry
      disposables.push(mesh.geometry)
    })
    scatter()
    setTheme(currentTheme)
  }).catch((error: unknown) => {
    console.warn('[meadow] touffes non chargees', error)
  })

  // Les spheres tombent l'une apres l'autre, avec un leger rebond.
  function setGrow(value: number) {
    grow = value
    uniforms.uGrow!.value = value
    const spheres = placedSpheres()
    sphereMeshes.forEach((mesh, i) => {
      const t = Math.min(1, Math.max(0, value * 1.6 - 0.25 - i * 0.07))
      const back = 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2
      const spec = spheres[i]!
      const r = spec.r * spec.scale
      mesh.scale.setScalar(Math.max(1e-3, r * back))
      mesh.position.y = r * params.sphereSink * back
    })
    if (specksMesh) specksMesh.visible = value > 0.05
  }

  function applyLive() {
    island.scale.setScalar(params.islandScale)
    uniforms.uWind!.value = params.wind
    uniforms.uHeightScale!.value = params.grassHeight
    uniforms.uWidthScale!.value = params.grassWidth
    clayUniforms.uClayBump!.value = params.clayBump
    clayUniforms.uClayScale!.value = params.clayScale
    sphereMaterials.metal.roughness = params.metalRoughness
    glassUniforms.uRefract!.value = params.glassRefraction
    glassUniforms.uDispersion!.value = params.glassDispersion
    uniforms.uWindBend!.value = params.pointerStrength * 0.09
    // Le domaine du vent couvre l'ilot et une marge d'un rayon de curseur.
    options.wind.uWindExtent.value = (4.4 + 0.9) * params.grassRadius * params.islandScale + params.pointerRadius
    ;(uniforms.uSpheres!.value as Vector4[]).forEach((v, i) => {
      const s = SPHERES[i]!
      const r = s.r * sphereScale(s, params)
      v.set(s.x, r, s.z, r)
    })
    const k = params.grassRadius
    ground.scale.set(k, k, 1)
    setGrow(grow)
  }

  function configure(next: MeadowParams) {
    const prev = params
    params = { ...next }
    applyLive()
    const rescatter = MEADOW_SCATTER_KEYS.some(key => prev[key] !== params[key])
      || prev.speckSize !== params.speckSize || prev.grassHeight !== params.grassHeight
    if (rescatter) scatter()
  }

  function setTheme(theme: MeadowTheme) {
    currentTheme = theme
    const p = PALETTE[theme]
    sphereMaterials.accent.color.set(p.accent)
    sphereMaterials.ivory.color.set(p.ivory)
    sphereMaterials.sage.color.set(p.sage)
    ;(uniforms.uGreenRoot!.value as Color).set(p.greenRoot)
    ;(uniforms.uGreenTip!.value as Color).set(p.greenTip)
    ;(uniforms.uGreenCool!.value as Color).set(p.greenCool)
    ;(uniforms.uRedRoot!.value as Color).set(p.redRoot)
    ;(uniforms.uRedTip!.value as Color).set(p.redTip)
    ;(uniforms.uPaleTip!.value as Color).set(p.paleTip)
    uniforms.uLight!.value = p.light
    specksMaterial.color.set(p.speck)
    specksMaterial.emissive.set(p.speck)
    hemi.color.set(p.sky)
    hemi.groundColor.set(p.bounce)
    hemi.intensity = p.skyIntensity
    sun.color.set(p.sun)
    sun.intensity = p.sunIntensity
    paintSky(p)
    ;(glassUniforms.uTint!.value as Color).set(p.glassTint)
    glassUniforms.uLight!.value = p.light
  }

  // Le curseur est projete sur le plan des cimes, en monde : le vent ne doit
  // naitre que d'un geste, pas de l'ilot qui tourne sous un curseur immobile.
  const raycaster = new Raycaster()
  const tipPlane = new Plane(new Vector3(0, 1, 0), -0.15)
  const hit = new Vector3()
  const pointer = { point: new Vector2(), velocity: new Vector2() }
  let hasPrevious = false
  let pointerActive = false
  let lastTime = 0

  function setPointer(ndc: Vector2 | null, camera: Camera) {
    pointerActive = false
    if (!ndc) return
    raycaster.setFromCamera(ndc, camera)
    if (!raycaster.ray.intersectPlane(tipPlane, hit)) return
    pointerActive = true
  }

  function followPointer(time: number) {
    const dt = Math.max(1e-3, Math.min(0.05, time - lastTime))
    lastTime = time
    if (!pointerActive) {
      hasPrevious = false
      pointer.velocity.set(0, 0)
      return
    }
    const vx = hasPrevious ? (hit.x - pointer.point.x) / dt : 0
    const vz = hasPrevious ? (hit.z - pointer.point.y) / dt : 0
    // Vitesse lissee : un tressautement de souris ne doit pas claquer dans l'herbe.
    const k = 1 - Math.exp(-dt / 0.08)
    pointer.velocity.set(pointer.velocity.x + (vx - pointer.velocity.x) * k, pointer.velocity.y + (vz - pointer.velocity.y) * k)
    pointer.point.set(hit.x, hit.z)
    hasPrevious = true
  }

  applyLive()

  return {
    root,
    island,
    optics,
    ready,
    setGrow,
    configure,
    params: () => params,
    update(time, animate) {
      uniforms.uTime!.value = animate ? time : 0
      followPointer(time)
    },
    setPointer,
    pointer,
    setTheme,
    dispose() {
      disposed = true
      clearScatter()
      disposables.forEach(d => d.dispose())
    },
  }
}
