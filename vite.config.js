import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         -> dist/ for Capacitor (Android/iOS)
// `npm run build:single`  -> dist-single/index.html, one self-contained playable file
// Link previews (WhatsApp, X) need the full address of og.png. On Vercel it is filled in automatically;
// elsewhere set SITE_URL, e.g. SITE_URL=https://abachopspot.ng npm run build
const SITE_URL = (process.env.SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  || '').replace(/\/$/, '');
const siteUrl = { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', SITE_URL) };

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [siteUrl, viteSingleFile()] : [siteUrl],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2000,
    assetsInlineLimit: mode === 'single' ? 100000000 : 4096,
  },
}));
