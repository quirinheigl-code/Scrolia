<script setup lang="ts">
// Shows Loading_Screen-3 for ~1s, then fades it out over 0.2s (100% -> 0%
// opacity), revealing the page underneath — this is only ever an overlay on
// top of it, never a replacement, so the page keeps rendering underneath
// the whole time.
const emit = defineEmits<{ done: [] }>()

const fadeOut = ref(false)

const timers: ReturnType<typeof setTimeout>[] = []

onMounted(() => {
  timers.push(setTimeout(() => { fadeOut.value = true }, 1000))
  timers.push(setTimeout(() => emit('done'), 1200))
})

onUnmounted(() => {
  timers.forEach(clearTimeout)
})
</script>

<template>
  <div class="loading-screen" :class="{ 'loading-screen--fade': fadeOut }">
    <img src="/images/Loading%20Animation/Loading_Screen-3.svg" class="loading-screen__visual" alt="Scrolia" />
  </div>
</template>

<style scoped>
.loading-screen {
  position: fixed;
  inset: 0;
  z-index: 100000;
  background: white;
  opacity: 1;
  transition: opacity 0.2s linear;
}

.loading-screen--fade {
  opacity: 0;
  pointer-events: none;
}

.loading-screen__visual {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
