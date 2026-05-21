<script setup lang="ts">
definePageMeta({
  validate: () => import.meta.dev,
})

useHead({ title: '_dev — atoms' })
</script>

<template>
  <main class="mx-auto max-w-5xl px-6 py-16 space-y-16">
    <header class="space-y-2">
      <Kicker tone="accent">DEV ONLY · ATOMS</Kicker>
      <Heading variant="display">
        Atomic components catalogue
      </Heading>
      <BodyText tone="secondary">
        Inventaire visuel des atomes pour le projet FIELD®. Cette page n'est rendue qu'en
        développement (<code class="font-mono">import.meta.dev</code>).
      </BodyText>
    </header>

    <Rule />

    <section class="space-y-6">
      <Heading variant="section">Kicker</Heading>
      <div class="flex flex-wrap items-center gap-6">
        <Kicker>SECONDARY · DEFAULT</Kicker>
        <Kicker tone="primary">PRIMARY</Kicker>
        <Kicker tone="accent">ACCENT</Kicker>
      </div>
    </section>

    <section class="space-y-6">
      <Heading variant="section">Heading</Heading>
      <div class="space-y-4">
        <Heading variant="display">Display — Inter Light Italic.</Heading>
        <Heading variant="section">Section — Inter Medium.</Heading>
        <Heading variant="card">Card — Inter Medium small.</Heading>
      </div>
    </section>

    <section class="space-y-6">
      <Heading variant="section">BodyText</Heading>
      <div class="space-y-3 max-w-2xl">
        <BodyText size="lg">Large — pour les lede et intro paragraphes longs.</BodyText>
        <BodyText size="base">Base — pour le contenu courant. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.</BodyText>
        <BodyText size="sm" tone="secondary">Small secondary — pour les annotations et metadata.</BodyText>
        <BodyText tone="greyed" italic>Italic greyed — pour les éléments désactivés ou subtils.</BodyText>
      </div>
    </section>

    <section class="space-y-6">
      <Heading variant="section">Rule</Heading>
      <div class="space-y-6 max-w-xl">
        <div>
          <BodyText size="sm" tone="secondary">horizontal · regular</BodyText>
          <Rule class="mt-2" />
        </div>
        <div>
          <BodyText size="sm" tone="secondary">horizontal · thick</BodyText>
          <Rule weight="thick" class="mt-2" />
        </div>
        <div>
          <BodyText size="sm" tone="secondary">horizontal · dashed</BodyText>
          <Rule dashed class="mt-2" />
        </div>
        <div class="flex items-center gap-6 h-12">
          <BodyText size="sm" tone="secondary">vertical</BodyText>
          <Rule orientation="vertical" />
          <BodyText size="sm" tone="secondary">vertical thick</BodyText>
          <Rule orientation="vertical" weight="thick" />
        </div>
      </div>
    </section>

    <section class="space-y-6">
      <Heading variant="section">Pill</Heading>
      <div class="flex flex-wrap items-center gap-3">
        <Pill>tag · default</Pill>
        <Pill variant="accent">accent</Pill>
        <Pill as="a" to="/blog">link tag</Pill>
        <Pill as="a" to="/blog" variant="accent">link accent</Pill>
      </div>
    </section>

    <section class="space-y-6">
      <Heading variant="section">ArrowLink</Heading>
      <div class="flex flex-wrap items-center gap-8">
        <ArrowLink to="/blog/01-figma-handoff-pour-le-code" label="Chapitre suivant" />
        <ArrowLink to="/blog" direction="left" label="Retour à l'index" />
        <ArrowLink to="/blog" tone="accent" label="Accent right" />
        <ArrowLink label="Action button (pas de to)" />
      </div>
    </section>

    <section class="space-y-6">
      <Heading variant="section">BrandLogo</Heading>
      <div class="flex flex-wrap items-center gap-8">
        <BrandLogo />
        <BrandLogo as="static" />
      </div>
    </section>

    <section class="space-y-6">
      <Heading variant="section">ListSummary</Heading>
      <BodyText size="sm" tone="secondary">
        Variantes provisoires en attendant validation Figma (master 238:2419 — 14|22px indicator).
      </BodyText>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-xl">
        <div class="space-y-2">
          <BodyText size="sm" tone="greyed">default</BodyText>
          <ListSummary>01 → 13</ListSummary>
        </div>
        <div class="space-y-2">
          <BodyText size="sm" tone="greyed">hover</BodyText>
          <ListSummary state="hover">01 → 13</ListSummary>
        </div>
        <div class="space-y-2">
          <BodyText size="sm" tone="greyed">active</BodyText>
          <ListSummary state="active">01 → 13</ListSummary>
        </div>
        <div class="space-y-2">
          <BodyText size="sm" tone="greyed">focus</BodyText>
          <ListSummary state="focus">01 → 13</ListSummary>
        </div>
        <div class="space-y-2">
          <BodyText size="sm" tone="greyed">disabled</BodyText>
          <ListSummary state="disabled">01 → 13</ListSummary>
        </div>
        <div class="space-y-2 col-span-2">
          <BodyText size="sm" tone="greyed">md (22px)</BodyText>
          <ListSummary size="md">01 → 13</ListSummary>
        </div>
      </div>
    </section>

    <Rule weight="thick" />

    <footer class="pt-4">
      <BodyText size="sm" tone="greyed">
        Cette page est désactivée en production via <code class="font-mono">validate: () => import.meta.dev</code>.
      </BodyText>
    </footer>
  </main>
</template>
