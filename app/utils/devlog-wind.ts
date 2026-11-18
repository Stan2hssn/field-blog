import {
  HalfFloatType,
  LinearFilter,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type IUniform,
  type MagnificationTextureFilter,
  type Texture,
  type WebGLRenderer,
} from 'three'

/**
 * Vent du curseur : fluide incompressible 2D (Stam, « Stable Fluids ») pose
 * a plat sur l'ilot, en coordonnees monde pour que la rotation de l'ilot sous
 * un curseur immobile ne souffle rien. Porte du FluidSimulation d'emraude-app,
 * reduit a la vitesse : pas de teinture, pas de flou.
 * Unite de la vitesse : unites monde par seconde.
 */

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const SPLAT = /* glsl */ `
uniform sampler2D uVelocity;
uniform vec2 uPoint;
uniform vec2 uTarget;
uniform float uRadius;
uniform float uExtent;
varying vec2 vUv;
void main() {
  vec2 d = (vUv - uPoint) * uExtent * 2.0;
  float influence = exp(-dot(d, d) / (uRadius * uRadius));
  vec2 v = texture2D(uVelocity, vUv).xy;
  // Vers la vitesse du curseur, sans la depasser : un geste lent ne souffle pas fort.
  gl_FragColor = vec4(mix(v, uTarget, influence * 0.22), 0.0, 1.0);
}
`

const ADVECT = /* glsl */ `
uniform sampler2D uVelocity;
uniform float uDt;
uniform float uExtent;
uniform float uDissipation;
varying vec2 vUv;
void main() {
  vec2 v = texture2D(uVelocity, vUv).xy;
  vec2 back = vUv - uDt * v / (uExtent * 2.0);
  // Bord ouvert : ce qui sort du domaine s'eteint au lieu de rebondir.
  float edge = smoothstep(0.0, 0.06, min(min(vUv.x, vUv.y), min(1.0 - vUv.x, 1.0 - vUv.y)));
  gl_FragColor = vec4(texture2D(uVelocity, back).xy * uDissipation * edge, 0.0, 1.0);
}
`

const DIVERGENCE = /* glsl */ `
uniform sampler2D uVelocity;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
  float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}
`

const PRESSURE = /* glsl */ `
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float div = texture2D(uDivergence, vUv).x;
  gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}
`

const GRADIENT = /* glsl */ `
uniform sampler2D uVelocity;
uniform sampler2D uPressure;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  vec2 v = texture2D(uVelocity, vUv).xy - 0.5 * vec2(R - L, T - B);
  gl_FragColor = vec4(v, 0.0, 1.0);
}
`

// Inertie de l'herbe : la courbure rattrape le vent au lieu de le copier,
// d'ou une prise et un relachement progressifs.
const FOLLOW = /* glsl */ `
uniform sampler2D uVelocity;
uniform sampler2D uBend;
uniform float uFollow;
varying vec2 vUv;
void main() {
  vec2 v = texture2D(uVelocity, vUv).xy;
  vec2 b = texture2D(uBend, vUv).xy;
  gl_FragColor = vec4(mix(b, v, uFollow), 0.0, 1.0);
}
`

const PRESSURE_ITERATIONS = 20
const DISSIPATION_S = 1.6

function target(size: number, filter: MagnificationTextureFilter) {
  return new WebGLRenderTarget(size, size, {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: filter,
    magFilter: filter,
    depthBuffer: false,
    stencilBuffer: false,
  })
}

class PingPong {
  read: WebGLRenderTarget
  write: WebGLRenderTarget
  constructor(size: number, filter: MagnificationTextureFilter) {
    this.read = target(size, filter)
    this.write = target(size, filter)
  }

  swap() {
    const t = this.read
    this.read = this.write
    this.write = t
  }

  dispose() {
    this.read.dispose()
    this.write.dispose()
  }
}

export type WindField = {
  /**
   * Uniformes a partager tels quels avec les shaders lecteurs : la texture
   * change a chaque echange de tampons, l'objet uniforme reste le meme.
   */
  readonly uniforms: { uWindField: IUniform<Texture>, uWindExtent: IUniform<number> }
  /**
   * Avance la simulation. `point` et `velocity` sont en monde (x, z) ;
   * `velocity` nulle quand le curseur ne bouge pas ou a quitte la scene.
   */
  /** `softness` : temps (s) que met l'herbe a rattraper le vent. */
  step: (renderer: WebGLRenderer, dt: number, point: Vector2, velocity: Vector2, radius: number, softness: number) => void
  dispose: () => void
}

