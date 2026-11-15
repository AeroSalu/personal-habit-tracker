/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Our own service worker (src/sw.ts) so it can show reminders; workbox still precaches.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['icons/icon-180.png'],
      manifest: {
        name: 'Cadence',
        short_name: 'Cadence',
        description: 'Stop planning. Start executing.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0e0f12',
        theme_color: '#0e0f12',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Long-press the home-screen icon for these (handled by useLaunch).
        shortcuts: [
          { name: 'Start focus', short_name: 'Focus', url: '/focus?start=1', icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Add task', short_name: 'Add', url: '/?add=1', icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
        ],
        // Share text or a link from another app (Android and desktop Chrome/Edge) into /share.
        share_target: { action: '/share', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } },
      },
      // The /__/ denylist for Firebase's sign-in handler now lives in src/sw.ts.
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Firebase is most of the code and changes rarely, so it caches as its own file.
        manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'] },
      },
    },
  },
  // Same host as the emulators, so Google sign-in by redirect isn't blocked as cross-site.
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
