<script setup lang="ts">
import type { Component } from 'vue'
import type { Scrollytelling } from '~/composables/surveyAnswers'
import QuestionBubble from './QuestionBubble.vue'

interface QuestionData {
  questionText: string | null
  answer1: string | null
  answer2: string | null
  questionPosition: { x: number; y: number } | null
}

interface CommentWithQuestion {
  src: string
  question?: QuestionData
}

type CommentEntry = string | CommentWithQuestion

interface StoryItem {
  imageSrc: string
  commentSource: string | CommentEntry[] | null
  question: QuestionData
}

interface ChapterRef {
  item: number
  comment?: number
}

interface ChapterData {
  src: string
  after: ChapterRef
  through: ChapterRef
}

interface StoryData {
  items: StoryItem[]
  chapters?: ChapterData[]
  chapterMilestones?: ChapterRef[]
}

function normalizeComment(entry: CommentEntry): { src: string; question: QuestionData | null } {
  if (typeof entry === 'string') return { src: entry, question: null }
  return { src: entry.src, question: entry.question?.questionText ? entry.question : null }
}

interface Page {
  type: 'image' | 'comment'
  src: string
  itemIndex: number
  commentIndex: number | null
  question: QuestionData | null
  isMiddleComment: boolean
}

const props = withDefaults(
  defineProps<{
    dataSrc: string
    bubbleComponent?: Component
    // When all three are given, they slide into view at the bottom of the
    // screen after a deliberate extra scroll past the very last page.
    endBackTop?: string
    endIdeale?: string
    endWeiter?: string
    endWeiterHref?: string
    // Shown at the cursor position while hovering the matching end-link
    // button above.
    endBackTopHover?: string
    endIdealeHover?: string
    endWeiterHover?: string
    // The "conclusion" module: clicking the Ideale button steps through
    // these images one at a time, each sliding up from the bottom like a
    // scroll-triggered page change even though it's click-driven. Currently
    // just one image, but built to grow into a longer sequence.
    endConclusion?: string[]
    // If given, this endConclusion index renders as the interactive
    // draggable-spectrum frame instead of a plain image.
    spectrumStepIndex?: number
    spectrumFillColor?: string
    // The page's own flat canvas color, e.g. matching StoryHeader's `color`
    // — needed by the spectrum frame's submit-button press animation.
    spectrumBackgroundColor?: string
    // Site footer (About/Kontakt/Impressum) — slides up into view after one
    // final deliberate scroll past everything else, then just stays there
    // like an ordinary page footer.
    footerSrc?: string
    // Tint the footer's About/Kontakt/Impressum links take on while clicked.
    footerLinkActiveColor?: string
    // Identifies this story's answers in Supabase (survey_answers.scrollytelling).
    storyName?: Scrollytelling
    // Replaces the spectrum frame (same slot, same layering) once its
    // submit button is clicked.
    feedbackSrc?: string
    // Matches the Zustimmungsrate asset filenames exactly (e.g.
    // "Soziokratie") and is used in the feedback sentence itself.
    feedbackStoryLabel?: string
  }>(),
  { bubbleComponent: () => QuestionBubble, endConclusion: () => [] }
)

const route = useRoute()

// Clicking Ideale unlocks the conclusion sequence — its first image
// (endConclusion[0]) slides up on a timer, same as before. Every image after
// that is reached by further scrolling instead, pushing the previous one
// away exactly like an image pushes a comment away in the main story.
const conclusionStarted = ref(false)
function startConclusion() {
  // Ideale stays mounted and clickable for the rest of the page (there's no
  // "next page" past the end-links to ever make it inactive), so a reader
  // can scroll well beyond where the conclusion sequence actually begins
  // before ever clicking it. The sequence's own push-away math reads scroll
  // position as absolute, not "distance scrolled since the click" — so
  // without this, clicking from far enough down already satisfies the
  // second frame's reveal threshold, skipping the first frame entirely.
  // Snapping back to the sequence's actual start point on click guarantees
  // it always begins at the first frame, requiring a fresh scroll from here
  // to reach the second.
  if (viewportH.value) {
    const startY = conclusionScrollStart.value * viewportH.value
    if (window.scrollY > startY) {
      window.scrollTo({ top: startY })
      // window.scrollTo doesn't update `scrollY` until the browser's async
      // 'scroll' event fires (rAF-throttled on top of that) — so the very
      // first render right after conclusionStarted flips would otherwise
      // still read the old, overscrolled position and render the first
      // frame already partway pushed away (it showed up "further up than
      // usual", i.e. the intended fix above was a no-op on the frame that
      // actually mattered: the first one, right on click). Updating the
      // ref ourselves, synchronously, closes that gap.
      scrollY.value = startY
    }
  }
  conclusionStarted.value = true
}

const emit = defineEmits<{
  'update:currentChapter': [value: number]
  'update:conclusionStarted': [value: boolean]
}>()

// The spectrum frame's submit button replaces it with this, in the same
// slot — no close interaction back to the spectrum yet.
const feedbackVisible = ref(false)
const feedbackAntwort1Count = ref(0)
// This browser's own spectrum slider positions at submit time (0..1 per
// row) — shown back to them on the feedback screen, never persisted.
const feedbackSpectrumValues = ref<number[]>([])
async function onFeedbackSubmit(spectrumValues: number[]) {
  feedbackSpectrumValues.value = spectrumValues
  if (props.storyName) {
    feedbackAntwort1Count.value = await fetchOwnAntwort1Count(props.storyName)
  }
  feedbackVisible.value = true
}

const items = ref<StoryItem[]>([])
const chapters = ref<ChapterData[]>([])
const chapterMilestones = ref<ChapterRef[]>([])

