<script setup lang="ts">
import { CHAPTERS_MANIFEST, CHAPTER_LEVELS } from "~/utils/chapters";
import { activeIndex } from "~/utils/carousel-layout";
import { useRailState } from "~/composables/useRailState";
import { useTrails } from "~/composables/useTrails";
import { INTRO_TIMELINE, TIMELINE_BUILDERS } from "~/utils/timelines";
import {
  GALLERY_RATES,
  RAIL_MAGNET,
  isMagnetSettled,
  offsetForIndex,
  stepMagnet,
  wheelPixels,
  type MagnetState,
} from "~/utils/rail-motion";

interface PublishedChapter {
  title: string;
  lede: string;
  readingTime: number;
  publishDate: Date | string;
  tags?: string[];
}

const { data: publishedChapters } = await useAsyncData(
  "blog-index-chapters",
  async () => {
    const [blog, devlog] = await Promise.all([
      queryCollection("blog").all(),
      queryCollection("devlog").all(),
    ]);
    return [...blog, ...devlog];
  },
);

// Cle = chemin : les slugs du blog et du devlog partagent le prefixe NN-.
const publishedByPath = computed(() => {
  const map = new Map<string, PublishedChapter>();
  for (const c of publishedChapters.value ?? []) map.set(c.path, c);
  return map;
});

const TOTAL = CHAPTERS_MANIFEST.length;

const carousel = CHAPTERS_MANIFEST.map((entry) => {
  const fallbackLede =
    entry.level === "fundamentals"
      ? "Fondations du handoff — chapitre en cours d'écriture."
      : entry.level === "practice"
        ? "Pratiques avancées — chapitre en cours d'écriture."
        : "Collaboration & systèmes — chapitre en cours d'écriture.";
  return {
    num: entry.num,
    slug: entry.slug,
    path: entry.path,
    fullTitle: entry.fullTitle,
    fallbackLede,
    categoryLabel: CHAPTER_LEVELS[entry.level].label.toUpperCase(),
    level: entry.level,
  };
});

const INTRO_RUN_CHAPTERS = 4;
const INTRO_RUN_DURATION = 1400;




const scrollOffset = ref(-INTRO_RUN_CHAPTERS);
const settledOffset = ref(0);

const BASE_GAP = 28;
const MAX_GAP_EXTRA = 36;
const VELOCITY_FACTOR = 180;

const dynamicGap = ref(BASE_GAP);
const scrollVelocity = ref(0);

const currentChapterIdx = computed(
  () => ((settledOffset.value % TOTAL) + TOTAL) % TOTAL,
);
const currentEntry = computed(() => carousel[currentChapterIdx.value]!);
const currentPublished = computed(
  () => publishedByPath.value.get(currentEntry.value.path) ?? null,
);
const currentIsPublished = computed(() => currentPublished.value !== null);

const currentChapter = computed(() => {
  const e = currentEntry.value;
  const p = currentPublished.value;
  return {
    num: e.num,
    path: e.path,
    title: p?.title ?? e.fullTitle,
    lede: p?.lede ?? e.fallbackLede,
    readingTime: p?.readingTime ?? 8,
    publishDate: (p?.publishDate ?? new Date()) as Date | string,
    tags: p?.tags ?? ["Figma", "Handoff", "Checklist"],
    category: e.categoryLabel,
  };
});

