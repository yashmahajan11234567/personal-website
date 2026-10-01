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
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('gsap') || id.includes('zustand')) {
              return 'vendor';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  server: { port: 5173, open: true },
})
