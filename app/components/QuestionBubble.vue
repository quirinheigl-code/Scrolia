<script setup lang="ts">
interface QuestionData {
  questionText: string | null
  answer1: string | null
  answer2: string | null
  questionPosition: { x: number; y: number } | null
}

const props = defineProps<{
  question: QuestionData
  progress: number
  exitProgress: number
  side: 'left' | 'right'
  visible: boolean
}>()
const emit = defineEmits<{ answer: [choice: 'answer1' | 'answer2'] }>()

const position = computed(() => props.question.questionPosition ?? { x: 100, y: 100 })

// Flies in from off-screen (left or right, whichever edge it's closer to)
// as `progress` goes from 0 to 1, tied 1:1 to scroll. If left unanswered,
// `exitProgress` then rides it back out the left edge, also tied 1:1 to
// scroll. Only if dismissed by clicking an answer does it instead animate
// out on a timer, via the `--exiting` class.
const flyOffsetVw = computed(() => {
  if (!props.visible) return -150
  if (props.exitProgress > 0) return -150 * props.exitProgress
  const direction = props.side === 'left' ? -1 : 1
  return (1 - props.progress) * direction * 120
})
</script>

<template>
  <div
    class="question-bubble"
    :class="{ 'question-bubble--exiting': !visible }"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
      transform: `translateX(${flyOffsetVw}vw)`
    }"
  >
    <p class="question-bubble__text">{{ question.questionText }}</p>
    <div class="question-bubble__answers">
      <button class="question-bubble__btn question-bubble__btn--first" type="button" @click="emit('answer', 'answer1')">
        <span class="question-bubble__btn-text">{{ question.answer1 }}</span>
      </button>
      <button class="question-bubble__btn question-bubble__btn--last" type="button" @click="emit('answer', 'answer2')">
        <span class="question-bubble__btn-text">{{ question.answer2 }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.question-bubble {
  position: absolute;
  z-index: 10;
  box-sizing: border-box;
  max-width: min(360px, 80vw);
  padding: 1.25rem 1.5rem 0;
  border-radius: 20px;
  background: #ffffff;
  border: 3px solid #0036ff;
  box-shadow: -3px 3px 0 #0036ff;
  color: #000000;
  font-family: 'PP Neue Montreal Mono', monospace;
  overflow: hidden;
  will-change: transform;
}

.question-bubble--exiting {
  transition: transform 1.5s ease;
}

.question-bubble__text {
  margin: 0 0 1rem;
  font-size: 1.2rem;
  line-height: 1.2;
  font-weight: 500;
}

.question-bubble__answers {
  display: flex;
  flex-direction: row;
  gap: 0;
  margin: 0 -1.5rem;
}

.question-bubble__btn {
  flex: 1;
  appearance: none;
  border: 3px solid #0036ff;
  background: #ccd7ff;
  color: #000000;
  font-family: 'PP Neue Montreal Mono', monospace;
  padding: 0.65rem 1rem;
  border-radius: 0;
  font-size: 1.2rem;
  cursor: pointer;
  text-align: center;
  margin-top: -1px;
  transition: background 0.15s ease, transform 0.1s ease, border-color 0.15s ease;
}

.question-bubble__btn--first {
  border-left: none;
  border-right: none;
  border-bottom: none;
  border-bottom-left-radius: 20px;
  margin-left: -3px;
  margin-right: -0.5px;
  margin-bottom: -3px;
}

.question-bubble__btn--last {
  border-right: none;
  border-bottom: none;
  border-bottom-right-radius: 20px;
  margin-left: -0.5px;
  margin-right: -3px;
  margin-bottom: -3px;
}

.question-bubble__btn:hover {
  background: #0036ff;
  color: #ffffff;
}

.question-bubble__btn-text {
  display: inline-block;
  transition: transform 0.1s ease;
}

.question-bubble__btn:active .question-bubble__btn-text {
  transform: scale(0.9);
}
</style>

<style>
@font-face {
  font-family: 'PP Neue Montreal Mono';
  src: url('/images/Fonts/PPNeueMontrealMono-Medium.otf') format('opentype');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
</style>
