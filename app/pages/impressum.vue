<template>
  <div class="static-page">
    <StoryHeader color="#FFFFFF" badge-color="#FFFFFF" logo-src="/images/Asstets/Logo-Black.svg" show-nav />
    <img src="/images/Landing%20Page/Impressum.svg" class="static-page__image" alt="" />
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
  height: auto;
  aspect-ratio: 1920 / 1080;
}
</style>
