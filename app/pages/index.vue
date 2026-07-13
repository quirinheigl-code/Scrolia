<script setup lang="ts">
// Only plays the very first time the landing page is entered. The
// Soziokratie/Technokratie cards link out via plain <a> tags baked into the
// SVG (a full page reload, not SPA routing), so returning here via the
// header logo starts from a completely fresh app instance with no
// in-memory state left — sessionStorage is what actually survives that
// round trip: set once per browser tab, so it's gone in a new tab/session
// but still there after any reload within this one.
const LOADING_SCREEN_SESSION_KEY = 'scrolia-landing-loading-shown'
const alreadyShownLoadingScreen = sessionStorage.getItem(LOADING_SCREEN_SESSION_KEY) === '1'
const showLoadingScreen = ref(!alreadyShownLoadingScreen)
if (!alreadyShownLoadingScreen) {
  sessionStorage.setItem(LOADING_SCREEN_SESSION_KEY, '1')
}

// Inlined (rather than a plain <img>) so the Soziokratie_Card/Technokratie_Card
// groups baked into the SVG stay addressable as real DOM nodes — that's what
// lets the hover scale and the intro pop-in below (and the click-through <a>
// links baked into the file) work at all.
const landingSvg = ref('')

// Shortly after the cards first scroll into view, they "pop" in one after
// another — Technokratie, then Soziokratie — each growing in from slightly
// small/low, overshooting a touch past full size, then settling. Driven by
// toggling classes rather than a template ref since the elements live inside
// v-html markup, invisible to Vue's own DOM tracking.
const POP_INITIAL_DELAY_MS = 0
const POP_STAGGER_MS = 200

function popIn(el: Element) {
  el.classList.remove('card-pop-pending')
  el.classList.add('card-pop-in')
  // Once the bouncy entrance transition finishes, drop back to the plain,
  // fast transition used for hover — otherwise hover would inherit this
  // animation's slower, bouncier easing.
  el.addEventListener('transitionend', () => el.classList.remove('card-pop-in'), { once: true })
}

function setupCardIntro() {
  const technokratieCard = document.getElementById('Technokratie_Card')
  const soziokratieCard = document.getElementById('Soziokratie_Card')
  if (!technokratieCard || !soziokratieCard) return

  technokratieCard.classList.add('card-pop-pending')
  soziokratieCard.classList.add('card-pop-pending')

  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return
    observer.disconnect()
    setTimeout(() => {
      popIn(technokratieCard)
      setTimeout(() => popIn(soziokratieCard), POP_STAGGER_MS)
    }, POP_INITIAL_DELAY_MS)
  // Negative threshold isn't a thing, so the earlier trigger comes from
  // rootMargin instead: it extends the viewport 300px past its real bottom
  // edge, so the card counts as "visible" while it's still that far below
  // the fold, well before it's actually on screen.
  }, { threshold: 0, rootMargin: '0px 0px 300px 0px' })

  observer.observe(technokratieCard)
}

onMounted(async () => {
  // $fetch auto-detects the response type from the content-type header, and
  // for image/svg+xml that resolves to "blob", not text — without forcing
  // it, landingSvg ends up holding a Blob object instead of markup, which
  // v-html can't render (the whole page then throws and shows nothing).
  landingSvg.value = await $fetch<string>('/images/Landing%20Page/LandingPage.svg', { responseType: 'text' })
  await nextTick()
  setupCardIntro()
})
</script>

<template>
  <div class="story-select">
    <StoryHeader color="#FFFFFF" badge-color="#FFFFFF" logo-src="/images/Asstets/Logo-Black.svg" show-nav />
    <div class="story-select__image" v-html="landingSvg" />
    <SiteFooter src="/images/Asstets/Footer.svg" />
    <LoadingScreen v-if="showLoadingScreen" @done="showLoadingScreen = false" />
  </div>
</template>

<style scoped>
.story-select {
  display: flex;
  flex-direction: column;
  color: #fff;
}

.story-select__image {
  display: block;
  width: 100%;
  line-height: 0;
  aspect-ratio: 1920 / 3768;
}

.story-select__image :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}
</style>

<style>
body {
  background: #0f0f14;
}

/* Both cards live inside the inlined LandingPage.svg (v-html), so Vue's
   scoped attribute never reaches them — these rules have to stay global. */
#Soziokratie_Card,
#Technokratie_Card {
  transform-box: fill-box;
  transform-origin: center;
  transition: transform 0.25s ease;
  cursor: pointer;
}

#Soziokratie_Card:hover,
#Technokratie_Card:hover {
  transform: scale(1.05);
}

/* Resting state before the intro plays: slightly small and shifted down. */
#Soziokratie_Card.card-pop-pending,
#Technokratie_Card.card-pop-pending {
  transform: scale(0.85) translateY(64px);
}

/* The pop itself: small/low -> 105% overshoot -> settles at 100%, via a
   "back" easing curve rather than explicit keyframes. */
#Soziokratie_Card.card-pop-in,
#Technokratie_Card.card-pop-in {
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform: scale(1) translateY(0);
}
</style>
