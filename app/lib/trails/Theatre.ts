import type { Keyframe, MarkerOpts, Tickable, TrailObjectApi, Track, TrailState, TweenOpts } from './Trails.interface'
import { applyEase } from './easing'
import { sampleTrack } from './sampleTrack'
import { Ticker } from './Ticker'
import { TrailObject } from './TrailObject'
import * as mut from './mutations'

const DEFAULT_TWEEN_DURATION = 0.8
const DEFAULT_TWEEN_EASE = 'inOutCubic'

interface Tween {
  from: number
  to: number
  elapsed: number
  duration: number
  ease: string
  marker?: string
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

export class Theatre implements Tickable {
  readonly id: string

  private state: TrailState
  private readonly defaults = new Map<string, Record<string, number>>()
  private readonly warned = new Set<string>()
  private readonly markerCbs = new Map<string, Set<() => void>>()
  private readonly readers = new Set<() => void>()

  private _duration: number
  private _playhead = 0
  private _playing = false
  private tween: Tween | null = null
  private lastTime = -1
  private ticker: Ticker | null = null

  constructor(state: TrailState, id = '') {
    this.state = state
    this.id = id
    this._duration = Math.max(0, state.duration)
  }

  get duration(): number {
    return this._duration
  }

  get playhead(): number {
    return this._playhead
  }

  get playing(): boolean {
    return this._playing
  }

  // --- subscribe (cœur) : un objet déclare ses props et récupère un handle d'application ---

  subscribe(id: string, defaults: Record<string, number>): TrailObjectApi {
    this.defaults.set(id, { ...defaults })
    return new TrailObject(this, id)
  }

  // Enregistrement bas niveau (sans handle) — utilisé en interne / compat.
  object(id: string, defaults: Record<string, number>): void {
    this.defaults.set(id, { ...defaults })
  }

  get(id: string): Readonly<Record<string, number>> {
    const defs = this.defaults.get(id)
    const tracks = this.state.objects?.[id]
    if (!defs && !tracks) {
      if (!this.warned.has(id)) {
        this.warned.add(id)
        console.warn(`[trails] get('${id}') : objet non abonné et absent du state`)
      }
      return {}
    }
    const out: Record<string, number> = defs ? { ...defs } : {}
    if (tracks) {
      for (const prop in tracks) {
        const track = tracks[prop]
        if (track && track.length) out[prop] = sampleTrack(track, this._playhead)
      }
    }
    return out
  }

  // --- déclaration façon GSAP (brouillon, overridé par load() si JSON présent) ---

  to(id: string, vars: Record<string, number>, opts: TweenOpts = {}): this {
    const at = opts.at ?? 0
    const duration = opts.duration ?? 1
    const ease = opts.ease ?? 'linear'
    for (const prop in vars) {
      this.putKeyframe(id, prop, { t: at, v: this.sampleAt(id, prop, at), e: ease })
      this.putKeyframe(id, prop, { t: at + duration, v: vars[prop]! })
    }
    this.growDuration(at + duration)
    return this
  }

  from(id: string, vars: Record<string, number>, opts: TweenOpts = {}): this {
    const at = opts.at ?? 0
    const duration = opts.duration ?? 1
    const ease = opts.ease ?? 'linear'
    for (const prop in vars) {
      const target = this.sampleAt(id, prop, at + duration)
      this.putKeyframe(id, prop, { t: at, v: vars[prop]!, e: ease })
      this.putKeyframe(id, prop, { t: at + duration, v: target })
    }
    this.growDuration(at + duration)
    return this
  }

  fromTo(
    id: string,
    fromVars: Record<string, number>,
    toVars: Record<string, number>,
    opts: TweenOpts = {},
  ): this {
    const at = opts.at ?? 0
    const duration = opts.duration ?? 1
    const ease = opts.ease ?? 'linear'
    for (const prop in toVars) {
      const start = fromVars[prop] ?? this.sampleAt(id, prop, at)
      this.putKeyframe(id, prop, { t: at, v: start, e: ease })
      this.putKeyframe(id, prop, { t: at + duration, v: toVars[prop]! })
    }
    this.growDuration(at + duration)
    return this
  }

  set(id: string, vars: Record<string, number>, opts: TweenOpts = {}): this {
    const at = opts.at ?? 0
    for (const prop in vars) this.putKeyframe(id, prop, { t: at, v: vars[prop]!, e: 'hold' })
    this.growDuration(at)
    return this
  }

  // --- persistance : le JSON édité dans le studio écrase le brouillon code ---

  async load(baseUrl = '/trails'): Promise<this> {
    if (!this.id) return this
    try {
      const res = await fetch(`${baseUrl}/${this.id}.json`)
      if (res.ok) this.replaceState((await res.json()) as TrailState)
    } catch (err) {
      console.warn(`[trails] load('${this.id}')`, err)
    }
    return this
  }

  replaceState(state: TrailState): void {
    this.state = state
    this._duration = Math.max(0, state.duration)
    if (this._playhead > this._duration) this._playhead = this._duration
  }

  // --- transport ---

  play(): this {
    this._playing = true
    this.tween = null
    return this
  }

  pause(): this {
    this._playing = false
    return this
  }

  seek(t: number): this {
    this._playhead = clamp(t, 0, this._duration)
    this.tween = null
    return this
  }