if (import.meta.client) {
  // Moteur du MoonRing d'Audemars Piguet : une impulsion se libere dans la
  // cible, un aimant permanent la ramene sur le chapitre le plus proche, et
  // l'affichage la poursuit. Unite : le chapitre.
  let state: MagnetState = { impulse: 0, target: 0, current: scrollOffset.value };
  let rafId: number | null = null;
  let lastTime = 0;
  let introActive = false;
  const WHEEL_GAIN = 1 / 400;
  const TOUCH_GAIN = 1 / 90;
  const SETTLE_EPSILON = 0.02;

  function commitSettled() {
    const nearest = Math.round(state.target);
    if (Math.abs(state.target - nearest) < SETTLE_EPSILON) settledOffset.value = nearest;
  }

  function cancelIntroRun() {
    if (!introActive) return;
    introActive = false;
    state = { impulse: 0, target: Math.round(state.current), current: state.current };
    settledOffset.value = state.target;
    kick();
  }

  /**
   * ChapterScene est un composant .client : il n'est pas dans le DOM au
   * montage de la page. Lancer l'intro avant qu'il existe la joue dans le vide.
   */
  function whenCarouselReady(run: () => void, attempts = 60) {
    if (document.querySelector(".scene-wrapper") || attempts <= 0) {
      run();
      return;
    }
    requestAnimationFrame(() => whenCarouselReady(run, attempts - 1));
  }

  /**
   * L'intro est une TIMELINE et non une boucle rAF de plus. Elle est declaree
   * dans trails, donc editable a chaud depuis l'onglet Timeline de la sonde.
   * Elle ecrit la position ; l'aimant reprend la main a la fin.
   */
  function runIntroCarousel() {
    const from = scrollOffset.value;
    introActive = true;
    void useTrails(INTRO_TIMELINE, TIMELINE_BUILDERS[INTRO_TIMELINE]).then((tl) => {
      const rail = tl.subscribe("rail", { offset: from });
      const off = rail.onApply((values) => {
        if (!introActive) {
          off();
          rail.release();
          return;
        }
        applyOffset(values.offset ?? 0);
        state = { impulse: 0, target: scrollOffset.value, current: scrollOffset.value };
        if (tl.playhead < tl.duration) return;
        off();
        rail.release();
        introActive = false;
        state.target = Math.round(state.current);
        settledOffset.value = state.target;
        dynamicGap.value = BASE_GAP;
        scrollVelocity.value = 0;
      });
      tl.seek(0);
      tl.play();
    });
  }

  function applyOffset(next: number) {
    const signed = next - scrollOffset.value;
    scrollOffset.value = next;
    dynamicGap.value =
      BASE_GAP + Math.min(Math.abs(signed) * VELOCITY_FACTOR, MAX_GAP_EXTRA);
    scrollVelocity.value = signed;
  }

  function maybeWrap() {
    if (Math.abs(state.current) <= 500) return;
    const shift = Math.round(state.current / TOTAL) * TOTAL;
    state = {
      impulse: state.impulse,
      target: state.target - shift,
      current: state.current - shift,
    };
    scrollOffset.value -= shift;
    settledOffset.value -= shift;
  }

  function animate(time: number) {
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 1 / 20) : 1 / 60;
    lastTime = time;
    const magnet =
      Math.round(state.target) === settledOffset.value
        ? RAIL_MAGNET.activeMagnet
        : RAIL_MAGNET.magnet;
    state = stepMagnet(state, { ...GALLERY_RATES, magnet }, dt);
    applyOffset(state.current);
    commitSettled();
    if (isMagnetSettled(state)) {
      state.current = state.target = Math.round(state.target);
      applyOffset(state.current);
      dynamicGap.value = BASE_GAP;
      scrollVelocity.value = 0;
      settledOffset.value = state.target;
      rafId = null;
      lastTime = 0;
      maybeWrap();
      return;
    }
    rafId = requestAnimationFrame(animate);
  }

  function kick() {
    if (rafId === null) rafId = requestAnimationFrame(animate);
  }

  function push(chapters: number) {
    state.impulse += chapters;
    kick();
  }

  function step(delta: number) {
    state.target = Math.round(state.target) + delta;
    kick();
  }

  function goToNum(num: string) {
    const idx = CHAPTERS_MANIFEST.findIndex((c) => c.num === num);
    if (idx < 0) return;
    state.target = offsetForIndex(idx, TOTAL, state.target);
    kick();
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    cancelIntroRun();
    push(wheelPixels(e.deltaY, e.deltaMode) * WHEEL_GAIN);
  };

  const onKey = (e: KeyboardEvent) => {
    cancelIntroRun();
    if (
      e.key === "ArrowDown" ||
      e.key === "ArrowRight" ||
      e.key === "PageDown"
    ) {
      e.preventDefault();
      step(1);
    } else if (
      e.key === "ArrowUp" ||
      e.key === "ArrowLeft" ||
      e.key === "PageUp"
    ) {
      e.preventDefault();
      step(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      goToNum(CHAPTERS_MANIFEST[0]!.num);
    } else if (e.key === "End") {
      e.preventDefault();
      goToNum(CHAPTERS_MANIFEST[TOTAL - 1]!.num);
    }
  };

  let lastTouchY: number | null = null;
  const onTouchStart = (e: TouchEvent) => {
    cancelIntroRun();
    lastTouchY = e.touches[0]?.clientY ?? null;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (lastTouchY === null) return;
    const currY = e.touches[0]?.clientY ?? lastTouchY;
    push((lastTouchY - currY) * TOUCH_GAIN);
    lastTouchY = currY;
  };
  const onTouchEnd = () => {
    lastTouchY = null;
  };

  onMounted(() => {
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    whenCarouselReady(runIntroCarousel);

    // Publie pour l'onglet State Delta de la sonde : sans lui, faire defiler le
    // rail ne changeait aucun champ observe et le panneau annoncait, a raison,
    // « aucun changement ».
    useRailState().publish({
      offset: () => scrollOffset.value,
      active: () => activeIndex(scrollOffset.value),
    });
  });

  onScopeDispose(() => {
    useRailState().publish(null);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    introActive = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
  });
}

