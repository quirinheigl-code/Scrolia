<script setup lang="ts">
const props = defineProps<{
  backgroundSrc: string
  // Used both to build the Zustimmungsrate asset path (matches the
  // filenames exactly, e.g. "Soziokratie") and in the summary sentence.
  storyLabel: string
  // How many of the 8 questions this browser answered "Antwort 1".
  count: number
  // The page's own flat canvas color — needed to erase each card's
  // original footprint before drawing its shifted replacement, without
  // moving the flat background itself.
  backgroundColor: string
  // Same accent used for the spectrum frame's own fill bars (e.g.
  // "#99AFFF"/"#99D39A") — the "Ideale & Interessen" bars reuse it.
  fillColor: string
  // This browser's own spectrum slider positions at submit time (0..1 per
  // row, same order as the spectrum frame's rows) — shown back to them
  // here instead of the design's baked-in (~50%) example.
  spectrumValues: number[]
}>()

// One pre-rendered donut graphic per possible count — same layout in both
// stories, only the colors differ (baked into each file already).
const PERCENT_SUFFIXES = ['0', '12,5', '25', '37,5', '50', '62,5', '75', '87,5', '100']

const zustimmungsrateSuffix = computed(() => PERCENT_SUFFIXES[props.count] ?? PERCENT_SUFFIXES[0])

const zustimmungsrateSrc = computed(
  () => `/images/Feedback/${props.storyLabel}_Zustimmungsrate-${zustimmungsrateSuffix.value}.svg`
)

// Pre-rendered per-count "Du stimmst in X von 8 Punkten..." sentence, pixel-
// exact (unlike a live-text reconstruction, which can't reproduce the
// design's own flattened font).
const summarySrc = computed(
  () => `/images/Feedback/${props.storyLabel}_Zustimmungsrate-${zustimmungsrateSuffix.value}-Satz.svg`
)

// Straight from the source SVGs' own drop-shadow filter bounds (each card's
// visible extent, shadow included) — identical in both stories.
const QUESTIONS_BOX = { x: 242.5, y: 99.5, width: 653.703, height: 890.199 }
const IDEALS_BOX = { x: 916.602, y: 99.5, width: 751.797, height: 767.801 }
const SHARE_BOX = { x: 1565, y: 886, width: 103, height: 103 }

// The baked-in share icon has no click behaviour of its own — this hands it
// off to whatever the browser's own share affordance is: the native share
// sheet where supported (iOS/Android/most desktop browsers today), falling
// back to just copying the link where it isn't (e.g. older desktop Firefox).
async function onShareClick() {
  const shareData = { title: document.title, url: window.location.href }
  if (navigator.share) {
    try {
      await navigator.share(shareData)
    } catch {
      // User cancelled the share sheet, or the platform rejected it — either
      // way there's nothing useful to recover into, so this is a silent no-op.
    }
    return
  }
  await navigator.clipboard?.writeText(shareData.url)
}

const SHIFT_UP = 15

// Moves a box up by re-pointing its own nested-viewport position (x/y),
// sampling the exact same crop of the background image at a new spot.
function shiftY(y: number): number {
  return y - SHIFT_UP
}

// The cover rect has to fully swallow the original, un-shifted card —
// shadow included. That shadow is a hard-edged (unblurred) offset
// silhouette, so any gap between the cover rect and its true extent shows
// up as a crisp sliver, not a soft fade — hence the generous padding here,
// well past the source SVG's own declared drop-shadow filter bounds.
function eraseBox(box: { x: number; y: number; width: number; height: number }) {
  const PAD = 20
  return {
    x: box.x - PAD,
    y: shiftY(box.y) - PAD,
    width: box.width + PAD * 2,
    height: box.height + SHIFT_UP + PAD * 2
  }
}

// The "Ideale & Interessen" panel's own 4 sliders — same track/handle
// layout as the spectrum frame's, scaled down to fit this smaller card.
// Straight from the source SVGs (identical in both stories, only the
// accent color differs — that comes from `fillColor`).
interface IdealsRow {
  y: number
  trackX: number
  trackWidth: number
  // The small fixed reference tick above each row — doesn't move with the
  // handle, so it's redrawn once per row rather than derived.
  lineX: number
  lineY1: number
  lineY2: number
}

const IDEALS_TRACK_HEIGHT = 32.4
const IDEALS_HANDLE_RADIUS = 22.95
const IDEALS_HALF_TRACK = IDEALS_TRACK_HEIGHT / 2
const IDEALS_FILL_INSET = 1.35
const IDEALS_FILL_HEIGHT = IDEALS_TRACK_HEIGHT - IDEALS_FILL_INSET * 2
const IDEALS_FILL_RADIUS = IDEALS_FILL_HEIGHT / 2

const IDEALS_ROWS: IdealsRow[] = [
  { y: 294.601, trackX: 995.58, trackWidth: 606.6, lineX: 1300.23, lineY1: 259.5, lineY2: 330.6 },
  { y: 434.101, trackX: 993.33, trackWidth: 606.6, lineX: 1297.98, lineY1: 399, lineY2: 470.1 },
  { y: 573.601, trackX: 993.33, trackWidth: 606.6, lineX: 1297.98, lineY1: 538.5, lineY2: 609.6 },
  { y: 713.101, trackX: 989.728, trackWidth: 606.6, lineX: 1294.38, lineY1: 678, lineY2: 749.1 }
]

// Falls back to the design's own centered default if a value is missing.
function idealsValue(index: number): number {
  return props.spectrumValues[index] ?? 0.5
}

