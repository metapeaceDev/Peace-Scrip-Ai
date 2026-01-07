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
            // Firebase (split by service to reduce chunk size)
            if (id.includes('firebase/app') || id.includes('firebase/auth')) {
              return 'firebase-core';
            }
            if (id.includes('firebase/firestore')) {
              return 'firebase-firestore';
            }
            if (id.includes('firebase/storage') || id.includes('firebase/functions')) {
              return 'firebase-services';
            }
            if (id.includes('firebase')) {
              return 'firebase-other';
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

          // Code split large app modules
          if (id.includes('src/components/admin/AdminDashboard')) {
            return 'admin-dashboard';
          }
          if (id.includes('src/components/admin/ProfitLossComparisonDashboard')) {
            return 'admin-profit-loss';
          }
          if (id.includes('src/components/admin/ProjectCostDashboard')) {
            return 'admin-project-costs';
          }
          if (id.includes('src/components/admin/AdminUserManagement')) {
            return 'admin-user-mgmt';
          }
          if (id.includes('src/components/admin/EnhancedUserDetailsModal')) {
            return 'admin-user-details';
          }
          if (id.includes('src/components/admin/')) {
            return 'admin-components';
          }
          if (id.includes('src/components/Step5Output')) {
            return 'step5-output';
          }
          if (id.includes('src/components/ComfyUISettings')) {
            return 'comfyui-settings';
          }
          if (id.includes('src/pages/')) {
            return 'pages';
          }
          // Split gemini service from other services
          if (id.includes('src/services/geminiService')) {
            return 'gemini-service';
          }
          if (id.includes('src/services/comfyui')) {
            return 'comfyui-services';
          }
          if (id.includes('src/services/videoGenerationService')) {
            return 'video-service';
          }
          if (id.includes('src/services/audio')) {
            return 'audio-services';
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
