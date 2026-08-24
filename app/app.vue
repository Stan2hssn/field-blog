<template>
  <NuxtRouteAnnouncer />

  <!-- Hors de NuxtPage : le logo est le seul element persistant d'une page a
       l'autre. Son fondu d'apparition ne joue donc qu'au chargement du document. -->
  <BrandLogo
    as="link"
    to="/blog"
    size="hero"
    class="app-logo fixed left-[32px] top-[32px] z-40"
  />

  <NuxtPage />
</template>
