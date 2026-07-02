<script setup lang="ts">
interface QuestionData {
  questionText: string | null
  answer1: string | null
  answer2: string | null
  questionPosition: { x: number; y: number } | null
}

interface StoryItem {
  imageSrc: string
  commentSource: string | null
  question: QuestionData
}

interface Page {
  type: 'image' | 'comment'
  src: string
  itemIndex: number
  question: QuestionData | null
}

const items = ref<StoryItem[]>([])

onMounted(async () => {
  items.value = await $fetch<StoryItem[]>('/data/soziokratie.json')
  preloadImages()
})

// Warm the browser cache for every image up front so swapping to a page
// that hasn't been rendered yet doesn't have to wait on a fetch + decode.
const preloadedSrcs = new Set<string>()
function preloadImages() {
  for (const item of items.value) {
    for (const src of [item.imageSrc, item.commentSource]) {
      if (!src || preloadedSrcs.has(src)) continue
      preloadedSrcs.add(src)
      const img = new Image()
      img.src = src
    }
  }
}

const pages = computed<Page[]>(() => {
  const result: Page[] = []
  items.value.forEach((item, itemIndex) => {
    result.push({
      type: 'image',
      src: item.imageSrc,
      itemIndex,
      question: item.question?.questionText ? item.question : null
    })
    if (item.commentSource) {
      result.push({ type: 'comment', src: item.commentSource, itemIndex, question: null })
    }
  })
  return result
})

const scrollY = ref(0)
const viewportH = ref(0)
const viewportW = ref(0)
let ticking = false

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    scrollY.value = window.scrollY
    ticking = false
  })
}

function onResize() {
  viewportH.value = window.innerHeight
  viewportW.value = window.innerWidth
}

onMounted(() => {
  viewportH.value = window.innerHeight
  viewportW.value = window.innerWidth
  scrollY.value = window.scrollY
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
})

// Every page gets a "dwell" segment (fully settled, no motion). Pages that
// animate in (comments, and images following a comment) additionally get a
// "transition" segment beforehand. Plain image-after-image pages have no
// transition segment: they replace the previous page instantly.
//
// Pages with a question get extra scroll room after their plain dwell: one
// more scroll step reveals the question (flying in from the screen edge),
// then a further dwell before the next page can appear. This means the
// question only shows up on a deliberate extra scroll, not immediately.
const DWELL_UNITS = 1
const TRANSITION_UNITS = 1
const QUESTION_UNITS = 1

type TransitionKind = 'instant' | 'slide-in' | 'push'

// - 'slide-in': a comment slides up from the bottom, covering the static
//   page underneath.
// - 'push': the image right after a comment slides up from the bottom
//   while the comment itself gets pushed further up and out, so both move
//   together instead of one covering the other.
// - 'instant': plain image-after-image, no animation.
function transitionKind(index: number): TransitionKind {
  const page = pages.value[index]
  if (!page) return 'instant'
  if (page.type === 'comment') return 'slide-in'
  if (pages.value[index - 1]?.type === 'comment') return 'push'
  return 'instant'
}

interface PageUnits {
  transitionStart: number
  transitionLength: number
  dwellStart: number
  questionFlyStart: number
  questionLength: number
}

const pageUnits = computed<PageUnits[]>(() => {
  const result: PageUnits[] = []
  let cursor = 0
  pages.value.forEach((page, index) => {
    const transitionLength = index === 0 ? 0 : transitionKind(index) === 'instant' ? 0 : TRANSITION_UNITS
    const transitionStart = cursor
    const dwellStart = transitionStart + transitionLength

    const questionFlyStart = dwellStart + DWELL_UNITS
    const questionLength = page.question ? QUESTION_UNITS : 0

    result.push({ transitionStart, transitionLength, dwellStart, questionFlyStart, questionLength })
    cursor = questionLength > 0 ? questionFlyStart + questionLength + DWELL_UNITS : questionFlyStart
  })
  return result
})

const totalUnits = computed(() => {
  const n = pageUnits.value.length
  if (!n) return 0
  const last = pageUnits.value[n - 1]
  return last.questionLength > 0
    ? last.questionFlyStart + last.questionLength + DWELL_UNITS
    : last.questionFlyStart
})

