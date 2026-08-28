<script setup lang="ts">
import TechnokratieQuestionBubble from '~/components/TechnokratieQuestionBubble.vue'

const currentChapter = ref(0)
const conclusionStarted = ref(false)
const scrollStory = ref<{ scrollToChapter: (chapter: number) => void } | null>(null)
</script>

<template>
  <div class="story-page">
    <StoryHeader color="#CCE9CC" badge-color="#009002" show-alarm :frozen="conclusionStarted" />
    <ScrollStory
      ref="scrollStory"
      data-src="/data/technokratie.json"
      story-name="technokratie"
      :bubble-component="TechnokratieQuestionBubble"
      end-back-top="/images/Asstets/Technokratie_BackTop.svg"
      end-ideale="/images/Asstets/Technokratie_Ideale.svg"
      end-weiter="/images/Asstets/Technokratie_Weiter.svg"
      end-back-top-hover="/images/Asstets/Technokratie_BackTop-Hover.svg"
      end-ideale-hover="/images/Asstets/Technokratie_Ideale-Hover.svg"
      end-weiter-hover="/images/Asstets/Technokratie_Weiter-Hover.svg"
      end-weiter-href="/soziokratie"
      footer-src="/images/Asstets/Technokratie-Footer.svg"
      footer-link-active-color="#CCE9CC"
      :end-conclusion="['/images/Technokratie/Technokratie_End_26-1.svg', '/images/Technokratie/Technokratie_End_26-2.svg']"
      :spectrum-step-index="1"
      spectrum-fill-color="#99D39A"
      spectrum-background-color="#CCE9CC"
      feedback-src="/images/Feedback/Technokratie_Feedback.svg"
      feedback-story-label="Technokratie"
      @update:current-chapter="currentChapter = $event"
      @update:conclusion-started="conclusionStarted = $event"
    />
    <ChapterProgressBar
      v-if="!conclusionStarted"
      class="story-page__progress"
      :current-chapter="currentChapter"
      icon-base-path="/images/Technokratie_ProgressBar/Technokratie_currentChapter"
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
