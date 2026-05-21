<script setup lang="ts">
const { text, kicker = 'EN UNE PHRASE' } = defineProps<{
  text: string
  kicker?: string
}>()
</script>

<template>
  <section class="py-12">
    <PullQuote :kicker="kicker">
      {{ text }}
    </PullQuote>
  </section>
</template>
