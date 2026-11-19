<script setup lang="ts">
const { isIndex = true } = defineProps<{
  isIndex?: boolean
}>()

const { time, tzAbbr } = useClock('Europe/Paris', 'en-US')
</script>

<template>
  <div class="flex flex-col gap-[24px] w-[402px] text-primary">
    <nav
      class="flex items-start justify-between font-sans font-medium text-[12px] leading-[18px] tracking-[0.48px] whitespace-nowrap"
      aria-label="Navigation principale"
    >
      <div class="flex items-center gap-[16px]">
        <p>
          <NuxtLink
            to="/devlog"
            class="underline underline-offset-[3px] decoration-from-font"
            :aria-current="isIndex ? 'page' : undefined"
          >Index</NuxtLink><span>,</span>
        </p>
        <NuxtLink to="/about" class="hover:underline underline-offset-[3px]">About</NuxtLink>
      </div>

      <ClientOnly>
        <p>{{ tzAbbr }} {{ time }}</p>
        <template #fallback>
          <p>CET --:-- --</p>
        </template>
      </ClientOnly>

      <a href="mailto:hello@field.blog" class="hover:underline underline-offset-[3px]">Contact</a>
    </nav>

    <p class="font-sans font-normal text-[13px] leading-[20px] w-[280px]">
      <span class="font-semibold">Field Notes</span><span>
        est un journal sur ce qui se passe entre la maquette et le code,
        quand un designer, un dev et une IA travaillent sur le même produit.
        Chaque chapitre est une étude de cas — règles, erreurs, fix qui marchent.</span>
    </p>
  </div>
</template>
