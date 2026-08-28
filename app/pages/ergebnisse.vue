<script setup lang="ts">
type BarometerStory = 'technokratie' | 'soziokratie'

const BAROMETER_SRC: Record<BarometerStory, string> = {
  technokratie: '/images/Barometer/Barometer_Technokratie.svg',
  soziokratie: '/images/Barometer/Barometer_Soziokratie.svg'
}

// Both files bake in the same "Technokratie"/"Soziokratie" toggle right under
// the page heading, but the exported SVGs carry no ids on them — the only
// way to tell them apart afterwards is their stroke color, which matches
// this app's own story color convention used everywhere else (e.g. the
// spectrum frames' fillColor: green = Technokratie, blue = Soziokratie).
const BUTTON_STROKE: Record<BarometerStory, string> = {
  technokratie: '#009002',
  soziokratie: '#0036FF'
}

const activeStory = ref<BarometerStory>('technokratie')
const barometerContainer = ref<HTMLDivElement | null>(null)
// Off-screen but still attached to the document — an SVG detached entirely
// from the document can't reliably answer getBBox() (used all over the
// finder functions below), so the next story is built here, out of sight,
// and only moved into `barometerContainer` once fully rendered.
const stagingContainer = ref<HTMLDivElement | null>(null)

// The same stroke color is also used on the small round question-icon
// badges further down the page, so color alone isn't unique — the toggle
// button is the only match that's a wide pill rather than a square badge.
function findToggleButton(root: SVGSVGElement, story: BarometerStory): SVGGElement | null {
  const groups = Array.from(root.children).filter(
    (el): el is SVGGElement => el.tagName === 'g' && el.hasAttribute('filter')
  )
  return (
    groups.find(g => {
      const rect = g.querySelector<SVGRectElement>(`rect[stroke="${BUTTON_STROKE[story]}"]`)
      if (!rect) return false
      const bbox = rect.getBBox()
      return bbox.width > bbox.height * 2
    }) ?? null
  )
}

function setupToggleButtons(root: SVGSVGElement) {
  ;(['technokratie', 'soziokratie'] as const).forEach(story => {
    const button = findToggleButton(root, story)
    if (!button) return
    button.style.cursor = 'pointer'
    button.addEventListener('click', () => {
      switchStory(story)
    })
  })
}

// The 8 question modules sit in a 4-row x 2-column grid, read left-to-right
// then top-to-bottom (question_number 1..8) — straight from the source
// SVGs' own row/column layout, identical in both files. Each row's chart
// spans a fixed 469.5px from its 100% gridline down to its 0% baseline.
const BAR_ROWS = [
  { axisTop: 785, baseline: 1254.5 },
  { axisTop: 1627, baseline: 2096.5 },
  { axisTop: 2469, baseline: 2938.5 },
  { axisTop: 3311, baseline: 3780.5 }
]
const BAR_COLS = [
  { barAX: 319, barBX: 587.5 },
  { barAX: 1259, barBX: 1527.5 }
]
const BAR_WIDTH = 103
const BAR_RANGE = 469.5
// Both bars in a row share the same bottom edge regardless of height — this
// is what keeps them sitting flush on the row's own baseline stroke.
const BAR_BOTTOM_INSET = 1.5

// "A" is always the left/saturated bar, "B" the right/pastel one — same
// color pairing as the toggle buttons above, just with the light variants
// for B added in.
const BAR_COLOR_A = BUTTON_STROKE
const BAR_COLOR_B: Record<BarometerStory, string> = {
  technokratie: '#CCE9CC',
  soziokratie: '#CCD7FF'
}

// Calibrated against the source SVGs' own baked-in "50%" placeholder glyphs
// (flattened text, ~42px tall) in PP Neue Montreal Mono Medium: at font-size
// 100 that font's own ascent/descent for this glyph shape measure 96/24px,
// so scaled to size 35 that's 33.6/8.4 — used below to convert "the label's
// bottom should sit 25.2px above the bar's own top" into the y (baseline)
// attribute SVG text actually takes.
const LABEL_FONT_SIZE = 35
const LABEL_GAP_ABOVE_BAR = 25.2
const LABEL_ASCENT = 33.6
const LABEL_DESCENT = 8.4
const LABEL_BASELINE_OFFSET = LABEL_GAP_ABOVE_BAR + LABEL_DESCENT
// Near 100%, "gap above the bar" would push the label above the row's own
// 100% gridline and into the question text above it — clamped so it never
// climbs higher than a small padding below that gridline, landing on top of
// the (near-full-height) bar instead, same as any bar chart's value label.
const LABEL_TOP_PADDING = 10

function findBarRect(root: SVGSVGElement, fill: string, colX: number, row: number): SVGRectElement | null {
  const { axisTop, baseline } = BAR_ROWS[row]
  return (
    Array.from(root.querySelectorAll<SVGRectElement>('rect')).find(rect => {
      if (rect.getAttribute('fill') !== fill) return false
      if (Math.abs(parseFloat(rect.getAttribute('x') ?? '') - colX) > 0.5) return false
      const y = parseFloat(rect.getAttribute('y') ?? '')
      return y > axisTop && y < baseline
    }) ?? null
  )
}

