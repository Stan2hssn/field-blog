<script setup lang="ts">
definePageMeta({
  validate: () => import.meta.dev,
})

useHead({ title: '_dev — molecules' })

const tocItems = [
  { num: '01', label: 'Auto Layout partout, toujours' },
  { num: '02', label: 'Composants pour ce qui se répète' },
  { num: '03', label: 'Variables Figma pour les tokens' },
]
const activeIndex = ref(1)
</script>

<template>
  <ScrollProgressBar />

  <NavTop chapter="01 · figma handoff" />

  <main class="mx-auto max-w-5xl px-6 py-16 space-y-16">
    <header class="space-y-2">
      <Kicker tone="accent">DEV ONLY · MOLECULES</Kicker>
      <Heading variant="display">
        Molecules catalogue
      </Heading>
      <BodyText tone="secondary">
        Composition d'atoms — verifiable visuellement avant intégration en organisms.
      </BodyText>
    </header>

    <Rule />

    <section class="space-y-6">
      <Heading variant="section">SectionHead</Heading>
      <div class="space-y-8">
        <SectionHead num="01" kicker="AUTO LAYOUT" title="Auto Layout partout, toujours." />
        <SectionHead num="02" kicker="COMPONENTS" title="Composants pour tout ce qui se répète." />
      </div>
    </section>

    <section class="space-y-6">
      <Heading variant="section">PullQuote</Heading>
      <div class="space-y-6 max-w-2xl">
        <PullQuote>
          Auto Layout se traduit directement en flexbox ou grid. Sans, le dev doit deviner les espacements à partir de positions absolues — il se trompe systématiquement.
        </PullQuote>
        <PullQuote kicker="EN UNE PHRASE">
          Un fichier Figma propre = du code propre.
        </PullQuote>
      </div>
    </section>

    <section class="space-y-6">
      <Heading variant="section">DoDontList</Heading>
      <div class="grid md:grid-cols-2 gap-8 max-w-3xl">
        <DoDontList
          variant="do"
          :items="[
            'Cmd+Alt+G pour créer une Frame, puis Shift+A pour Auto Layout',
            'Définir direction, gap, padding explicitement',
            'Choisir le resizing par axe (Fill / Hug / Fixed)',
          ]"
        />
        <DoDontList
          variant="dont"
          :items="[
            'Cmd+G (Group) — pas de layout exploitable',
            'Positions absolues partout',
          ]"
        />
      </div>
    </section>

    <section class="space-y-6">
      <Heading variant="section">MetaRow</Heading>
      <div class="max-w-md">
        <MetaRow label="Publié">18 mai 2026</MetaRow>
        <MetaRow label="Lecture">8 min</MetaRow>
        <MetaRow label="Catégories">
          <div class="flex flex-wrap justify-end gap-2">
            <Pill>guides</Pill>
            <Pill>design</Pill>
          </div>
        </MetaRow>
        <MetaRow label="Auteurs">FIELD® · Stan H.</MetaRow>
      </div>
    </section>

    <section class="space-y-6">
      <Heading variant="section">TocItem</Heading>
      <nav class="max-w-sm border-l border-rule/20 pl-4 space-y-1" aria-label="Table des matières (demo)">
        <TocItem
          v-for="(item, i) in tocItems"
          :key="item.num"
          :num="item.num"
          :label="item.label"
          :to="`#rule-${item.num}`"
          :is-active="i === activeIndex"
        />
      </nav>
      <BodyText size="sm" tone="greyed">
        Le scroll-spy réel utilise <code class="font-mono">useScrollSpy()</code>. Ici, item actif forcé en démo (index {{ activeIndex }}).
      </BodyText>
    </section>

    <section class="space-y-6">
      <Heading variant="section">ButtonCopyLink</Heading>
      <div class="flex flex-wrap items-center gap-4">
        <ButtonCopyLink />
        <ButtonCopyLink source="https://field.blog/01-figma-handoff-pour-le-code" />
      </div>
      <BodyText size="sm" tone="greyed">
        Sans <code class="font-mono">source</code>, le bouton copie <code class="font-mono">window.location.href</code> (client uniquement).
      </BodyText>
    </section>

    <section class="space-y-6">
      <Heading variant="section">ScrollProgressBar + NavTop</Heading>
      <BodyText tone="secondary">
        La barre de progression est visible en haut de cette page (scroll pour la voir progresser). La NavTop est rendue juste après les definePageMeta — vermillon = accent, BrandLogo + chapter cap au format <code class="font-mono">Kicker</code>.
      </BodyText>
      <div class="h-[120vh] flex items-center justify-center border border-dashed border-greyed/40 rounded-lg">
        <BodyText tone="greyed">↑↓ Scroll pour voir la progress bar et observer le sticky du NavTop.</BodyText>
      </div>
    </section>

    <Rule weight="thick" />

    <footer class="pt-4">
      <BodyText size="sm" tone="greyed">
        Page dev-only (<code class="font-mono">validate: () => import.meta.dev</code>).
      </BodyText>
    </footer>
  </main>
</template>
