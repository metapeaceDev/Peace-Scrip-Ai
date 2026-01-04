/**
 * Lazy Loading Components
 *
 * Import heavy components lazily to improve initial load time
 */

import { lazy } from 'react';

// Settings & Configuration
export const ComfyUISettings = lazy(() => import('./components/ComfyUISettings'));
export const DeviceSettings = lazy(() => import('./components/DeviceSettings'));

// Video Generation Pages
export const VideoGenerationTestPage = lazy(() => import('./pages/VideoGenerationTestPage'));
export const MotionEditorPage = lazy(() => import('./pages/MotionEditorPage'));

// Heavy Components
export const Step5Output = lazy(() => import('./components/Step5Output'));

// Export loading fallback component
export { default as LoadingFallback } from './components/LoadingFallback';
