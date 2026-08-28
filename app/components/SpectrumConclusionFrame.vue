<script setup lang="ts">
const props = defineProps<{
  backgroundSrc: string
  fillColor: string
  // The page's own flat canvas color (e.g. the `#CCD7FF`/`#CCE9CC` rect
  // behind everything else in the source SVG) — needed to paint over the
  // baked-in submit button so its own press animation can shrink without a
  // static, full-size copy of it showing through underneath.
  backgroundColor: string
}>()

// Straight from the source SVGs (both stories share the same track layout,
// only the colors differ). Each row's initial value is the position its
// baked-in "Button" used to sit at before it was pulled out into this
// interactive overlay.
interface Row {
  y: number
  trackX: number
  trackWidth: number
  initial: number
}

const TRACK_HEIGHT = 36
const HANDLE_RADIUS = 25.5
const HALF_TRACK = TRACK_HEIGHT / 2

// Keeps the fill bar just inside the track's own black outline (stroke-width
// 3, so 1.5px is exactly half of it) on the sides where that outline is
// actually visible — top, bottom, and the free right end. Not the left end,
// which sits under the handle regardless.
const FILL_INSET = 1.5
const FILL_HEIGHT = TRACK_HEIGHT - FILL_INSET * 2
const FILL_RADIUS = FILL_HEIGHT / 2

const ROWS: Row[] = [
  { y: 243.5, trackX: 620, trackWidth: 674, initial: 0.5 },
  { y: 402.5, trackX: 617.5, trackWidth: 674, initial: 0.5 },
  { y: 561.5, trackX: 617.5, trackWidth: 674, initial: 0.5 },
  { y: 720.5, trackX: 616.5, trackWidth: 674, initial: 0.5 }
]

// Hit area for the baked-in "Button_Submit" box in the background artwork —
// its own click behaviour isn't defined yet, so this only emits for now.
// Matches the source SVGs' own drop-shadow filter bounds (x=743 y=832
// width=423 height=85), not just the flat button rect (748,832,418,80) —
// using the tighter rect left the shadow outside the shrink-on-click
// cutout, so it stayed full-size while the button itself shrank.
const SUBMIT_BOUNDS = { x: 743, y: 832, width: 423, height: 85 }

const values = ref(ROWS.map(row => row.initial))

// One value per row (0..1, left..right), so the feedback screen can show
// this same user's own choices back to them.
const emit = defineEmits<{ submit: [values: number[]] }>()

const svgRef = ref<SVGSVGElement | null>(null)
let draggingIndex = -1

function trackBounds(row: Row) {
  return { left: row.trackX + HALF_TRACK, right: row.trackX + row.trackWidth - HALF_TRACK }
}

function handleX(index: number): number {
  const { left, right } = trackBounds(ROWS[index])
  return left + values.value[index] * (right - left)
}

// The "Answer 1" bar is anchored to the right edge of the track (matching
// the baked-in bar in the new background SVGs, which runs from the handle
// to the track's own rounded right end) — it grows as the handle moves left,
// not right. Its left edge sits under the handle, same trick as before: the
// handle's radius is larger than the track's own rounding, so that end is
// always hidden regardless of which side it's on.
function fillX(index: number): number {
  return handleX(index)
}

function fillWidth(index: number): number {
  const row = ROWS[index]
  return Math.max(0, row.trackX + row.trackWidth - handleX(index) - FILL_INSET)
}

function clientXToValue(index: number, clientX: number, clientY: number): number {
  const svg = svgRef.value
  if (!svg) return values.value[index]
  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return values.value[index]
  const svgPoint = point.matrixTransform(ctm.inverse())
  const { left, right } = trackBounds(ROWS[index])
  return Math.min(1, Math.max(0, (svgPoint.x - left) / (right - left)))
}

function onPointerDown(index: number, event: PointerEvent) {
  draggingIndex = index
  ;(event.target as Element).setPointerCapture(event.pointerId)
  values.value[index] = clientXToValue(index, event.clientX, event.clientY)
}

function onPointerMove(event: PointerEvent) {
  if (draggingIndex === -1) return
  values.value[draggingIndex] = clientXToValue(draggingIndex, event.clientX, event.clientY)
}

function onPointerUp() {
  draggingIndex = -1
}

// Brief press feedback on click: shrink by 0.1, then back to full size.
const submitPressed = ref(false)
let submitPressTimer: ReturnType<typeof setTimeout> | null = null

function onSubmitClick() {
  submitPressed.value = true
  if (submitPressTimer) clearTimeout(submitPressTimer)
  submitPressTimer = setTimeout(() => {
    submitPressed.value = false
    submitPressTimer = null
  }, 150)
  emit('submit', values.value.slice())
}
</script>

<template>
  <svg
    ref="svgRef"
    class="spectrum-frame"
    viewBox="0 0 1920 1080"
    preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <image :href="backgroundSrc" x="0" y="0" width="1920" height="1080" />
    <g v-for="(row, index) in ROWS" :key="index">
      <rect
        :x="fillX(index)"
        :y="row.y - HALF_TRACK + FILL_INSET"
        :width="fillWidth(index)"
        :height="FILL_HEIGHT"
        :rx="FILL_RADIUS"
        :fill="fillColor"
      />
      <circle
        class="spectrum-frame__handle"
        :cx="handleX(index)"
        :cy="row.y"
        :r="HANDLE_RADIUS"
        fill="white"
        stroke="black"
        stroke-width="3"
        @pointerdown="onPointerDown(index, $event)"
      />
    </g>
    <!-- Covers the baked-in button in the base image with the page's own
         flat background color, so the cutout below can shrink without the
         full-size original showing through around its edges. -->
    <rect
      :x="SUBMIT_BOUNDS.x"
      :y="SUBMIT_BOUNDS.y"
      :width="SUBMIT_BOUNDS.width"
      :height="SUBMIT_BOUNDS.height"
      :fill="backgroundColor"
    />
    <!-- An independently-transformable "cutout" of just the button's own
         pixels, cropped from the same background image via a nested
         viewport — this is what actually shrinks on click. -->
    <svg
      class="spectrum-frame__submit"
      :class="{ 'spectrum-frame__submit--pressed': submitPressed }"
      :x="SUBMIT_BOUNDS.x"
      :y="SUBMIT_BOUNDS.y"
      :width="SUBMIT_BOUNDS.width"
      :height="SUBMIT_BOUNDS.height"
      :viewBox="`${SUBMIT_BOUNDS.x} ${SUBMIT_BOUNDS.y} ${SUBMIT_BOUNDS.width} ${SUBMIT_BOUNDS.height}`"
      @click="onSubmitClick"
    >
      <image :href="backgroundSrc" x="0" y="0" width="1920" height="1080" />
    </svg>
  </svg>
</template>

<style scoped>
.spectrum-frame {
  width: 100%;
  height: 100%;
  display: block;
}

.spectrum-frame__handle {
  cursor: grab;
  touch-action: none;
}

.spectrum-frame__handle:active {
  cursor: grabbing;
}

.spectrum-frame__submit {
  cursor: pointer;
  /* SUBMIT_BOUNDS' own center, in the outer <svg>'s user-space coordinates
     (its default transform-origin reference, since this element sits
     inside that viewport). */
  transform-origin: 954.5px 874.5px;
  transition: transform 0.15s ease;
}

.spectrum-frame__submit--pressed {
  transform: scale(0.9);
}
</style>
