<script setup lang="ts">
import { CHAPTERS_MANIFEST, CHAPTER_LEVELS } from "~/utils/chapters";

const { data: publishedChapters } = await useAsyncData(
  "blog-index-chapters",
  () => queryCollection("blog").order("num", "ASC").all(),
);

const publishedBySlug = computed(() => {
  const map = new Map<
    string,
    NonNullable<typeof publishedChapters.value>[number]
  >();
  for (const c of publishedChapters.value ?? []) map.set(c.slug, c);
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
    fullTitle: entry.fullTitle,
    fallbackLede,
    categoryLabel: CHAPTER_LEVELS[entry.level].label.toUpperCase(),
    level: entry.level,
  };
});

const scrollOffset = ref(0);
const targetOffset = ref(0);
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
  () => publishedBySlug.value.get(currentEntry.value.slug) ?? null,
);
const currentIsPublished = computed(() => currentPublished.value !== null);

const currentChapter = computed(() => {
  const e = currentEntry.value;
  const p = currentPublished.value;
  return {
    num: e.num,
    slug: e.slug,
    title: p?.title ?? e.fullTitle,
    lede: p?.lede ?? e.fallbackLede,
    readingTime: p?.readingTime ?? 8,
    publishDate: (p?.publishDate ?? new Date()) as Date | string,
    tags: p?.tags ?? ["Figma", "Handoff", "Checklist"],
    category: e.categoryLabel,
  };
});

if (import.meta.client) {
  let rafId: number | null = null;
  let snapTimer: ReturnType<typeof setTimeout> | null = null;
  let snapPhase = false;
  const WHEEL_SENSITIVITY = 1 / 400;
  const TOUCH_SENSITIVITY = 1 / 60;
  const DRAG_DAMPING = 0.22;
  const SNAP_DAMPING = 0.04;

  function maybeWrap() {
    if (Math.abs(scrollOffset.value) > 500) {
      const mod = ((scrollOffset.value % TOTAL) + TOTAL) % TOTAL;
      scrollOffset.value = mod;
      targetOffset.value = mod;
      settledOffset.value = Math.round(mod);
    }
  }

  function animate() {
    const diff = targetOffset.value - scrollOffset.value;
    if (Math.abs(diff) < 0.0015) {
      scrollOffset.value = targetOffset.value;
      dynamicGap.value = BASE_GAP;
      scrollVelocity.value = 0;
      settledOffset.value = Math.round(scrollOffset.value);
      rafId = null;
      maybeWrap();
      return;
    }
    const damp = snapPhase ? SNAP_DAMPING : DRAG_DAMPING;
    const prev = scrollOffset.value;
    scrollOffset.value += diff * damp;
    const signed = scrollOffset.value - prev;
    const magnitude = Math.abs(signed);
    const extraGap = Math.min(magnitude * VELOCITY_FACTOR, MAX_GAP_EXTRA);
    dynamicGap.value = BASE_GAP + extraGap;
    scrollVelocity.value = signed;
    rafId = requestAnimationFrame(animate);
  }

  function kick() {
    if (rafId === null) rafId = requestAnimationFrame(animate);
  }

  function snapToNearest() {
    targetOffset.value = Math.round(targetOffset.value);
    snapPhase = true;
    kick();
  }

  function goToNum(num: string) {
    const idx = CHAPTERS_MANIFEST.findIndex((c) => c.num === num);
    if (idx < 0) return;
    const currentRound = Math.round(scrollOffset.value);
    const currentMod = ((currentRound % TOTAL) + TOTAL) % TOTAL;
    let delta = idx - currentMod;
    while (delta > TOTAL / 2) delta -= TOTAL;
    while (delta < -TOTAL / 2) delta += TOTAL;
    targetOffset.value = currentRound + delta;
    snapPhase = true;
    kick();
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (snapTimer) clearTimeout(snapTimer);
    snapPhase = false;
    targetOffset.value += e.deltaY * WHEEL_SENSITIVITY;
    kick();
    snapTimer = setTimeout(snapToNearest, 180);
  };

  const onKey = (e: KeyboardEvent) => {
    const base = Math.round(targetOffset.value);
    if (
      e.key === "ArrowDown" ||
      e.key === "ArrowRight" ||
      e.key === "PageDown"
    ) {
      e.preventDefault();
      targetOffset.value = base + 1;
      snapPhase = true;
      kick();
    } else if (
      e.key === "ArrowUp" ||
      e.key === "ArrowLeft" ||
      e.key === "PageUp"
    ) {
      e.preventDefault();
      targetOffset.value = base - 1;
      snapPhase = true;
      kick();
    } else if (e.key === "Home") {
      e.preventDefault();
      goToNum("01");
    } else if (e.key === "End") {
      e.preventDefault();
      goToNum(CHAPTERS_MANIFEST[TOTAL - 1]!.num);
    }
  };

  let lastTouchY: number | null = null;
  const onTouchStart = (e: TouchEvent) => {
    lastTouchY = e.touches[0]?.clientY ?? null;
    if (snapTimer) clearTimeout(snapTimer);
    snapPhase = false;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (lastTouchY === null) return;
    const currY = e.touches[0]?.clientY ?? lastTouchY;
    const delta = lastTouchY - currY;
    targetOffset.value += delta * TOUCH_SENSITIVITY;
    kick();
    lastTouchY = currY;
  };
  const onTouchEnd = () => {
    lastTouchY = null;
    snapToNearest();
  };

  onMounted(() => {
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
  });

  onScopeDispose(() => {
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    if (snapTimer) clearTimeout(snapTimer);
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
  <main
    class="relative bg-bg w-[100dvw] h-[100dvh] overflow-hidden flex items-stretch gap-[128px] p-[32px] touch-none select-none"
    role="region"
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
        <BrandLogo
          as="link"
          to="/blog"
          size="hero"
          class="absolute left-0 top-0"
        />
        <ChapterListSidebar
          :scroll-offset="scrollOffset"
          :velocity="scrollVelocity"
        />
      </aside>

      <div class="flex-1 h-px bg-rule self-center" aria-hidden="true" />

      <Transition name="card" mode="out-in">
        <FeaturedCard
          :key="currentChapter.num"
          :num="currentChapter.num"
          :slug="currentChapter.slug"
          :title="currentChapter.title"
          :lede="currentChapter.lede"
          :reading-time="currentChapter.readingTime"
          :category="currentChapter.category"
          :published="currentIsPublished"
        />
      </Transition>
    </div>

    <ChapterCarousel
      :scroll-offset="scrollOffset"
      :gap="dynamicGap"
      class="self-center"
    />

    <aside
      class="relative flex flex-col items-end justify-center w-[402px] self-stretch"
      aria-label="Intro et accès article"
    >
      <div class="absolute left-0 top-0 w-full">
        <IntroBlock />
      </div>

      <CtaReadMore
        :slug="currentChapter.slug"
        :tags="currentChapter.tags"
        :publish-date="currentChapter.publishDate"
        :published="currentIsPublished"
      />
    </aside>

    <div class="sr-only" role="status" aria-live="polite">
      Chapitre {{ currentChapter.num }} sur {{ TOTAL }} —
      {{ currentChapter.title }}
    </div>
  </main>
</template>

<style scoped>
.card-enter-active,
.card-leave-active {
  transition:
    opacity 220ms ease-out,
    transform 220ms ease-out;
}
.card-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.card-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .card-enter-active,
  .card-leave-active {
    transition: opacity 80ms linear;
    transform: none;
  }
  .card-enter-from,
  .card-leave-to {
    transform: none;
  }
}
</style>
