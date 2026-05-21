<script setup lang="ts">
const { chapterCap } = defineProps<{
  chapterCap?: string
}>()
</script>

<template>
  <ScrollProgressBar />
  <NavTop :chapter="chapterCap" />

  <article class="mx-auto max-w-7xl px-6 lg:px-12 py-16">
    <div class="mb-16 lg:mb-24">
      <slot name="header" />
    </div>

    <div class="grid lg:grid-cols-[minmax(0,1fr)_240px] gap-12 lg:gap-16">
      <main class="min-w-0 space-y-16">
        <slot name="content" />
      </main>

      <div class="lg:sticky lg:top-24 lg:self-start lg:h-fit">
        <slot name="aside" />
      </div>
    </div>

    <div class="mt-24">
      <slot name="footer" />
    </div>
  </article>
</template>