// How far page `index` has completed its own incoming transition: 0 = not
// started (hidden below), 1 = fully settled. Plain "instant" pages just
// step from 0 to 1 the moment their dwell begins.
function incomingProgress(index: number): number {
  const unit = pageUnits.value[index]
  if (!unit || !viewportH.value) return 0
  if (unit.transitionLength === 0) {
    return scrollY.value >= unit.dwellStart * viewportH.value ? 1 : 0
  }
  const segmentStart = unit.transitionStart * viewportH.value
  const segmentLength = unit.transitionLength * viewportH.value
  return Math.min(1, Math.max(0, (scrollY.value - segmentStart) / segmentLength))
}

function layerStyle(index: number) {
  let translateY = index === 0 ? 0 : (1 - incomingProgress(index)) * 100

  // If the next page is pushing this one out, ride that progress upward.
  if (transitionKind(index + 1) === 'push') {
    translateY -= incomingProgress(index + 1) * 100
  }

  return { transform: `translateY(${translateY}%)`, zIndex: index + 1 }
}

const activeIndex = computed(() => {
  if (!viewportH.value || !pageUnits.value.length) return 0
  const unit = scrollY.value / viewportH.value
  let active = 0
  for (let i = 1; i < pageUnits.value.length; i++) {
    if (unit >= pageUnits.value[i].dwellStart) active = i
    else break
  }
  return active
})

// Only the currently active layer and the upcoming one stay mounted.
// The next layer is mounted a full dwell phase ahead of time (hidden via
// its transform) so the browser has already decoded/painted it before it
// needs to appear — otherwise an "instant" swap has to decode a full-page
// SVG synchronously at the exact moment it should appear, which is what
// caused the stutter. Everything older is fully removed from the DOM
// instead of merely being covered by z-index.
function isRendered(index: number) {
  return index === activeIndex.value || index === activeIndex.value + 1
}

// 0 = question not revealed yet, 1 = fully flown in and settled.
function questionProgress(index: number): number {
  const unit = pageUnits.value[index]
  if (!unit || !unit.questionLength || !viewportH.value) return 0
  const segmentStart = unit.questionFlyStart * viewportH.value
  const segmentLength = unit.questionLength * viewportH.value
  return Math.min(1, Math.max(0, (scrollY.value - segmentStart) / segmentLength))
}

function showQuestion(index: number): boolean {
  const page = pages.value[index]
  const unit = pageUnits.value[index]
  if (!page?.question || !unit || dismissedQuestions[page.itemIndex]) return false
  if (activeIndex.value !== index || !viewportH.value) return false
  return scrollY.value >= unit.questionFlyStart * viewportH.value
}

// Fly in from whichever screen edge the question sits closer to.
function questionSide(question: QuestionData): 'left' | 'right' {
  const x = question.questionPosition?.x ?? 0
  return x < viewportW.value / 2 ? 'left' : 'right'
}

const dismissedQuestions = reactive<Record<number, boolean>>({})

function onAnswer(itemIndex: number) {
  dismissedQuestions[itemIndex] = true
}
</script>

<template>
  <div class="scroll-story">
    <div class="scroll-story__spacer">
      <div v-for="n in totalUnits" :key="`snap-${n}`" class="scroll-story__snap-point" />
    </div>

    <div class="scroll-story__stage">
      <template v-for="(page, index) in pages" :key="`layer-${index}`">
        <div
          v-if="isRendered(index)"
          class="scroll-story__layer"
          :style="layerStyle(index)"
        >
          <img :src="page.src" class="scroll-story__image" alt="" />
          <QuestionBubble
            v-if="page.question && showQuestion(index)"
            :question="page.question"
            :progress="questionProgress(index)"
            :side="questionSide(page.question)"
            @answer="onAnswer(page.itemIndex)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.scroll-story__spacer {
  position: relative;
}

.scroll-story__snap-point {
  height: 100dvh;
  scroll-snap-align: start;
}

.scroll-story__stage {
  position: fixed;
  inset: 0;
  overflow: hidden;
}

.scroll-story__layer {
  position: absolute;
  inset: 0;
  will-change: transform;
}

.scroll-story__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>

<style>
html {
  scroll-snap-type: y mandatory;
}

body {
  margin: 0;
  overflow-x: hidden;
}
</style>