onMounted(async () => {
  const data = await $fetch<StoryData>(props.dataSrc)
  items.value = data.items
  chapters.value = data.chapters ?? []
  chapterMilestones.value = data.chapterMilestones ?? []
  preloadImages()
})

// Warm the browser cache for every image up front so swapping to a page
// that hasn't been rendered yet doesn't have to wait on a fetch + decode.
const preloadedSrcs = new Set<string>()
function preloadImages() {
  for (const item of items.value) {
    const commentEntries = Array.isArray(item.commentSource)
      ? item.commentSource
      : item.commentSource ? [item.commentSource] : []
    const commentSrcs = commentEntries.map(entry => normalizeComment(entry).src)
    for (const src of [item.imageSrc, ...commentSrcs]) {
      if (!src || preloadedSrcs.has(src)) continue
      preloadedSrcs.add(src)
      const img = new Image()
      img.src = src
    }
  }
  for (const chapter of chapters.value) {
    if (!chapter.src || preloadedSrcs.has(chapter.src)) continue
    preloadedSrcs.add(chapter.src)
    const img = new Image()
    img.src = chapter.src
  }
  for (const src of [
    props.endBackTop, props.endIdeale, props.endWeiter,
    props.endBackTopHover, props.endIdealeHover, props.endWeiterHover,
    props.footerSrc,
    ...props.endConclusion
  ]) {
    if (!src || preloadedSrcs.has(src)) continue
    preloadedSrcs.add(src)
    const img = new Image()
    img.src = src
  }
}

const pages = computed<Page[]>(() => {
  const result: Page[] = []
  items.value.forEach((item, itemIndex) => {
    result.push({
      type: 'image',
      src: item.imageSrc,
      itemIndex,
      commentIndex: null,
      question: item.question?.questionText ? item.question : null,
      isMiddleComment: false
    })
    const commentEntries = Array.isArray(item.commentSource)
      ? item.commentSource
      : item.commentSource ? [item.commentSource] : []
    commentEntries.forEach((entry, commentIndex) => {
      // A comment sequence's first entry slides in over the image, and its
      // last entry slides in before the following image pushes it out. Any
      // entries in between just replace one another instantly, the same way
      // consecutive images do.
      const isMiddleComment = commentIndex > 0 && commentIndex < commentEntries.length - 1
      const { src, question } = normalizeComment(entry)
      result.push({ type: 'comment', src, itemIndex, commentIndex, question, isMiddleComment })
    })
  })
  return result
})

// Chapter dividers (e.g. "Chapter_1+2") aren't part of the normal
// image/comment flow: they slide in above everything right after the page
// referenced by `after`, then stay pinned on top — outlasting the usual
// 2-page mount window — until the page right after their `through`
// reference pushes them away.
const pageIndexByRef = computed<Map<string, number>>(() => {
  const map = new Map<string, number>()
  pages.value.forEach((page, index) => {
    const key = page.commentIndex === null ? `${page.itemIndex}` : `${page.itemIndex}:${page.commentIndex}`
    map.set(key, index)
  })
  return map
})

function refKey(ref: ChapterRef): string {
  return ref.comment !== undefined ? `${ref.item - 1}:${ref.comment - 1}` : `${ref.item - 1}`
}

interface ResolvedChapter {
  src: string
  afterPageIndex: number
  throughPageIndex: number
  // Whether `after` names a specific comment (e.g. {item: 13, comment: 9})
  // rather than just an item. That comment is itself the fresh page in a
  // multi-comment sequence, so the chapter syncs with it directly — as
  // opposed to an item-only reference, whose image has already been sitting
  // there settled for a while, so the chapter instead syncs with the next
  // page (that item's own first comment) to get a "simultaneous" entrance.
  afterHasComment: boolean
}

const resolvedChapters = computed<ResolvedChapter[]>(() => {
  const map = pageIndexByRef.value
  const result: ResolvedChapter[] = []
  for (const chapter of chapters.value) {
    const afterPageIndex = map.get(refKey(chapter.after))
    const throughPageIndex = map.get(refKey(chapter.through))
    if (afterPageIndex === undefined || throughPageIndex === undefined) continue
    result.push({ src: chapter.src, afterPageIndex, throughPageIndex, afterHasComment: chapter.after.comment !== undefined })
  }
  return result
})