  goToMarker(name: string, opts: MarkerOpts = {}): this {
    const time = this.state.markers?.[name]
    if (time === undefined) {
      console.warn(`[trails] goToMarker('${name}') : marker inconnu`)
      return this
    }
    const to = clamp(time, 0, this._duration)
    this._playing = false
    if (opts.instant) {
      this._playhead = to
      this.tween = null
      this.fireMarker(name)
      return this
    }
    this.tween = {
      from: this._playhead,
      to,
      elapsed: 0,
      duration: Math.max(0.0001, opts.duration ?? DEFAULT_TWEEN_DURATION),
      ease: opts.ease ?? DEFAULT_TWEEN_EASE,
      marker: name,
    }
    return this
  }

  onMarker(name: string, cb: () => void): () => void {
    let set = this.markerCbs.get(name)
    if (!set) {
      set = new Set()
      this.markerCbs.set(name, set)
    }
    set.add(cb)
    return () => {
      set!.delete(cb)
    }
  }

  update(time: number, dt: number): void {
    if (time === this.lastTime) return
    this.lastTime = time

    if (this.tween) {
      this.tween.elapsed += dt
      const u = clamp(this.tween.elapsed / this.tween.duration, 0, 1)
      this._playhead = this.tween.from + (this.tween.to - this.tween.from) * applyEase(this.tween.ease, u)
      if (u >= 1) {
        const marker = this.tween.marker
        this.tween = null
        if (marker) this.fireMarker(marker)
      }
    } else if (this._playing && this._duration > 0) {
      const prev = this._playhead
      let next = prev + dt
      if (this.state.loop) {
        next = ((next % this._duration) + this._duration) % this._duration
      } else if (next >= this._duration) {
        next = this._duration
        this._playing = false
      }
      this._playhead = next
      this.checkCrossings(prev, next)
    }

    for (const read of this.readers) read()
  }

  start(): this {
    if (!this.ticker) this.ticker = new Ticker((time, dt) => this.update(time, dt))
    this.ticker.start()
    return this
  }

  stop(): this {
    this.ticker?.stop()
    return this
  }

  tick(cb: () => void): () => void {
    this.readers.add(cb)
    return () => {
      this.readers.delete(cb)
    }
  }

  // --- API d'édition (pilotée par le studio) ---

  objectIds(): string[] {
    return Object.keys(this.state.objects ?? {})
  }

  tracksOf(id: string): Record<string, Track> | undefined {
    return this.state.objects?.[id]
  }

  markersMap(): Record<string, number> {
    return this.state.markers ?? {}
  }

  registeredProps(): Record<string, string[]> {
    const out: Record<string, string[]> = {}
    for (const [id, defs] of this.defaults) out[id] = Object.keys(defs)
    return out
  }

  putKeyframe(id: string, prop: string, kf: Keyframe): void {
    const props = this.ensureObject(id)
    props[prop] = mut.upsertKeyframe(props[prop] ?? [], kf)
  }

  moveKeyframe(id: string, prop: string, fromT: number, toT: number): void {
    const track = this.state.objects?.[id]?.[prop]
    if (!track) return
    this.state.objects![id]![prop] = mut.moveKeyframe(track, fromT, clamp(toT, 0, this._duration))
  }

  removeKeyframe(id: string, prop: string, t: number): void {
    const track = this.state.objects?.[id]?.[prop]
    if (!track) return
    this.state.objects![id]![prop] = mut.removeKeyframeAt(track, t)
  }

  setEase(id: string, prop: string, atT: number, ease: string, cp?: [number, number, number, number]): void {
    const track = this.state.objects?.[id]?.[prop]
    if (!track) return
    this.state.objects![id]![prop] = mut.setEaseAt(track, atT, ease, cp)
  }

  setDuration(d: number): void {
    this._duration = Math.max(0, d)
    if (this._playhead > this._duration) this._playhead = this._duration
  }

  snapshot(): TrailState {
    const objects: TrailState['objects'] = {}
    for (const id in this.state.objects) {
      const props = this.state.objects[id]!
      const clone: Record<string, Track> = {}
      for (const prop in props) clone[prop] = props[prop]!.map((k) => ({ ...k }))
      objects[id] = clone
    }
    const out: TrailState = { duration: this._duration, objects }
    if (this.state.loop !== undefined) out.loop = this.state.loop
    if (this.state.markers) out.markers = { ...this.state.markers }
    return out
  }

  // --- internes ---

  private sampleAt(id: string, prop: string, t: number): number {
    const track = this.state.objects?.[id]?.[prop]
    if (track && track.length) return sampleTrack(track, t)
    return this.defaults.get(id)?.[prop] ?? 0
  }

  private growDuration(t: number): void {
    if (t > this._duration) this._duration = t
  }

  private ensureObject(id: string): Record<string, Track> {
    if (!this.state.objects) this.state.objects = {}
    let props = this.state.objects[id]
    if (!props) {
      props = {}
      this.state.objects[id] = props
    }
    return props
  }

  private fireMarker(name: string): void {
    const set = this.markerCbs.get(name)
    if (set) for (const cb of set) cb()
  }

  private checkCrossings(prev: number, next: number): void {
    const markers = this.state.markers
    if (!markers || next < prev) return
    for (const name in markers) {
      const mt = markers[name]!
      if (prev < mt && next >= mt) this.fireMarker(name)
    }
  }
}