function idealsTrackBounds(row: IdealsRow) {
  return { left: row.trackX + IDEALS_HALF_TRACK, right: row.trackX + row.trackWidth - IDEALS_HALF_TRACK }
}

function idealsHandleX(index: number): number {
  const { left, right } = idealsTrackBounds(IDEALS_ROWS[index])
  return left + idealsValue(index) * (right - left)
}

// Same right-anchored fill as the spectrum frame's own bars.
function idealsFillWidth(index: number): number {
  const row = IDEALS_ROWS[index]
  return Math.max(0, row.trackX + row.trackWidth - idealsHandleX(index) - IDEALS_FILL_INSET)
}

// Covers a whole row (track pill + handle, which sticks out a bit past the
// pill's own height) so it can be redrawn at this browser's own value.
function idealsRowCover(row: IdealsRow) {
  const pad = 10
  return {
    x: row.trackX - pad,
    y: shiftY(row.y - IDEALS_HANDLE_RADIUS - pad),
    width: row.trackWidth + pad * 2,
    height: IDEALS_HANDLE_RADIUS * 2 + pad * 2
  }
}
</script>

<template>
  <svg
    class="feedback-frame"
    viewBox="0 0 1920 1080"
    preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
  >
    <image :href="backgroundSrc" x="0" y="0" width="1920" height="1080" />

    <!-- Each of these three moves up on its own, independent of the flat
         background behind them — a plain background-color rect first
         erases the original spot so it doesn't show through underneath. -->
    <rect v-bind="eraseBox(QUESTIONS_BOX)" :fill="backgroundColor" />
    <svg
      :x="QUESTIONS_BOX.x"
      :y="shiftY(QUESTIONS_BOX.y)"
      :width="QUESTIONS_BOX.width"
      :height="QUESTIONS_BOX.height"
      :viewBox="`${QUESTIONS_BOX.x} ${QUESTIONS_BOX.y} ${QUESTIONS_BOX.width} ${QUESTIONS_BOX.height}`"
    >
      <image :href="backgroundSrc" x="0" y="0" width="1920" height="1080" />
    </svg>
    <!-- The baked-in example donut + percentage in the background shows
         through here otherwise — the Zustimmungsrate variants only draw
         their own ring/number, with a transparent background. -->
    <rect x="290.5" :y="shiftY(239.102)" width="566.7" height="557.7" fill="white" />
    <image :href="zustimmungsrateSrc" x="290.5" :y="shiftY(239.102)" width="566.7" height="557.7" />
    <!-- The baked-in example sentence in the background is covered here —
         it's flattened vector paths, not live text, so it can't be edited
         in place. -->
    <rect x="289" :y="shiftY(819.898)" width="569.7" height="123.3" fill="white" />
    <image :href="summarySrc" x="289" :y="shiftY(819.898)" width="568" height="117" />

    <rect v-bind="eraseBox(IDEALS_BOX)" :fill="backgroundColor" />
    <svg
      :x="IDEALS_BOX.x"
      :y="shiftY(IDEALS_BOX.y)"
      :width="IDEALS_BOX.width"
      :height="IDEALS_BOX.height"
      :viewBox="`${IDEALS_BOX.x} ${IDEALS_BOX.y} ${IDEALS_BOX.width} ${IDEALS_BOX.height}`"
    >
      <image :href="backgroundSrc" x="0" y="0" width="1920" height="1080" />
    </svg>
    <!-- This browser's own choices, drawn fresh on top of the card's
         static (baked at ~50%) example — same track/handle/fill recipe as
         the interactive spectrum frame, just read-only here. -->
    <g v-for="(row, index) in IDEALS_ROWS" :key="index">
      <rect v-bind="idealsRowCover(row)" fill="white" />
      <line
        :x1="row.lineX"
        :y1="shiftY(row.lineY1)"
        :x2="row.lineX"
        :y2="shiftY(row.lineY2)"
        stroke="black"
        stroke-width="2.7"
      />
      <rect
        :x="row.trackX"
        :y="shiftY(row.y - IDEALS_HALF_TRACK)"
        :width="row.trackWidth"
        :height="IDEALS_TRACK_HEIGHT"
        :rx="IDEALS_HALF_TRACK"
        fill="white"
        stroke="black"
        stroke-width="2.7"
      />
      <rect
        :x="idealsHandleX(index)"
        :y="shiftY(row.y - IDEALS_HALF_TRACK + IDEALS_FILL_INSET)"
        :width="idealsFillWidth(index)"
        :height="IDEALS_FILL_HEIGHT"
        :rx="IDEALS_FILL_RADIUS"
        :fill="fillColor"
      />
      <circle
        :cx="idealsHandleX(index)"
        :cy="shiftY(row.y)"
        :r="IDEALS_HANDLE_RADIUS"
        fill="white"
        stroke="black"
        stroke-width="2.7"
      />
    </g>

    <rect v-bind="eraseBox(SHARE_BOX)" :fill="backgroundColor" />
    <svg
      class="feedback-frame__share"
      :x="SHARE_BOX.x"
      :y="shiftY(SHARE_BOX.y)"
      :width="SHARE_BOX.width"
      :height="SHARE_BOX.height"
      :viewBox="`${SHARE_BOX.x} ${SHARE_BOX.y} ${SHARE_BOX.width} ${SHARE_BOX.height}`"
      @click="onShareClick"
    >
      <image :href="backgroundSrc" x="0" y="0" width="1920" height="1080" />
    </svg>
  </svg>
</template>

<style scoped>
.feedback-frame {
  width: 100%;
  height: 100%;
  display: block;
}

.feedback-frame__share {
  cursor: pointer;
}
</style>