export function createWindField(resolution: number): WindField {
  const texel = new Vector2(1 / resolution, 1 / resolution)
  const extent: IUniform<number> = { value: 6 }
  const velocity = new PingPong(resolution, LinearFilter)
  const pressure = new PingPong(resolution, NearestFilter)
  const divergence = target(resolution, NearestFilter)
  const bend = new PingPong(resolution, LinearFilter)
  const field: IUniform<Texture> = { value: bend.read.texture }

  const pass = (fragmentShader: string, uniforms: Record<string, IUniform>) =>
    new ShaderMaterial({ vertexShader: VERTEX, fragmentShader, uniforms, depthTest: false, depthWrite: false })

  const splat = pass(SPLAT, {
    uVelocity: { value: null },
    uPoint: { value: new Vector2() },
    uTarget: { value: new Vector2() },
    uRadius: { value: 1 },
    uExtent: extent,
  })
  const advect = pass(ADVECT, { uVelocity: { value: null }, uDt: { value: 0 }, uExtent: extent, uDissipation: { value: 1 } })
  const div = pass(DIVERGENCE, { uVelocity: { value: null }, uTexel: { value: texel } })
  const press = pass(PRESSURE, { uPressure: { value: null }, uDivergence: { value: divergence.texture }, uTexel: { value: texel } })
  const gradient = pass(GRADIENT, { uVelocity: { value: null }, uPressure: { value: null }, uTexel: { value: texel } })
  const follow = pass(FOLLOW, { uVelocity: { value: null }, uBend: { value: null }, uFollow: { value: 1 } })
  const materials = [splat, advect, div, press, gradient, follow]

  const quad = new Mesh(new PlaneGeometry(2, 2), splat)
  quad.frustumCulled = false
  const scene = new Scene()
  scene.add(quad)
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

  function run(renderer: WebGLRenderer, material: ShaderMaterial, out: WebGLRenderTarget) {
    quad.material = material
    renderer.setRenderTarget(out)
    renderer.render(scene, camera)
  }

  return {
    uniforms: { uWindField: field, uWindExtent: extent },
    step(renderer, dt, point, pointerVelocity, radius, softness) {
      const previous = renderer.getRenderTarget()
      if (pointerVelocity.lengthSq() > 1e-4) {
        splat.uniforms.uVelocity!.value = velocity.read.texture
        ;(splat.uniforms.uPoint!.value as Vector2).set(point.x / (extent.value * 2) + 0.5, point.y / (extent.value * 2) + 0.5)
        ;(splat.uniforms.uTarget!.value as Vector2).copy(pointerVelocity)
        splat.uniforms.uRadius!.value = radius
        run(renderer, splat, velocity.write)
        velocity.swap()
      }

      advect.uniforms.uVelocity!.value = velocity.read.texture
      advect.uniforms.uDt!.value = dt
      advect.uniforms.uDissipation!.value = Math.exp(-dt / DISSIPATION_S)
      run(renderer, advect, velocity.write)
      velocity.swap()

      div.uniforms.uVelocity!.value = velocity.read.texture
      run(renderer, div, divergence)
      for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
        press.uniforms.uPressure!.value = pressure.read.texture
        run(renderer, press, pressure.write)
        pressure.swap()
      }

      gradient.uniforms.uVelocity!.value = velocity.read.texture
      gradient.uniforms.uPressure!.value = pressure.read.texture
      run(renderer, gradient, velocity.write)
      velocity.swap()

      follow.uniforms.uVelocity!.value = velocity.read.texture
      follow.uniforms.uBend!.value = bend.read.texture
      follow.uniforms.uFollow!.value = 1 - Math.exp(-dt / Math.max(0.01, softness))
      run(renderer, follow, bend.write)
      bend.swap()

      field.value = bend.read.texture
      renderer.setRenderTarget(previous)
    },
    dispose() {
      velocity.dispose()
      pressure.dispose()
      divergence.dispose()
      bend.dispose()
      quad.geometry.dispose()
      materials.forEach(m => m.dispose())
    },
  }
}
