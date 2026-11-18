<script setup lang="ts">
const { theme, toggle } = useDevlogTheme()
const isNight = computed(() => theme.value === 'night')
</script>

<template>
  <button
    type="button"
    class="group inline-flex items-center gap-[10px] font-mono text-[11px] leading-[16px] text-secondary hover:text-primary transition-colors duration-fast focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent"
    :aria-pressed="isNight"
    @click="toggle"
  >
    <span
      aria-hidden="true"
      class="relative block w-[28px] h-[14px] rounded-full border border-current transition-colors duration-base"
    >
      <span
        class="absolute top-[2px] left-[2px] w-[8px] h-[8px] rounded-full bg-accent transition-transform duration-base ease-out"
        :class="isNight ? 'translate-x-[14px]' : ''"
      />
    </span>
    {{ isNight ? 'Nuit' : 'Jour' }}
  </button>
</template>
