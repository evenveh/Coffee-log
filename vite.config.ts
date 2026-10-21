import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // New versions are downloaded in the background and used on the next launch.
      registerType: 'autoUpdate',
      // The manifest: what the installed app is called and how it looks.
      manifest: {
        name: 'Coffee Log',
        short_name: 'Coffee Log',
        description: 'Log and rate your espresso and filter brews.',
        theme_color: '#eef0ed', // title bar colour (porcelain; the page's theme-color meta handles dark mode)
        background_color: '#eef0ed', // splash screen colour while starting
        display: 'standalone', // full screen, no browser address bar
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell. Supabase requests (data, photos) are on another domain
        // and are never cached, so data is always live.
        // woff2 = the font files, so the app's typography also works offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Any in-app URL (e.g. /brews/123) is served index.html; React Router takes it from there.
        navigateFallback: '/index.html',
      },
    }),
  ],
})
