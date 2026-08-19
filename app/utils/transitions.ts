import { reactive } from 'vue'

/** Duree du fondu de page, en ms. Doit rester alignee sur --dur-base. */
export const PAGE_FADE = 200

export type TransitionPhase = 'navigate' | 'leave:end';

export interface PhaseMark {
  phase: TransitionPhase;
  /** ms depuis le debut de la navigation. */
  at: number;
  detail?: string;
}

interface TransitionDebugState {
  enabled: boolean;
  route: string;
  marks: PhaseMark[];
}

export const transitionDebug = reactive<TransitionDebugState>({
  enabled: false,
  route: '',
  marks: [],
});

let origin = 0;

export function beginTransition(route: string) {
  origin = performance.now();
  transitionDebug.route = route;
  transitionDebug.marks = [];
}

export function markPhase(phase: TransitionPhase, detail?: string) {
  if (!origin) origin = performance.now();
  transitionDebug.marks.push({
    phase,
    at: Math.round(performance.now() - origin),
    detail,
  });
}
