<script setup lang="ts">
// Inlined (rather than a plain <img>) so the four *_Bar groups baked into
// the SVG stay addressable as real DOM nodes — that's what lets the hover/
// click scaling below (and the click-through <a> links baked into the
// file, for Technokratie/Soziokratie) work at all.
const szenarienSvg = ref('')

onMounted(async () => {
  // $fetch auto-detects the response type from the content-type header, and
  // for image/svg+xml that resolves to "blob", not text — without forcing
  // it, szenarienSvg ends up holding a Blob object instead of markup, which
  // v-html can't render.
  szenarienSvg.value = await $fetch<string>('/images/Landing%20Page/Szenarien.svg', { responseType: 'text' })
})
</script>

<template>
  <div class="static-page">
    <StoryHeader color="#FFFFFF" badge-color="#FFFFFF" logo-src="/images/Asstets/Logo-Black.svg" show-nav />
    <div class="static-page__image" v-html="szenarienSvg" />
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

.static-page__image {
  display: block;
  width: 100%;
  line-height: 0;
  aspect-ratio: 1920 / 2081;
}

.static-page__image :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}
</style>

<style>
/* The four bars live inside the inlined Szenarien.svg (v-html), so Vue's
   scoped attribute never reaches them — these rules have to stay global. */
#Technokratie_Bar,
#Soziokratie_Bar,
#Meritokratie_Bar,
#Gynaikokratie_Bar {
  transform-box: fill-box;
  transform-origin: center;
  transition: transform 0.2s ease;
}

#Technokratie_Bar:hover,
#Soziokratie_Bar:hover,
#Meritokratie_Bar:hover,
#Gynaikokratie_Bar:hover {
  transform: scale(1.05);
}

/* Only Technokratie and Soziokratie are wrapped in a real link — Meritokratie
   and Gynaikokratie are still "in Arbeit" and stay non-interactive beyond
   the shared hover above. */
#Technokratie_Bar:active,
#Soziokratie_Bar:active {
  transform: scale(0.95);
  cursor: pointer;
}
</style>
