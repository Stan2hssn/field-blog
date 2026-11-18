<script setup lang="ts">
const { src, alt, caption } = defineProps<{
  src: string
  alt: string
  caption: string
}>()

// L'image n'existe qu'une fois l'etape codee : tant qu'elle manque, on montre
// l'emplacement a remplir plutot qu'une image cassee.
const missing = ref(false)
</script>

<template>
  <figure class="m-0 flex flex-col gap-[16px] w-full">
    <img
      v-if="!missing"
      :src="src"
      :alt="alt"
      class="w-full h-auto [image-rendering:pixelated] border-t border-rule pt-[24px]"
      @error="missing = true"
    />
    <div
      v-else
      class="flex flex-col items-center justify-center gap-[8px] w-full aspect-[16/9] rounded-[4px] border border-dashed border-primary"
    >
      <p class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-accent uppercase m-0">
        MON RENDU
      </p>
      <p class="font-mono text-[11px] leading-[16px] text-mid m-0">
        public{{ src }}
      </p>
    </div>
    <figcaption class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker text-mid uppercase">
      {{ caption }}
    </figcaption>
  </figure>
</template>
