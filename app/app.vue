<template>
  <div>
    <NuxtRouteAnnouncer />
    <ClientOnly>
      <NuxtPage />
    </ClientOnly>
  </div>
</template>

<style>
/* The browser's default UA stylesheet puts an 8px margin on body — left
   unreset, that gap exposes the page's fallback canvas color around every
   page's edges (very visible against these pages' light content). */
body {
  margin: 0;
}
</style>
