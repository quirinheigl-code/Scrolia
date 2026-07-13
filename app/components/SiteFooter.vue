<script setup lang="ts">
defineProps<{ src: string }>()
</script>

<template>
  <footer class="site-footer">
    <img :src="src" class="site-footer__image" alt="" />
    <nav class="site-footer__links" aria-label="Footer">
      <NuxtLink to="/about" class="site-footer__link TypeButton_About" aria-label="About" />
      <NuxtLink to="/kontakt" class="site-footer__link TypeButton_Kontakt" aria-label="Kontakt" />
      <NuxtLink to="/impressum" class="site-footer__link TypeButton_Impressum" aria-label="Impressum" />
    </nav>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  width: 100%;
  line-height: 0;
}

.site-footer__image {
  display: block;
  width: 100%;
  height: auto;
}

.site-footer__links {
  position: absolute;
  inset: 0;
}

/* Hotzones sit over the "About"/"Kontakt"/"Impressum" text baked into the
   footer SVG itself — positions are read off that SVG's own path data
   (viewBox 0 0 1920 122, shared with the Soziokratie/Technokratie footer),
   expressed as percentages so they still line up however wide the footer
   is rendered. */
.site-footer__link {
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
   pure white — a 40%-opacity black overlay darkens it to exactly #999999
   via normal alpha compositing (255 * 0.6 = 153), without needing a
   separate real-text layer on top of the image. */
.TypeButton_About:active,
.TypeButton_Kontakt:active,
.TypeButton_Impressum:active {
  background-color: rgba(0, 0, 0, 0.4);
}
</style>
