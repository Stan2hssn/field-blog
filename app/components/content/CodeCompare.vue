<script setup lang="ts">
const { left = 'C++', right = 'TypeScript' } = defineProps<{
  left?: string
  right?: string
}>()
</script>

<template>
  <figure class="code-compare">
    <div class="code-compare__grid">
      <div class="code-compare__col">
        <p class="code-compare__label">
          {{ left }}
        </p>
        <slot name="cpp" />
      </div>
      <div class="code-compare__col">
        <p class="code-compare__label">
          {{ right }}
        </p>
        <slot name="ts" />
      </div>
    </div>
  </figure>
</template>
