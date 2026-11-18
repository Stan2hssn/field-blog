<script setup lang="ts">
const { num, kicker, title } = defineProps<{
  num: string
  kicker: string
  title: string
}>()
</script>

<template>
  <section class="devlog-section">
    <SectionHead :num="num" :kicker="kicker" :title="title" as="h2" />
  </section>
</template>
