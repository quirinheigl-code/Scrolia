<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    color: string
    badgeColor: string
    logoSrc?: string
    showClock?: boolean
    showAlarm?: boolean
    // The Technokratie/Soziokratie/Ergebnisse nav — only used on the
    // non-story pages (landing, About, Kontakt, Impressum).
    showNav?: boolean
    // Once the reader has reached the story's conclusion module, the clock
    // and alarm should stop reacting to further scrolling (up or down) and
    // just stay put at whatever they last showed.
    frozen?: boolean
  }>(),
  { logoSrc: '/images/Asstets/Logo.svg', showClock: false, showAlarm: false, showNav: false, frozen: false }
)

// Drives the clock hand: 0deg at the very top of the story, 360deg at the
// very bottom. Tracked independently here (rather than read from
// ScrollStory) since the header and the story are siblings, both scrolling
// the same document.
const scrollY = ref(0)
const maxScroll = ref(0)
let ticking = false
let resizeObserver: ResizeObserver | null = null

function updateMaxScroll() {
  maxScroll.value = document.documentElement.scrollHeight - window.innerHeight
}

function onScroll() {
  if (ticking || props.frozen) return
  ticking = true
  requestAnimationFrame(() => {
    scrollY.value = window.scrollY
    ticking = false
  })
}

onMounted(() => {
  scrollY.value = window.scrollY
  updateMaxScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', updateMaxScroll)
  // The story's scrollable height only reaches its final value once its
  // data has loaded async, well after this component mounts.
  resizeObserver = new ResizeObserver(updateMaxScroll)
  resizeObserver.observe(document.documentElement)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', updateMaxScroll)
  resizeObserver?.disconnect()
})

const clockRotation = computed(() => {
  if (!maxScroll.value) return 0
  const progress = Math.min(1, Math.max(0, scrollY.value / maxScroll.value))
  return progress * 360
})

// The alarm display: 07:00 at the very top of the story, 21:00 at the very
// bottom, advancing minute by minute as the reader scrolls through.
const ALARM_START_MINUTES = 7 * 60
const ALARM_END_MINUTES = 21 * 60

const alarmTime = computed(() => {
  const progress = maxScroll.value ? Math.min(1, Math.max(0, scrollY.value / maxScroll.value)) : 0
  const totalMinutes = Math.round(ALARM_START_MINUTES + progress * (ALARM_END_MINUTES - ALARM_START_MINUTES))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
})
</script>

