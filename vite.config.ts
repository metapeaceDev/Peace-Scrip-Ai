import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
            // React core
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // AI/ML libraries
            if (id.includes('@google/genai') || id.includes('generative-ai')) {
              return 'ai-vendor';
            }
            // Firebase
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            // Microsoft Speech SDK
            if (id.includes('microsoft.cognitiveservices.speech')) {
              return 'microsoft.cognitiveservices.speech.sdk';
            }
            // Other large libraries
            if (id.includes('lodash')) {
              return 'lodash-vendor';
            }
          }
          
          // Code split large app modules
          if (id.includes('src/components/Step5Output')) {
            return 'step5-output';
          }
          if (id.includes('src/components/ComfyUISettings')) {
            return 'comfyui-settings';
          }
          if (id.includes('src/pages/')) {
            return 'pages';
          }
          if (id.includes('src/services/geminiService')) {
            return 'gemini-service';
          }
          if (id.includes('src/services/videoGenerationService')) {
            return 'video-service';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging (changed from true)
        drop_debugger: true,
        pure_funcs: ['console.debug'], // Only remove console.debug
      },
    },
    // Source maps for debugging
    sourcemap: false, // Disable in production for smaller size
  },
});
