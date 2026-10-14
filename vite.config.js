import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { VitePWA } from 'vite-plugin-pwa';

// `npm run build`         -> dist/ for Capacitor (Android/iOS)
// `npm run build:single`  -> dist-single/index.html, one self-contained playable file
// Link previews (WhatsApp, X) need the full address of og.png. On Vercel it is filled in automatically;
// elsewhere set SITE_URL, e.g. SITE_URL=https://abachopspot.ng npm run build
const SITE_URL = (process.env.SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  || '').replace(/\/$/, '');
const siteUrl = { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', SITE_URL) };

// Installable app: manifest + a service worker that caches the whole game so it plays without data.
const pwa = VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'script-defer',
  includeManifestIcons: false, // keep the offline download small: big icons and og.png aren't needed to play
  manifest: {
    id: './',
    name: 'Aba Chop Spot',
    short_name: 'Chop Spot',
    description: 'Sell puff-puff & zobo on Faulks Road, build your buka at Ariaria, own Aba.',
    lang: 'en-NG',
    start_url: './?source=homescreen',
    scope: './',
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone'],
    orientation: 'portrait',
    background_color: '#ff7a1a',
    theme_color: '#7cc35a',
    categories: ['games', 'casual'],
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      { src: 'og.png', sizes: '1200x630', type: 'image/png', form_factor: 'wide', label: 'Aba Chop Spot' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,woff2}', 'icons/icon-192.png', 'icons/favicon-64.png'],
    maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
  },
});

export default defineConfig(({ mode }) => ({
  base: './',
  // the single-file preview opens straight into the 3D GRA Lounge demo
  define: { __DEMO_DEFAULT__: JSON.stringify(mode === 'single' ? 'gra' : '') },
  plugins: mode === 'single' ? [siteUrl, viteSingleFile()] : [siteUrl, pwa],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2000,
    assetsInlineLimit: mode === 'single' ? 100000000 : 4096,
  },
}));
