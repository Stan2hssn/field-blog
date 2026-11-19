<script setup lang="ts">
/** Corps d'un chapitre du blog de mai 2026 : sections en checklist, sans Markdown. */
interface ChapterSection {
  num: string
  kicker: string
  title: string
  body: string
  doItems: string[]
  dontItems: string[]
  why: string
}

const { sections } = defineProps<{ sections: ChapterSection[] }>()
</script>

<template>
  <div>
    <section
      v-for="(section, idx) in sections"
      :key="section.num"
      class="flex flex-col gap-[40px] w-full"
      :class="idx > 0 && 'mt-[176px] pt-[40px] border-t border-rule'"
    >
      <SectionHead
        :num="section.num"
        :kicker="section.kicker"
        :title="section.title"
        as="h2"
      />

      <p class="font-sans font-light text-[16px] leading-[28px] text-primary w-full">
        {{ section.body }}
      </p>

      <div class="grid md:grid-cols-2 gap-x-[64px] gap-y-[24px] w-full">
        <DoDontList variant="do" :items="section.doItems" />
        <DoDontList variant="dont" :items="section.dontItems" />
      </div>

      <PullQuote>{{ section.why }}</PullQuote>
    </section>
  </div>
</template>