// Each milestone's position in the array is the chapter number it marks
// the start of (0-based) — e.g. reaching the second milestone sets
// currentChapter to 1. Used to drive a future progress bar.
const chapterMilestonePageIndexes = computed<number[]>(() => {
  const map = pageIndexByRef.value
  return chapterMilestones.value
    .map(milestone => map.get(refKey(milestone)))
    .filter((index): index is number => index !== undefined)
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

// The stage's own rendered height (viewport height minus whatever header
// height the page sets via --header-height) — the actual reference box a
// layer's translateY percentage resolves against, needed to convert the
// footer's real pixel height into an accurate push-up percentage.
const stageRef = ref<HTMLElement | null>(null)
const stageHeight = ref(0)
let stageResizeObserver: ResizeObserver | null = null

function updateStageHeight() {
  stageHeight.value = stageRef.value?.clientHeight ?? 0
}

// The footer's real rendered height, measured directly off the DOM rather
// than derived from window.innerWidth * (170/1920) — that math quietly
// assumed the footer renders at the full window width, but a fixed-position
// element's width is the *content* viewport (window width minus any visible
// scrollbar), so the derived height came out a few pixels taller than the
// real thing wherever a non-overlay scrollbar is present. That difference
// showed up as a persistent gap between the footer and the frame it pushed
// up to make room for itself. clientHeight reads the element's own layout
// box and ignores the translateY reveal transform, so it stays accurate at
// any point in the reveal.
const footerRef = ref<HTMLElement | null>(null)
const footerHeightPx = ref(0)
let footerResizeObserver: ResizeObserver | null = null

function updateFooterHeight() {
  footerHeightPx.value = footerRef.value?.clientHeight ?? 0
}

function onResize() {
  viewportH.value = window.innerHeight
  viewportW.value = window.innerWidth
  updateStageHeight()
}

onMounted(() => {
  viewportH.value = window.innerHeight
  viewportW.value = window.innerWidth
  scrollY.value = window.scrollY
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  updateStageHeight()
  stageResizeObserver = new ResizeObserver(updateStageHeight)
  if (stageRef.value) stageResizeObserver.observe(stageRef.value)
  updateFooterHeight()
  footerResizeObserver = new ResizeObserver(updateFooterHeight)
  if (footerRef.value) footerResizeObserver.observe(footerRef.value)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  stageResizeObserver?.disconnect()
  footerResizeObserver?.disconnect()
  if (finalLinksTimer) clearTimeout(finalLinksTimer)
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
// - 'instant': plain image-after-image, no animation. Also used for the
//   middle entries of a multi-comment sequence, which just replace one
//   another the same way consecutive images do, and for the page right
//   after a chapter's `through` reference — the chapter exits on its own
//   beforehand, so that page just appears normally, uninvolved.
function transitionKind(index: number): TransitionKind {
  const page = pages.value[index]
  if (!page) return 'instant'
  if (page.type === 'comment') return page.isMiddleComment ? 'instant' : 'slide-in'
  if (pages.value[index - 1]?.type === 'comment') return 'push'
  return 'instant'
}

interface PageUnits {
  transitionStart: number
  transitionLength: number
  dwellStart: number
  questionFlyStart: number
  questionLength: number
  questionExitStart: number
  questionExitLength: number
}

// A chapter also reserves its own extra unit segment right after its
// `through` page's dwell — that page settles in fully undisturbed first,
// then the chapter alone slides away, and only after that does the next
// page begin its own (normal, uninvolved) transition.
const chapterExitGapAfterPage = computed<Map<number, number>>(() => {
  const map = new Map<number, number>()
  resolvedChapters.value.forEach(ch => {
    map.set(ch.throughPageIndex, (map.get(ch.throughPageIndex) ?? 0) + 1)
  })
  return map
})

const pageUnits = computed<PageUnits[]>(() => {
  const result: PageUnits[] = []
  let cursor = 0
  pages.value.forEach((page, index) => {
    const transitionLength = index === 0 ? 0 : transitionKind(index) === 'instant' ? 0 : TRANSITION_UNITS
    const transitionStart = cursor
    const dwellStart = transitionStart + transitionLength

    const questionFlyStart = dwellStart + DWELL_UNITS
    const questionLength = page.question ? QUESTION_UNITS : 0

    const unit: PageUnits = {
      transitionStart,
      transitionLength,
      dwellStart,
      questionFlyStart,
      questionLength,
      questionExitStart: 0,
      questionExitLength: 0
    }
    result.push(unit)
    cursor = questionLength > 0 ? questionFlyStart + questionLength + DWELL_UNITS : questionFlyStart

    // An unanswered question gets one more dedicated scroll segment during
    // which it slides back out to the left — this always finishes before
    // any chapter tied to this page starts appearing, so the question and
    // the chapter are never visible at the same time.
    if (questionLength > 0) {
      unit.questionExitStart = cursor
      unit.questionExitLength = TRANSITION_UNITS
      cursor += unit.questionExitLength
    }

    // `cursor` already sits at least a full DWELL_UNITS past this page's own
    // dwellStart at this point (via questionFlyStart, whether or not there
    // actually was a question) — no extra settle needed before the chapter
    // starts sliding away.
    const exitGapCount = chapterExitGapAfterPage.value.get(index) ?? 0
    cursor += exitGapCount * TRANSITION_UNITS
  })
  return result
})

interface ChapterUnits {
  transitionStart: number
  transitionLength: number
  dwellStart: number
  exitStart: number
  exitLength: number
}

// Where a page's timeline settles once its own question (if any) has fully
// flown in, dwelled, and — if left unanswered — exited again. This is the
// earliest point anything else (a following chapter's entry or exit) can
// start, since it already sits a full DWELL_UNITS past the page's own
// dwellStart regardless of whether there was a question.
function pageSettleCursor(unit: PageUnits | undefined): number {
  if (!unit) return 0
  return unit.questionExitLength > 0 ? unit.questionExitStart + unit.questionExitLength : unit.questionFlyStart
}

// An item-only `after` reference (its image already settled a while ago)
// syncs with the next page — that item's own first comment — to get a
// "simultaneous" entrance. A comment-specific `after` reference is itself
// the fresh page to sync with directly — but only when that comment
// actually animates in on its own (a "middle" comment in a multi-comment
// sequence is instant, replacing the previous one with no transition of
// its own to sync with), otherwise it falls back to the same "next page"
// rule as an item-only reference. Shared with isChapterRendered below,
// which needs to know this too: a directly-synced chapter has to mount a
// page earlier than the others to actually be present for that shared
// transition, instead of only appearing once it's already fully settled.
const chapterDirectSync = computed<boolean[]>(() => {
  return resolvedChapters.value.map(ch => {
    const afterPageUnit = pageUnits.value[ch.afterPageIndex]
    const afterHasRealTransition = Boolean(afterPageUnit && afterPageUnit.transitionLength > 0)
    return ch.afterHasComment && afterHasRealTransition
  })
})

const chapterUnits = computed<ChapterUnits[]>(() => {
  return resolvedChapters.value.map((ch, i) => {
    const syncPageIndex = chapterDirectSync.value[i] ? ch.afterPageIndex : ch.afterPageIndex + 1
    const syncPageUnit = pageUnits.value[syncPageIndex]
    const fallbackStart = pageSettleCursor(pageUnits.value[ch.afterPageIndex])
    const transitionStart = syncPageUnit?.transitionStart ?? fallbackStart
    const transitionLength = syncPageUnit?.transitionLength ?? TRANSITION_UNITS
    const dwellStart = syncPageUnit?.dwellStart ?? transitionStart + transitionLength

    // The chapter exits on its own, once its `through` page has settled in
    // fully undisturbed — well before the next page appears.
    const exitStart = pageSettleCursor(pageUnits.value[ch.throughPageIndex])
    const exitLength = TRANSITION_UNITS

    return { transitionStart, transitionLength, dwellStart, exitStart, exitLength }
  })
})

// Only truthy once all three end-of-story elements are given — they always
// appear together.
const hasEndReveal = computed(() => Boolean(props.endBackTop && props.endIdeale && props.endWeiter))

// Same "extra deliberate scroll" idea as a question: once the very last
// page has settled in, a further scroll floats the end-of-story links up
// into place from below, tied 1:1 to scroll like everything else here.
const endRevealStart = computed(() => pageSettleCursor(pageUnits.value[pageUnits.value.length - 1]))

// Where the 3-button reveal (and its trailing buffer) has fully finished —
// the anchor point for the scroll-driven part of the conclusion sequence.
// The trailing DWELL_UNITS isn't for anything visual — it's the same
// one-viewport-height buffer every other segment reserves after itself,
// since the max reachable scroll position is (totalUnits - 1) viewports,
// one short of totalUnits. Without it the float-in could never actually
// reach progress 1 no matter how far down the reader scrolls.
const conclusionScrollStart = computed(() => {
  return hasEndReveal.value ? endRevealStart.value + TRANSITION_UNITS + DWELL_UNITS : endRevealStart.value
})

// The first conclusion image is revealed by clicking Ideale, not by
// scrolling — only images after it need their own reserved scroll segment.
const conclusionExtraSteps = computed(() => Math.max(0, props.endConclusion.length - 1))

// Where everything else (main story, end-links, conclusion sequence) has
// fully finished — the anchor point for the footer's own final reveal
// segment, one deliberate scroll further than anything before it.
const footerRevealStart = computed(() => {
  return conclusionScrollStart.value + conclusionExtraSteps.value * (TRANSITION_UNITS + DWELL_UNITS)
})

const totalUnits = computed(() => {
  if (!pageUnits.value.length) return 0
  return props.footerSrc
    ? footerRevealStart.value + TRANSITION_UNITS + DWELL_UNITS
    : footerRevealStart.value
})

// 0 = still below the screen, 1 = fully floated up into place. Unlike the
// end-links reveal, this one never gets pushed away again — it's the true
// end of the story.
const footerRevealProgress = computed(() => {
  if (!props.footerSrc) return 0
  return progressForUnit({
    transitionStart: footerRevealStart.value,
    transitionLength: TRANSITION_UNITS,
    dwellStart: footerRevealStart.value + TRANSITION_UNITS
  })
})

// The footer's measured height expressed as a percentage of the stage's
// own height — i.e. in the same units as a layer's translateY. Used to
// nudge the last conclusion frame up just far enough to make room for the
// footer as it reveals, and not a pixel further.
const footerHeightPercent = computed(() => {
  if (!props.footerSrc || !footerHeightPx.value || !stageHeight.value) return 0
  return (footerHeightPx.value / stageHeight.value) * 100
})

// How far the reappearing BackTop/Weiter links (which sit at a fixed
// distance from the viewport bottom, not tied to the stage's own height)
// should ride up so the footer doesn't slide up over them — in px, same
// units their own `bottom` offset is in.
const footerPushPx = computed(() => {
  if (!props.footerSrc) return 0
  return footerRevealProgress.value * footerHeightPx.value
})

// 0 = still below the screen, 1 = fully floated up into its resting spot.
const endRevealProgress = computed(() => {
  if (!hasEndReveal.value) return 0
  return progressForUnit({
    transitionStart: endRevealStart.value,
    transitionLength: TRANSITION_UNITS,
    dwellStart: endRevealStart.value + TRANSITION_UNITS
  })
})

// Steps after the first are pure scroll segments — same "push" pattern used
// throughout the story: an image sliding in over (and pushing away) the
// previous page.
function conclusionUnit(index: number) {
  if (index < 1) return undefined
  const start = conclusionScrollStart.value + (index - 1) * (TRANSITION_UNITS + DWELL_UNITS)
  return { transitionStart: start, transitionLength: TRANSITION_UNITS, dwellStart: start + TRANSITION_UNITS }
}

function conclusionIncomingProgress(index: number): number {
  if (index <= 0) return 1
  return progressForUnit(conclusionUnit(index))
}

function conclusionLayerStyle(index: number) {
  // Base z-index has to stay above everything else in the story (chapters,
  // questions, end-links); the +index just keeps later conclusion images
  // stacked above earlier ones among themselves.
  const zIndex = 40000 + index

  // Only a real next conclusion image is allowed to push this one away —
  // querying past the end of `endConclusion` still returns a "unit" (its
  // math has no bounds check), and since the footer reserves its own scroll
  // segment right after the sequence, scrolling into that segment used to
  // satisfy that phantom unit too, sliding the last frame fully away and
  // flashing the story's own last page underneath it.
  const hasNext = index + 1 < props.endConclusion.length
  const nextPushAway = hasNext ? conclusionIncomingProgress(index + 1) * 100 : 0

  if (index === 0) {
    // No inline transform until this layer actually needs to be pushed
    // away — while unset, the click-triggered <Transition> classes keep
    // full control of transform for the initial slide-up-on-click, which
    // an inline style (always higher specificity) would otherwise clobber.
    return nextPushAway > 0 ? { transform: `translateY(${-nextPushAway}%)`, zIndex } : { zIndex }
  }

  // The very last conclusion frame additionally rides the footer's own
  // reveal — nudged up by exactly the footer's rendered height as it
  // slides into view, so the footer has room to sit in front of it without
  // ever pushing it fully out of view.
  const isLast = index === props.endConclusion.length - 1
  const footerPush = isLast ? footerRevealProgress.value * footerHeightPercent.value : 0

  const translateY = (1 - conclusionIncomingProgress(index)) * 100 - nextPushAway - footerPush
  return { transform: `translateY(${translateY}%)`, zIndex }
}

// Unlike the main story (dozens of large images, culled to a 2-page window
// for memory), the conclusion sequence is a handful of small, preloaded
// images — every one of them stays mounted for as long as the conclusion is
// running, with only `transform` moving them on/off screen. Culling by
// "active index" here caused a real bug: the max scroll position lands
// exactly on the fully-settled threshold with no slack, so scrolling back
// up could unmount the previous frame a beat too late, flashing whatever
// sits underneath (the story's own last page) through the gap.
function isConclusionLayerRendered(index: number): boolean {
  return conclusionStarted.value && index < props.endConclusion.length
}

// After the reader has scrolled all the way through the conclusion sequence
// and let it settle for a couple of seconds, the two "real" end-of-story
// links (BackTop restarts this story, Weiter jumps to the other one) float
// back up — same look, same position, same behaviour as their first
// appearance. Ideale doesn't return: its only job was unlocking the
// conclusion, and that's already done.
const lastConclusionIndex = computed(() => props.endConclusion.length - 1)

const conclusionSettled = computed(() => {
  if (!conclusionStarted.value || lastConclusionIndex.value < 0) return false
  return conclusionIncomingProgress(lastConclusionIndex.value) >= 1
})

const finalLinksVisible = ref(false)
let finalLinksTimer: ReturnType<typeof setTimeout> | null = null

watch(conclusionSettled, settled => {
  if (settled) {
    if (finalLinksTimer) return
    finalLinksTimer = setTimeout(() => {
      finalLinksVisible.value = true
      finalLinksTimer = null
    }, 2000)
  } else {
    if (finalLinksTimer) {
      clearTimeout(finalLinksTimer)
      finalLinksTimer = null
    }
    finalLinksVisible.value = false
  }
})

// How far a unit segment has completed its own incoming transition: 0 = not
// started (hidden below), 1 = fully settled. Plain "instant" segments just
// step from 0 to 1 the moment their dwell begins. Shared by normal pages
// and chapter overlays, which each have their own unit segment shape.
function progressForUnit(unit: { transitionStart: number; transitionLength: number; dwellStart: number } | undefined): number {
  if (!unit || !viewportH.value) return 0
  if (unit.transitionLength === 0) {
    return scrollY.value >= unit.dwellStart * viewportH.value ? 1 : 0
  }
  const segmentStart = unit.transitionStart * viewportH.value
  const segmentLength = unit.transitionLength * viewportH.value
  return Math.min(1, Math.max(0, (scrollY.value - segmentStart) / segmentLength))
}

function incomingProgress(index: number): number {
  return progressForUnit(pageUnits.value[index])
}

function pageTranslateY(index: number): number {
  let translateY = index === 0 ? 0 : (1 - incomingProgress(index)) * 100

  // If the next page is pushing this one out, ride that progress upward.
  if (transitionKind(index + 1) === 'push') {
    translateY -= incomingProgress(index + 1) * 100
  }
  return translateY
}

function layerStyle(index: number) {
  return { transform: `translateY(${pageTranslateY(index)}%)`, zIndex: index + 1 }
}

// Rendered as its own top-level layer rather than nested inside the page's
// own element, so it can sit above any chapter overlay (which otherwise
// renders above every normal page) and stay clickable — while still riding
// the same translateY as its page so it moves together with it, e.g.
// during a push-away.
function questionLayerStyle(index: number) {
  return { transform: `translateY(${pageTranslateY(index)}%)`, zIndex: 20000 + index }
}

// Chapters are pinned above every normal page (a fixed high z-index) for as
// long as they're rendered: sliding in once, staying put through everything
// in between, then — once their `through` page has settled — sliding away
// again entirely on their own, uninvolved with whatever page comes next.
function chapterLayerStyle(i: number) {
  const unit = chapterUnits.value[i]
  if (!unit) return { transform: 'translateY(100%)', zIndex: 10000 + i }
  const enterProgress = progressForUnit(unit)
  const exitProgress = progressForUnit({
    transitionStart: unit.exitStart,
    transitionLength: unit.exitLength,
    dwellStart: unit.exitStart + unit.exitLength
  })
  const translateY = (1 - enterProgress) * 100 - exitProgress * 100
  return { transform: `translateY(${translateY}%)`, zIndex: 10000 + i }
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

// The highest milestone reached so far, 0 if none yet.
const currentChapter = computed(() => {
  const indexes = chapterMilestonePageIndexes.value
  let chapter = 0
  for (let i = 0; i < indexes.length; i++) {
    if (activeIndex.value >= indexes[i]) chapter = i
    else break
  }
  return chapter
})

watch(currentChapter, value => emit('update:currentChapter', value), { immediate: true })
watch(conclusionStarted, value => emit('update:conclusionStarted', value), { immediate: true })

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

// Chapters stay mounted for their whole on-screen lifetime — from the
// moment the page they're anchored to becomes active, all the way through
// the page that finally pushes them away — which usually spans far more
// than the normal 2-page window above.
function isChapterRendered(i: number): boolean {
  const chapter = resolvedChapters.value[i]
  if (!chapter) return false
  // A directly-synced chapter shares its very first page's own transition
  // instead of getting a lead-in dwell phase first like every other
  // chapter does — activeIndex only reaches afterPageIndex once that
  // shared transition has already finished (that's what "active" means),
  // so mounting on that condition would skip the transition entirely and
  // just pop in already fully settled. Mounting one page earlier fixes
  // that without touching any other chapter's timing.
  const mountFromPageIndex = chapterDirectSync.value[i] ? chapter.afterPageIndex - 1 : chapter.afterPageIndex
  return activeIndex.value >= mountFromPageIndex && activeIndex.value <= chapter.throughPageIndex + 1
}

// 0 = question not revealed yet, 1 = fully flown in and settled.
function questionProgress(index: number): number {
  const unit = pageUnits.value[index]
  if (!unit || !unit.questionLength || !viewportH.value) return 0
  const segmentStart = unit.questionFlyStart * viewportH.value
  const segmentLength = unit.questionLength * viewportH.value
  return Math.min(1, Math.max(0, (scrollY.value - segmentStart) / segmentLength))
}

// 0 = still settled in place, 1 = fully slid back out to the left. Only
// relevant once the reader has scrolled past the chapter tied to this page
// without answering — the question then rides this segment out on its own,
// distinct from (and before) the next page appearing.
function questionExitProgress(index: number): number {
  const unit = pageUnits.value[index]
  if (!unit || !unit.questionExitLength || !viewportH.value) return 0
  const segmentStart = unit.questionExitStart * viewportH.value
  const segmentLength = unit.questionExitLength * viewportH.value
  return Math.min(1, Math.max(0, (scrollY.value - segmentStart) / segmentLength))
}

function showQuestion(index: number): boolean {
  const page = pages.value[index]
  const unit = pageUnits.value[index]
  if (!page?.question || !unit || dismissedQuestions[index]) return false
  if (activeIndex.value !== index || !viewportH.value) return false
  return scrollY.value >= unit.questionFlyStart * viewportH.value
}

// Fly in from whichever screen edge the question sits closer to.
function questionSide(question: QuestionData): 'left' | 'right' {
  const x = question.questionPosition?.x ?? 0
  return x < viewportW.value / 2 ? 'left' : 'right'
}

const dismissedQuestions = reactive<Record<number, boolean>>({})

// 1-based position among only the pages that actually have a question —
// e.g. "question_number" 1 is whichever page's question appears first in
// the story, regardless of that page's own item index.
const questionNumberByPageIndex = computed<Map<number, number>>(() => {
  const map = new Map<number, number>()
  let count = 0
  pages.value.forEach((page, index) => {
    if (page.question) {
      count += 1
      map.set(index, count)
    }
  })
  return map
})

function onAnswer(index: number, choice: 'answer1' | 'answer2') {
  dismissedQuestions[index] = true

  const question = pages.value[index]?.question
  const questionNumber = questionNumberByPageIndex.value.get(index)
  if (!question || questionNumber === undefined || !props.storyName) return

  saveSurveyAnswer({
    scrollytelling: props.storyName,
    questionNumber,
    choice,
    text: (choice === 'answer1' ? question.answer1 : question.answer2) ?? ''
  })
}

// Mounted for the whole time the reader is dwelling on (or past) the very
// last page, so it's already in the DOM — translated below the screen via
// endRevealProgress — ready to float up smoothly the moment they scroll on.
const showEndLinks = computed(() => hasEndReveal.value && activeIndex.value === pages.value.length - 1)

// While hovering one of the end-links (BackTop/Ideale/Weiter), a matching
// tooltip image floats at the cursor position, following the mouse 1:1.
type EndLinkKey = 'back-top' | 'ideale' | 'weiter'
const hoveredEndLink = ref<EndLinkKey | null>(null)
const hoverPos = reactive({ x: 0, y: 0 })

function onEndLinkHover(key: EndLinkKey, event: MouseEvent) {
  hoveredEndLink.value = key
  hoverPos.x = event.clientX
  hoverPos.y = event.clientY
}

function onEndLinkLeave() {
  hoveredEndLink.value = null
}

const hoverImageSrc = computed(() => {
  if (hoveredEndLink.value === 'back-top') return props.endBackTopHover
  if (hoveredEndLink.value === 'ideale') return props.endIdealeHover
  if (hoveredEndLink.value === 'weiter') return props.endWeiterHover
  return null
})

// Always sits above the cursor. BackTop (leftmost button) opens to the
// top-right, Weiter (rightmost button) opens to the top-left — each tooltip
// opens away from the screen edge its button sits closest to.
const hoverTooltipStyle = computed(() => {
  const opensRight = hoveredEndLink.value === 'back-top'
  return {
    left: `${hoverPos.x}px`,
    top: `${hoverPos.y}px`,
    transform: opensRight
      ? 'translate(16px, -100%) scale(0.72)'
      : 'translate(calc(-100% - 16px), -100%) scale(0.72)',
    transformOrigin: opensRight ? 'bottom left' : 'bottom right'
  }
})

// Lets the chapter progress bar's dots jump straight to a chapter's start
// (chapterMilestonePageIndexes[i] is exactly that page's index — see the
// comment above it). dwellStart is where the page has fully settled in,
// same target every other "scroll to this page" case in here uses.
function scrollToChapter(chapterIndex: number) {
  const pageIndex = chapterMilestonePageIndexes.value[chapterIndex]
  if (pageIndex === undefined || !viewportH.value) return
  const unit = pageUnits.value[pageIndex]
  if (!unit) return
  window.scrollTo({ top: unit.dwellStart * viewportH.value })
}

defineExpose({ scrollToChapter })
</script>

<template>
  <div class="scroll-story">
    <div class="scroll-story__spacer">
      <div v-for="n in totalUnits" :key="`snap-${n}`" class="scroll-story__snap-point" />
    </div>

    <div ref="stageRef" class="scroll-story__stage">
      <template v-for="(page, index) in pages" :key="`layer-${index}`">
        <div
          v-if="isRendered(index)"
          class="scroll-story__layer"
          :style="layerStyle(index)"
        >
          <img :src="page.src" class="scroll-story__image" alt="" />
        </div>
      </template>

      <template v-for="(chapter, i) in resolvedChapters" :key="`chapter-${i}`">
        <div
          v-if="isChapterRendered(i)"
          class="scroll-story__layer scroll-story__layer--chapter"
          :style="chapterLayerStyle(i)"
        >
          <img :src="chapter.src" class="scroll-story__chapter-image" alt="" />
        </div>
      </template>

      <template v-for="(page, index) in pages" :key="`question-${index}`">
        <div
          v-if="page.question && isRendered(index)"
          class="scroll-story__layer"
          :style="questionLayerStyle(index)"
        >
          <component
            :is="bubbleComponent"
            :visible="showQuestion(index)"
            :question="page.question"
            :progress="questionProgress(index)"
            :exit-progress="questionExitProgress(index)"
            :side="questionSide(page.question)"
            @answer="onAnswer(index, $event)"
          />
        </div>
      </template>

      <div
        v-if="showEndLinks"
        class="scroll-story__end-links"
        :style="{ '--reveal': endRevealProgress, '--footer-push': `${footerPushPx}px` }"
      >
        <a
          v-if="endBackTop"
          :href="route.path"
          class="scroll-story__end-link scroll-story__end-link--back-top"
          :class="{ 'scroll-story__end-link--back-top-shifted': conclusionStarted }"
          aria-label="Zurück zum Seitenanfang"
          @mousemove="onEndLinkHover('back-top', $event)"
          @mouseleave="onEndLinkLeave"
        >
          <img :src="endBackTop" class="scroll-story__end-link-img" alt="" />
        </a>
        <button
          v-if="endIdeale"
          type="button"
          class="scroll-story__end-link scroll-story__end-link--ideale"
          aria-label="Weiter"
          @click="startConclusion"
          @mousemove="onEndLinkHover('ideale', $event)"
          @mouseleave="onEndLinkLeave"
        >
          <img :src="endIdeale" class="scroll-story__end-link-img" alt="" />
        </button>
        <NuxtLink
          v-if="endWeiter"
          :to="endWeiterHref"
          class="scroll-story__end-link scroll-story__end-link--weiter"
          aria-label="Zur nächsten Geschichte"
          @mousemove="onEndLinkHover('weiter', $event)"
          @mouseleave="onEndLinkLeave"
        >
          <img :src="endWeiter" class="scroll-story__end-link-img" alt="" />
        </NuxtLink>
      </div>

      <Transition name="scroll-story__conclusion">
        <div
          v-if="isConclusionLayerRendered(0)"
          class="scroll-story__conclusion"
          :style="conclusionLayerStyle(0)"
        >
          <img :src="endConclusion[0]" class="scroll-story__conclusion-image" alt="" />
        </div>
      </Transition>

      <template v-for="(src, index) in endConclusion" :key="`conclusion-${index}`">
        <div
          v-if="index > 0 && isConclusionLayerRendered(index)"
          class="scroll-story__conclusion"
          :style="conclusionLayerStyle(index)"
        >
          <FeedbackFrame
            v-if="index === spectrumStepIndex && feedbackVisible && feedbackSrc && feedbackStoryLabel"
            :background-src="feedbackSrc"
            :story-label="feedbackStoryLabel"
            :count="feedbackAntwort1Count"
            :background-color="spectrumBackgroundColor ?? '#ffffff'"
            :fill-color="spectrumFillColor ?? '#0036ff'"
            :spectrum-values="feedbackSpectrumValues"
          />
          <SpectrumConclusionFrame
            v-else-if="index === spectrumStepIndex"
            :background-src="src"
            :fill-color="spectrumFillColor ?? '#0036ff'"
            :background-color="spectrumBackgroundColor ?? '#ffffff'"
            @submit="onFeedbackSubmit"
          />
          <img v-else :src="src" class="scroll-story__conclusion-image" alt="" />
        </div>
      </template>

      <Transition name="scroll-story__final-links">
        <div
          v-if="finalLinksVisible"
          class="scroll-story__end-links scroll-story__final-links"
          :style="{ '--footer-push': `${footerPushPx}px` }"
        >
          <a
            v-if="endBackTop"
            :href="route.path"
            class="scroll-story__end-link scroll-story__end-link--back-top"
            :class="{ 'scroll-story__end-link--back-top-shifted': conclusionStarted }"
            aria-label="Zurück zum Seitenanfang"
            @mousemove="onEndLinkHover('back-top', $event)"
            @mouseleave="onEndLinkLeave"
          >
            <img :src="endBackTop" class="scroll-story__end-link-img" alt="" />
          </a>
          <NuxtLink
            v-if="endWeiter"
            :to="endWeiterHref"
            class="scroll-story__end-link scroll-story__end-link--weiter"
            aria-label="Zur nächsten Geschichte"
            @mousemove="onEndLinkHover('weiter', $event)"
            @mouseleave="onEndLinkLeave"
          >
            <img :src="endWeiter" class="scroll-story__end-link-img" alt="" />
          </NuxtLink>
        </div>
      </Transition>

      <div
        v-if="footerSrc"
        ref="footerRef"
        class="scroll-story__footer"
        :style="{ '--reveal': footerRevealProgress }"
      >
        <img :src="footerSrc" class="scroll-story__footer-image" alt="" />
        <nav class="scroll-story__footer-links" aria-label="Footer">
          <NuxtLink to="/about" class="scroll-story__footer-link TypeButton_About" aria-label="About" />
          <NuxtLink to="/kontakt" class="scroll-story__footer-link TypeButton_Kontakt" aria-label="Kontakt" />
          <NuxtLink to="/impressum" class="scroll-story__footer-link TypeButton_Impressum" aria-label="Impressum" />
        </nav>
      </div>

      <img
        v-if="hoverImageSrc"
        :src="hoverImageSrc"
        class="scroll-story__hover-tooltip"
        :style="hoverTooltipStyle"
        alt=""
      />
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
  top: var(--header-height, 0px);
  left: 0;
  right: 0;
  bottom: 0;
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

.scroll-story__layer--chapter {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.scroll-story__chapter-image {
  height: 100%;
  width: auto;
  max-width: none;
  display: block;
}

.scroll-story__end-links {
  position: fixed;
  inset: 0;
  z-index: 25000;
  pointer-events: none;
}

.scroll-story__end-link {
  position: absolute;
  bottom: 60px;
  display: block;
  /* 0 = fully below the screen, 1 = resting in place — floats up 1:1 with
     scroll via the --reveal custom property set on the parent. */
  --float: calc((1 - var(--reveal, 1)) * 100%);
}

.scroll-story__end-link--back-top {
  left: 100px;
  pointer-events: auto;
  /* Scroll-driven float plus, on the reappearing final-links instance, a
     footer-synced upward nudge (0px on the first instance, which never
     sets --footer-push) — kept transition-free so both track scroll 1:1.
     The interactive scale lives on the img inside. */
  transform: translateY(calc(50% + var(--float) - var(--footer-push, 0px)));
  transition: left 0.3s ease;
}

/* Once the conclusion sequence starts (endConclusion[0] is showing), the
   chapter progress bar it used to share the left edge with is hidden — slide
   over to reclaim that space. */
.scroll-story__end-link--back-top-shifted {
  left: 20px;
}

.scroll-story__end-link-img {
  display: block;
  cursor: pointer;
  transform: scale(0.72);
  transition: transform 0.15s ease;
}

.scroll-story__end-link-img:hover {
  transform: scale(0.82);
}

.scroll-story__end-link-img:active {
  transform: scale(0.62);
}

.scroll-story__end-link--ideale {
  left: 50%;
  appearance: none;
  border: none;
  background: none;
  padding: 0;
  pointer-events: auto;
  /* Scroll-driven float plus the same footer-synced upward nudge as
     BackTop/Weiter, transition-free so all three track scroll 1:1. The
     interactive scale lives on the img inside. */
  transform: translate(-50%, calc(50% + var(--float) - var(--footer-push, 0px)));
}

.scroll-story__end-link--weiter {
  right: 15px;
  pointer-events: auto;
  /* Scroll-driven float plus, on the reappearing final-links instance, a
     footer-synced upward nudge (0px on the first instance, which never
     sets --footer-push) — kept transition-free so both track scroll 1:1.
     The interactive scale lives on the img inside. */
  transform: translateY(calc(50% + var(--float) - var(--footer-push, 0px)));
}

.scroll-story__conclusion {
  position: fixed;
  top: var(--header-height, 0px);
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40000;
}

.scroll-story__conclusion-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Slides up from below like a scroll-triggered page change, even though
   it's actually click-driven. */
.scroll-story__conclusion-enter-active {
  transition: transform 0.6s ease;
}

.scroll-story__conclusion-enter-from {
  transform: translateY(100%);
}

.scroll-story__final-links {
  z-index: 45000;
}

.scroll-story__final-links-enter-active {
  transition: transform 0.6s ease;
}

.scroll-story__final-links-enter-from {
  transform: translateY(100%);
}

.scroll-story__hover-tooltip {
  position: fixed;
  z-index: 50000;
  pointer-events: none;
}

.scroll-story__footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 46000;
  line-height: 0;
  pointer-events: none;
  /* 0 = fully below the screen, 1 = resting in place — floats up 1:1 with
     scroll via the --reveal custom property, same idea as the end-links,
     except this one never gets pushed away again. */
  transform: translateY(calc((1 - var(--reveal, 0)) * 100%));
}

.scroll-story__footer-image {
  display: block;
  width: 100%;
  height: auto;
}

.scroll-story__footer-links {
  position: absolute;
  inset: 0;
  pointer-events: auto;
}

/* Hotzones sit over the "About"/"Kontakt"/"Impressum" text baked into the
   footer SVG itself — positions are read off that SVG's own path data
   (viewBox 0 0 1920 122, shared by both the Soziokratie and Technokratie
   footer), expressed as percentages so they still line up however wide the
   footer is rendered. */
.scroll-story__footer-link {
  position: absolute;
  top: 39.2%;
  height: 25.5%;
  display: block;
}

.TypeButton_About {
  left: 74.8%;
  width: 4.15%;
}

.TypeButton_Kontakt {
  left: 81.5%;
  width: 5.7%;
}

.TypeButton_Impressum {
  left: 89.8%;
  width: 7.35%;
}

/* The "About"/"Kontakt"/"Impressum" text baked into the footer image is
   pure white — multiply blend mode on a white backdrop reproduces the
   overlay color exactly (255 * c / 255 = c), so this tints the text to
   footerLinkActiveColor while clicked without needing a separate real-text
   layer on top of the image. */
.TypeButton_About:active,
.TypeButton_Kontakt:active,
.TypeButton_Impressum:active {
  background-color: v-bind(footerLinkActiveColor);
  mix-blend-mode: multiply;
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
