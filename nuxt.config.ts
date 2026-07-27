// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // Baked into the generated output at `nuxt generate` build time — so
  // these two need to be set as build environment variables in Netlify too,
  // not just in the local .env. The anon key is meant to be public; access
  // control happens via Supabase Row Level Security policies, not secrecy.
  runtimeConfig: {
    public: {
      supabaseUrl: '',
      supabaseAnonKey: ''
    }
  }
})