useSeoMeta({
  title: "Field Notes — Index",
  description:
    "Field Notes est un journal sur ce qui se passe entre la maquette et le code, quand un designer, un dev et une IA travaillent sur le même produit. Chaque chapitre est une étude de cas — règles, erreurs, fix qui marchent.",
  ogTitle: "Field Notes — Index",
  ogDescription:
    "Field Notes est un journal sur ce qui se passe entre la maquette et le code, quand un designer, un dev et une IA travaillent sur le même produit. Chaque chapitre est une étude de cas — règles, erreurs, fix qui marchent.",
  ogType: "website",
});

useHead({
  htmlAttrs: { class: "fullscreen-lock" },
  bodyAttrs: { class: "fullscreen-lock" },
});
</script>

<template>
  <section
    class="relative bg-bg w-[100dvw] h-[100dvh] overflow-hidden flex items-stretch gap-[128px] p-[32px] touch-none select-none"
    aria-roledescription="carousel"
    aria-label="Chapitres FIELD®"
  >
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:bg-bg focus:border focus:border-primary focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-kicker"
    >
      Aller au contenu
    </a>

    <div id="main-content" class="flex flex-1 items-center min-w-0 gap-[32px]">
      <aside
        class="relative flex flex-col items-start justify-center self-stretch w-[22px]"
        aria-label="Chapitres"
      >
        <ChapterListSidebar
          :scroll-offset="scrollOffset"
          :velocity="scrollVelocity"
        />
      </aside>

      <div
        class="flex-1 h-px bg-rule self-center"
        aria-hidden="true"
      />

      <FeaturedCard
        :num="currentChapter.num"
        :to="currentChapter.path"
        :title="currentChapter.title"
        :lede="currentChapter.lede"
        :reading-time="currentChapter.readingTime"
        :category="currentChapter.category"
        :published="currentIsPublished"
      />
    </div>

    <!-- Le visuel du rail est une scene Three ; la navigation reste en DOM. -->
    <ChapterScene
      :scroll-offset="scrollOffset"
      :gap="dynamicGap"
      class="self-center"
    />

    <aside
      class="relative flex flex-col items-end justify-center w-[402px] self-stretch"
      aria-label="Intro et accès article"
    >
      <div
        class="absolute left-0 top-0 w-full"
      >
        <IntroBlock />
      </div>

      <CtaReadMore
        :to="currentChapter.path"
        :tags="currentChapter.tags"
        :publish-date="currentChapter.publishDate"
        :published="currentIsPublished"
      />
    </aside>

    <div class="sr-only" role="status" aria-live="polite">
      Chapitre {{ currentChapter.num }} sur {{ TOTAL }} —
      {{ currentChapter.title }}
    </div>
  </section>
</template>