// The baked-in "50%" placeholder is a single flattened path, same shape in
// every module — found by its position (centered over the bar, roughly
// inside the chart's upper half) rather than any id, since none survived
// the SVG export.
function findLabelPath(root: SVGSVGElement, centerX: number, row: number): SVGPathElement | null {
  const { axisTop } = BAR_ROWS[row]
  return (
    Array.from(root.querySelectorAll<SVGPathElement>('path')).find(path => {
      const b = path.getBBox()
      if (b.width < 50 || b.width > 200) return false
      if (Math.abs(b.x + b.width / 2 - centerX) > 5) return false
      return b.y > axisTop + 100 && b.y < axisTop + 300
    }) ?? null
  )
}

function renderBar(root: SVGSVGElement, row: number, colX: number, fill: string, percent: number) {
  const { axisTop, baseline } = BAR_ROWS[row]
  const barBottom = baseline - BAR_BOTTOM_INSET
  const height = BAR_RANGE * (percent / 100)
  const top = barBottom - height

  const rect = findBarRect(root, fill, colX, row)
  if (rect) {
    rect.setAttribute('y', String(top))
    rect.setAttribute('height', String(height))
  }

  const centerX = colX + BAR_WIDTH / 2
  findLabelPath(root, centerX, row)?.remove()

  const minBaselineY = axisTop + LABEL_TOP_PADDING + LABEL_ASCENT
  const baselineY = Math.max(top - LABEL_BASELINE_OFFSET, minBaselineY)

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  text.setAttribute('x', String(centerX))
  text.setAttribute('y', String(baselineY))
  text.setAttribute('text-anchor', 'middle')
  text.setAttribute('font-family', 'PP Neue Montreal Mono')
  text.setAttribute('font-weight', '500')
  text.setAttribute('font-size', String(LABEL_FONT_SIZE))
  text.setAttribute('fill', 'black')
  text.textContent = `${Math.round(percent)}%`
  root.appendChild(text)
}

async function renderBarCharts(root: SVGSVGElement, story: BarometerStory) {
  const counts = await fetchAnswerCounts(story)

  BAR_ROWS.forEach((_, row) => {
    BAR_COLS.forEach((col, colIndex) => {
      const questionNumber = row * 2 + colIndex + 1
      const { a, b } = counts[questionNumber] ?? { a: 0, b: 0 }
      const total = a + b
      const percentA = total > 0 ? (a / total) * 100 : 0
      const percentB = total > 0 ? (b / total) * 100 : 0

      renderBar(root, row, col.barAX, BAR_COLOR_A[story], percentA)
      renderBar(root, row, col.barBX, BAR_COLOR_B[story], percentB)
    })
  })
}

// Fetches the story's SVG, wires up its toggle buttons and fills in its
// real bar charts — all inside the hidden staging container, so none of it
// is visible until `switchStory` moves the finished result into view.
async function prepareBarometer(story: BarometerStory): Promise<SVGSVGElement> {
  const svgText = await $fetch<string>(BAROMETER_SRC[story], { responseType: 'text' })
  const staging = stagingContainer.value
  if (!staging) throw new Error('Barometer staging container missing')

  staging.innerHTML = svgText
  const root = staging.querySelector('svg')
  if (!root) throw new Error('Barometer SVG missing a root <svg>')

  setupToggleButtons(root)
  await renderBarCharts(root, story)

  staging.removeChild(root)
  return root
}

// Tracks the story a click has already committed to, separately from
// `activeStory` (which only updates once that story has actually finished
// loading) — otherwise a second click landing while the first is still
// in flight would compare against the not-yet-updated `activeStory` and,
// if it points back at the original story, wrongly no-op as "already showing
// this".
let desiredStory: BarometerStory = 'technokratie'
// Only one of these should ever win: if the user toggles again before the
// first switch finishes loading, the stale in-flight result is discarded
// instead of flashing in after the newer one.
let switchToken = 0

async function switchStory(story: BarometerStory) {
  if (story === desiredStory) return
  desiredStory = story
  const token = ++switchToken
  const root = await prepareBarometer(story)
  if (token !== switchToken) return

  activeStory.value = story
  barometerContainer.value?.replaceChildren(root)
}

onMounted(async () => {
  const token = ++switchToken
  const root = await prepareBarometer(activeStory.value)
  if (token !== switchToken) return
  barometerContainer.value?.replaceChildren(root)
})
</script>

<template>
  <div class="static-page">
    <StoryHeader color="#FFFFFF" badge-color="#FFFFFF" logo-src="/images/Asstets/Logo-Black.svg" show-nav />
    <div ref="barometerContainer" class="barometer__image" />
    <div ref="stagingContainer" class="barometer__staging" aria-hidden="true" />
    <SiteFooter src="/images/Asstets/Footer.svg" />
  </div>
</template>

<style scoped>
.static-page {
  display: flex;
  flex-direction: column;
  color: #fff;
  background: #0f0f14;
}

.barometer__image {
  display: block;
  width: 100%;
  line-height: 0;
  aspect-ratio: 1920 / 4018;
}

.barometer__image :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

.barometer__staging {
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  overflow: hidden;
  visibility: hidden;
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
