import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true, // Listen on all addresses including LAN
    port: 5173,
    strictPort: false, // Auto-find available port if 5173 is taken
    open: false,
  },
  plugins: [
    react(),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'stats.html',
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
        '.vscode/',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React core (keep together)
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // AI/ML libraries
            if (id.includes('@google/genai') || id.includes('generative-ai')) {
              return 'ai-vendor';
            }
            // Firebase
            // IMPORTANT: keep Firebase in a single chunk to avoid rare TDZ/circular-init
            // issues in production builds (e.g. "Cannot access 'Se' before initialization").
            if (id.includes('/node_modules/firebase/') || id.includes('/node_modules/@firebase/')) {
              return 'firebase';
            }
            // Microsoft Speech SDK (large - separate)
            if (id.includes('microsoft.cognitiveservices.speech')) {
              return 'microsoft.cognitiveservices.speech.sdk';
            }
            // Other large libraries
            if (id.includes('lodash')) {
              return 'lodash-vendor';
            }
            // Stripe (lazy loaded, separate)
            if (id.includes('@stripe/')) {
              return 'stripe-vendor';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging (will migrate to logger)
        drop_debugger: true,
        pure_funcs: ['console.debug'], // Only remove console.debug
      },
    },
    // Source maps for debugging
    sourcemap: false, // Disable in production for smaller size
    
    // Target modern browsers for smaller bundle
    target: 'es2020',
  },
});
