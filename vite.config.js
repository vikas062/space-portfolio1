import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // exposes on all network IPs (0.0.0.0)
    port: 0,
  },
  build: {
    // Raise warning limit for Three.js (it's intentionally large)
    chunkSizeWarningLimit: 1200,
  },
})
