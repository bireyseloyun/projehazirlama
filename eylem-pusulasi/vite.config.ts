import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  plugins: [react(), VitePWA({
    disable: process.env.VITE_ANDROID_APP === 'true',
    registerType: 'prompt', injectRegister: false,
    includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
    manifest: { name: 'Eylem Pusulası', short_name: 'Pusula', description: 'Kişisel eylem defteri', lang: 'tr', start_url: './', scope: './', display: 'standalone', background_color: '#f4f2ea', theme_color: '#f4f2ea', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }] },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'], cleanupOutdatedCaches: true, navigateFallback: 'index.html' }
  })],
  test: { environment: 'node' }
} as Parameters<typeof defineConfig>[0]);
