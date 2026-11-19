<script setup lang="ts">
const route = useRoute()
const isDevlog = computed(() => route.path.startsWith('/devlog'))
</script>

<template>
  <NuxtRouteAnnouncer />

  <!-- Hors de NuxtPage : le logo est le seul element persistant d'une page a
       l'autre. Son fondu d'apparition ne joue donc qu'au chargement du document. -->
  <BrandLogo
    v-if="!isDevlog"
    as="link"
    to="/devlog"
    size="hero"
    class="app-logo fixed left-[32px] top-[32px] z-40"
  />

  <NuxtPage />
</template>