<template>
  <header class="story-header" :style="{ backgroundColor: color }">
    <NuxtLink
      to="/"
      class="story-header__badge"
      :style="{ background: badgeColor }"
      aria-label="Zurück zur Startseite"
    >
      <img :src="logoSrc" class="story-header__logo" alt="" />
    </NuxtLink>
    <svg
      v-if="showClock"
      class="story-header__clock"
      width="90"
      height="90"
      viewBox="0 0 90 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M43.3953 88.4663C66.5334 88.4663 85.2906 69.7092 85.2906 46.5711C85.2906 23.4329 66.5334 4.67578 43.3953 4.67578C20.2571 4.67578 1.5 23.4329 1.5 46.5711C1.5 69.7092 20.2571 88.4663 43.3953 88.4663Z" fill="#0036FF" stroke="#0036FF" stroke-width="3" stroke-linejoin="round"/>
      <path d="M46.5673 85.2906C69.7054 85.2906 88.4625 66.5334 88.4625 43.3953C88.4625 20.2572 69.7054 1.5 46.5673 1.5C23.4291 1.5 4.67188 20.2572 4.67188 43.3953C4.67188 66.5334 23.4291 85.2906 46.5673 85.2906Z" fill="white" stroke="#0036FF" stroke-width="3" stroke-linejoin="round"/>
      <path
        class="story-header__clock-hand"
        transform-origin="46.567 43.395"
        :style="{ transform: `rotate(${clockRotation}deg)` }"
        d="M46.625 44.2029V20.6875"
        stroke="#0036FF"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <path d="M47.1235 80.0478C47.5801 80.0478 47.9501 79.6777 47.9501 79.2212C47.9501 78.7646 47.5801 78.3945 47.1235 78.3945C46.667 78.3945 46.2969 78.7646 46.2969 79.2212C46.2969 79.6777 46.667 80.0478 47.1235 80.0478Z" fill="#0036FF" stroke="#0036FF" stroke-width="3" stroke-linejoin="round"/>
      <path d="M21.6313 69.9501C22.0879 69.9501 22.458 69.58 22.458 69.1235C22.458 68.667 22.0879 68.2969 21.6313 68.2969C21.1748 68.2969 20.8047 68.667 20.8047 69.1235C20.8047 69.58 21.1748 69.9501 21.6313 69.9501Z" fill="#0036FF" stroke="#0036FF" stroke-width="3" stroke-linejoin="round"/>
      <path d="M10.7407 44.7822C11.1973 44.7822 11.5674 44.4121 11.5674 43.9555C11.5674 43.499 11.1973 43.1289 10.7407 43.1289C10.2842 43.1289 9.91406 43.499 9.91406 43.9555C9.91406 44.4121 10.2842 44.7822 10.7407 44.7822Z" fill="#0036FF" stroke="#0036FF" stroke-width="3" stroke-linejoin="round"/>
      <path d="M20.8422 19.2861C21.2987 19.2861 21.6688 18.916 21.6688 18.4594C21.6688 18.0029 21.2987 17.6328 20.8422 17.6328C20.3856 17.6328 20.0156 18.0029 20.0156 18.4594C20.0156 18.916 20.3856 19.2861 20.8422 19.2861Z" fill="#0036FF" stroke="#0036FF" stroke-width="3" stroke-linejoin="round"/>
      <path d="M46.0063 8.39544C46.4629 8.39544 46.8329 8.02534 46.8329 7.56881C46.8329 7.11228 46.4629 6.74219 46.0063 6.74219C45.5498 6.74219 45.1797 7.11228 45.1797 7.56881C45.1797 8.02534 45.5498 8.39544 46.0063 8.39544Z" fill="#0036FF" stroke="#0036FF" stroke-width="3" stroke-linejoin="round"/>
      <path d="M71.5063 18.4931C71.9629 18.4931 72.333 18.123 72.333 17.6665C72.333 17.2099 71.9629 16.8398 71.5063 16.8398C71.0498 16.8398 70.6797 17.2099 70.6797 17.6665C70.6797 18.123 71.0498 18.4931 71.5063 18.4931Z" fill="#0036FF" stroke="#0036FF" stroke-width="3" stroke-linejoin="round"/>
      <path d="M82.397 43.665C82.8535 43.665 83.2236 43.2949 83.2236 42.8383C83.2236 42.3818 82.8535 42.0117 82.397 42.0117C81.9404 42.0117 81.5703 42.3818 81.5703 42.8383C81.5703 43.2949 81.9404 43.665 82.397 43.665Z" fill="#0036FF" stroke="#0036FF" stroke-width="3" stroke-linejoin="round"/>
      <path d="M72.2954 69.1611C72.7519 69.1611 73.1221 68.791 73.1221 68.3344C73.1221 67.8779 72.7519 67.5078 72.2954 67.5078C71.8389 67.5078 71.4688 67.8779 71.4688 68.3344C71.4688 68.791 71.8389 69.1611 72.2954 69.1611Z" fill="#0036FF" stroke="#0036FF" stroke-width="3" stroke-linejoin="round"/>
    </svg>
    <svg
      v-if="showAlarm"
      class="story-header__alarm"
      viewBox="0 0 198 73"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M190.805 6.74219H1.5V70.7422H190.805V6.74219Z" fill="#009002" stroke="#009002" stroke-width="3" stroke-linejoin="round"/>
      <path d="M195.805 1.74219H6.5V65.7422H195.805V1.74219Z" fill="white" stroke="#009002" stroke-width="3" stroke-linejoin="round"/>
      <text
        class="story-header__alarm-text"
        x="101"
        y="35"
        text-anchor="middle"
        dominant-baseline="central"
      >{{ alarmTime }}</text>
    </svg>
    <nav v-if="showNav" class="story-header__nav" aria-label="Hauptnavigation">
      <NuxtLink to="/szenarien" class="story-header__nav-link TypeButton_Szenarien">Szenarien</NuxtLink>
      <NuxtLink to="/ergebnisse" class="story-header__nav-link TypeButton_Barometer">Barometer</NuxtLink>
    </nav>
  </header>
</template>

<style scoped>
.story-header {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  height: var(--header-height, 10.9vh);
}

.story-header__badge {
  --badge-scale: 0.7;

  position: absolute;
  top: 0;
  left: 22px;
  width: 110px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 0 30px 30px;
  z-index: 101;
  transform: scale(var(--badge-scale));
  transform-origin: top left;
}

.story-header__logo {
  width: 86px;
  height: 74px;
  display: block;
  transition: transform 0.15s ease;
}

.story-header__badge:hover .story-header__logo {
  transform: scale(1.1);
}

.story-header__clock {
  position: absolute;
  top: 50%;
  right: 15px;
  transform: translateY(-50%) scale(0.72);
  width: 90px;
  height: 90px;
  z-index: 101;
}

.story-header__alarm {
  position: absolute;
  top: 50%;
  right: 5px;
  transform: translateY(-50%) scale(0.72);
  width: 198px;
  height: 73px;
  z-index: 101;
}

.story-header__alarm-text {
  fill: #009002;
  font-family: 'Date Stamp Bold', monospace;
  font-size: 54px;
}

/* Same layout principle as the footer's About/Kontakt/Impressum row: a
   right-aligned group, vertically centered within its bar. */
.story-header__nav {
  position: absolute;
  top: 50%;
  right: 40px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 48px;
  z-index: 101;
}

.story-header__nav-link {
  font-size: 20px;
  font-weight: 700;
  color: black;
  text-decoration: none;
  white-space: nowrap;
}

.TypeButton_Szenarien,
.TypeButton_Barometer {
  font-family: 'PP Neue Montreal Mono Bold', monospace;
}

.TypeButton_Szenarien:active,
.TypeButton_Barometer:active {
  color: #999999;
}
</style>

<style>
@font-face {
  font-family: 'Date Stamp Bold';
  src: url('/images/Fonts/Date%20Stamp%20Bold.otf') format('opentype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'PP Neue Montreal Mono Bold';
  src: url('/images/Fonts/PPNeueMontrealMono-Bold.otf') format('opentype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
</style>
