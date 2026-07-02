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
  side: 'left' | 'right'
}>()
const emit = defineEmits<{ answer: [choice: 'answer1' | 'answer2'] }>()

const position = computed(() => props.question.questionPosition ?? { x: 100, y: 100 })

// Flies in from off-screen (left or right, whichever edge it's closer to)
// as `progress` goes from 0 to 1, tied 1:1 to scroll.
const flyOffsetVw = computed(() => {
  const direction = props.side === 'left' ? -1 : 1
  return (1 - props.progress) * direction * 120
})
</script>

<template>
  <div
    class="question-bubble"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
      transform: `translateX(${flyOffsetVw}vw)`
    }"
  >
    <p class="question-bubble__text">{{ question.questionText }}</p>
    <div class="question-bubble__answers">
      <button class="question-bubble__btn" type="button" @click="emit('answer', 'answer1')">
        {{ question.answer1 }}
      </button>
      <button class="question-bubble__btn" type="button" @click="emit('answer', 'answer2')">
        {{ question.answer2 }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.question-bubble {
  position: absolute;
  z-index: 10;
  max-width: min(360px, 80vw);
  padding: 1.25rem 1.5rem;
  border-radius: 16px;
  background: rgba(15, 15, 20, 0.72);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  color: #fff;
  will-change: transform;
}

.question-bubble__text {
  margin: 0 0 1rem;
  font-size: 1.05rem;
  line-height: 1.4;
  font-weight: 600;
}

.question-bubble__answers {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.question-bubble__btn {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  font-size: 0.95rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease, transform 0.1s ease, border-color 0.15s ease;
}

.question-bubble__btn:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.4);
}

.question-bubble__btn:active {
  transform: scale(0.98);
}
</style>
