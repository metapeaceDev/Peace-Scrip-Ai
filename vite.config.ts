import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@google/genai')) {
              return 'ai-vendor';
            }
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
          }
        }
      }
    },
    chunkSizeWarningLimit: 700
  }
})
