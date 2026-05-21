<script setup lang="ts">
const { time } = useClock()
</script>

<template>
  <section class="space-y-10 py-12 md:py-16">
    <div class="flex items-baseline justify-between gap-6 flex-wrap">
      <Kicker tone="secondary">FIELD® — NOTES DE TERRAIN</Kicker>
      <ClientOnly>
        <Kicker tone="secondary">PARIS · {{ time }}</Kicker>
        <template #fallback>
          <Kicker tone="secondary">PARIS · --h--</Kicker>
        </template>
      </ClientOnly>
    </div>

    <Heading variant="display">
      Design × Code × IA. Notes de terrain entre la maquette et le code.
    </Heading>

    <BodyText size="lg" tone="secondary" class="max-w-2xl">
      Une série courte sur ce qui se passe <em class="not-italic font-medium text-primary">entre</em> la maquette
      et le code, quand un designer, un dev et une IA travaillent sur le même produit.
      Pas de théorie, pas de tendances. Des règles concrètes, des erreurs vécues, des fix qui marchent.
    </BodyText>
  </section>
</template>
