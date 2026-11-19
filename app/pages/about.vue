<script setup lang="ts">
useSeoMeta({
  title: 'FIELD® — À propos',
  description: 'Field Notes est un journal sur ce qui se passe entre la maquette et le code.',
})
</script>

<template>
  <main class="bg-bg min-h-screen flex flex-col items-start gap-[64px] p-[32px]">
    <BrandLogo as="link" to="/devlog" />

    <div class="max-w-2xl space-y-8">
      <Kicker tone="accent">À PROPOS — BIENTÔT</Kicker>

      <Heading variant="display">
        Une page about en construction.
      </Heading>

      <BodyText size="lg" tone="secondary">
        Cette page n'est pas encore écrite. En attendant, retourne à
        <NuxtLink to="/devlog" class="underline underline-offset-[3px] text-primary">
          l'index des chapitres
        </NuxtLink>.
      </BodyText>
    </div>
  </main>
</template>
