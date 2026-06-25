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
    class="group flex items-center w-full transition-[gap] duration-fast ease-out"
    :class="isActive ? 'gap-[12px]' : 'gap-[16px]'"
    :aria-current="isActive ? 'location' : undefined"
  >
    <ListSummary :num="num" :state="isActive ? 'active' : 'default'" />

    <span
      class="font-mono font-medium text-[11px] leading-[16px] tracking-kicker uppercase whitespace-nowrap transition-colors duration-fast ease-out"
      :class="isActive ? 'text-accent' : 'text-greyed group-hover:text-mid'"
    >
      {{ label }}
    </span>
  </NuxtLink>
</template>
