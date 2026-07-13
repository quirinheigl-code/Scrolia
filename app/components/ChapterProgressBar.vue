<script setup lang="ts">
defineProps<{
  currentChapter: number
  // e.g. "/images/Soziokratie_ProgressBar/Soziokratie_currentChapter" — the
  // component appends "_{0..7}.svg" to build each frame's path.
  iconBasePath: string
}>()

const emit = defineEmits<{
  jump: [chapter: number]
}>()

const CHAPTER_COUNT = 8

// The 8 big dots' vertical centers, read straight off the icon SVGs'
// own coordinates (viewBox 0 0 76 771), as percentages of the bar's
// height — topmost dot first, matching chapter 0 through chapter 7.
const CHAPTER_DOT_POSITIONS = [4.6, 17.48, 30.36, 43.24, 56.11, 68.99, 81.87, 94.75]
</script>

<template>
  <div class="chapter-progress">
    <img
      v-for="i in CHAPTER_COUNT"
      :key="i - 1"
      :src="`${iconBasePath}_${i - 1}.svg`"
      class="chapter-progress__frame"
      :class="{ 'chapter-progress__frame--active': i - 1 === currentChapter }"
      alt=""
    />
    <button
      v-for="(topPercent, i) in CHAPTER_DOT_POSITIONS"
      :key="`jump-${i}`"
      type="button"
      class="chapter-progress__jump"
      :style="{ top: `${topPercent}%` }"
      :aria-label="`Zu Kapitel ${i + 1} springen`"
      @click="emit('jump', i)"
    />
  </div>
</template>

<style scoped>
.chapter-progress {
  position: relative;
}

.chapter-progress__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
}

.chapter-progress__frame--active {
  opacity: 1;
}

.chapter-progress__jump {
  position: absolute;
  left: 50%;
  width: 40%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  appearance: none;
  background: transparent;
  border: none;
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  pointer-events: auto;
}
</style>
