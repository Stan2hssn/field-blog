<script setup lang="ts">
const {
  publishDate,
  readingTime,
  authors,
  categories,
} = defineProps<{
  publishDate: Date | string
  readingTime: number
  authors: string[]
  categories: string[]
}>()

const formattedDate = computed(() => {
  const d = typeof publishDate === 'string' ? new Date(publishDate) : publishDate
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
})
</script>

<template>
  <aside class="space-y-6" aria-label="Métadonnées de l'article">
    <div>
      <MetaRow label="Publié">
        <time :datetime="(typeof publishDate === 'string' ? publishDate : publishDate.toISOString())">
          {{ formattedDate }}
        </time>
      </MetaRow>
      <MetaRow label="Lecture">{{ readingTime }} min</MetaRow>
      <MetaRow label="Auteurs">{{ authors.join(' · ') }}</MetaRow>
      <MetaRow label="Catégories">
        <div class="flex flex-wrap justify-end gap-1.5">
          <Pill v-for="cat in categories" :key="cat">{{ cat }}</Pill>
        </div>
      </MetaRow>
    </div>
    <ButtonCopyLink />
  </aside>
</template>
