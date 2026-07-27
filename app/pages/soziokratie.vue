<script setup lang="ts">
const currentChapter = ref(0)
const conclusionStarted = ref(false)
const scrollStory = ref<{ scrollToChapter: (chapter: number) => void } | null>(null)
</script>

<template>
  <div class="story-page">
    <StoryHeader color="#CCD7FF" badge-color="#0036FF" show-clock :frozen="conclusionStarted" />
    <ScrollStory
      ref="scrollStory"
      data-src="/data/soziokratie.json"
      story-name="soziokratie"
      end-back-top="/images/Asstets/Soziokratie_BackTop.svg"
      end-ideale="/images/Asstets/Soziokratie_Ideale.svg"
      end-weiter="/images/Asstets/Soziokratie_Weiter.svg"
      end-back-top-hover="/images/Asstets/Soziokratie_BackTop-Hover.svg"
      end-ideale-hover="/images/Asstets/Soziokratie_Ideale-Hover.svg"
      end-weiter-hover="/images/Asstets/Soziokratie_Weiter-Hover.svg"
      end-weiter-href="/technokratie"
      footer-src="/images/Asstets/Soziokratie-Footer.svg"
      footer-link-active-color="#CCD7FF"
      :end-conclusion="['/images/Soziokratie/Soziokratie_End_22-1.svg', '/images/Soziokratie/Soziokratie_End_22-2.svg']"
      :spectrum-step-index="1"
      spectrum-fill-color="#0036FF"
      @update:current-chapter="currentChapter = $event"
      @update:conclusion-started="conclusionStarted = $event"
    />
    <ChapterProgressBar
      class="story-page__progress"
      :current-chapter="currentChapter"
      icon-base-path="/images/Soziokratie_ProgressBar/Soziokratie_currentChapter"
      @jump="scrollStory?.scrollToChapter($event)"
    />
  </div>
</template>

<style scoped>
.story-page {
  --header-height: 10.9vh;
}

.story-page__progress {
  position: fixed;
  top: 160px;
  left: 22px;
  height: 70vh;
  width: calc(70vh * 76 / 771);
  z-index: 30000;
  pointer-events: none;
}
</style>
