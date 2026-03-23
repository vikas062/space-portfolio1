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
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':  ['react', 'react-dom'],
          'three-vendor':  ['three'],
          'r3f-vendor':    ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          'gsap-vendor':   ['gsap'],
          'lenis-vendor':  ['lenis'],
        },
      },
    },
    // Slightly higher limit so Three.js chunk isn't warned about
    chunkSizeWarningLimit: 1200,
  },
})
