<script setup lang="ts">
const props = defineProps<{
  backgroundSrc: string
  fillColor: string
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

const ROWS: Row[] = [
  { y: 243.5, trackX: 610, trackWidth: 674, initial: 0.01 },
  { y: 402.5, trackX: 607.5, trackWidth: 674, initial: 0.21 },
  { y: 561.5, trackX: 607.5, trackWidth: 674, initial: 0.5 },
  { y: 720.5, trackX: 603.5, trackWidth: 674, initial: 0.996 }
]

const values = ref(ROWS.map(row => row.initial))

const svgRef = ref<SVGSVGElement | null>(null)
let draggingIndex = -1

function trackBounds(row: Row) {
  return { left: row.trackX + HALF_TRACK, right: row.trackX + row.trackWidth - HALF_TRACK }
}

function handleX(index: number): number {
  const { left, right } = trackBounds(ROWS[index])
  return left + values.value[index] * (right - left)
}

function fillWidth(index: number): number {
  return Math.max(0, handleX(index) - ROWS[index].trackX)
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
        :x="row.trackX"
        :y="row.y - HALF_TRACK"
        :width="fillWidth(index)"
        :height="TRACK_HEIGHT"
        :rx="HALF_TRACK"
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
</style>
