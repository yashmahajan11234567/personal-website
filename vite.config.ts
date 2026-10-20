import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  publicDir: 'public',
  build: {
    assetsInlineLimit: 0, // Don't inline frames
    rollupOptions: {
      output: {
        /*
         * Only the libraries the HERO needs eagerly are named here. Anything
         * not listed is left to the bundler's own splitting, which is what
         * keeps the Phase 1 game engine lazy.
         *
         * The previous version returned 'vendor' for every `node_modules` id.
         * Both branches of its `if` did the same thing, so the condition was
         * decorative and ALL dependencies — including Phaser, which is only
         * ever reached through a dynamic import() — were forced into one eager
         * chunk that index.html modulepreloads. Phaser therefore loaded with
         * the hero, which is exactly what the Phase 1 brief forbids.
         *
         * Phaser must NOT be added to this list. It is loaded on demand via
         * import('../game/engine') in src/components/WorldShell.tsx.
         */
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('gsap') || id.includes('zustand')) return 'vendor'
          return undefined
        },
      },
    },
  },
  server: { port: 5195, open: true },
})
