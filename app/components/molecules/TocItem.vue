<script setup lang="ts">
const { num, label, to, isActive = false } = defineProps<{
  num: string
  label: string
  to: string
  isActive?: boolean
}>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="group flex items-center w-[100px] transition-[gap] duration-fast ease-out"
    :class="isActive ? 'gap-[12px]' : 'gap-[16px]'"
    :aria-current="isActive ? 'location' : undefined"
  >
    <ListSummary :num="num" :state="isActive ? 'active' : 'default'" />

    <span
      v-if="isActive"
      class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker uppercase text-accent whitespace-nowrap"
    >
      {{ label }}
    </span>
    <span
      v-else
      class="font-sans font-medium text-[12px] leading-[20px] text-greyed whitespace-nowrap group-hover:text-mid transition-colors duration-fast ease-out"
    >
      {{ label }}
    </span>
  </NuxtLink>
</template>
