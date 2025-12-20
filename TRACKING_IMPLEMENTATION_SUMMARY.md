# AI Usage Tracking Implementation Summary

## Overview
This document summarizes the changes made to ensure all AI generation requests (Text, Image, Video) are correctly tracked and recorded in the database, resolving the "API Services ฿0.00" issue in the Admin Dashboard.

## Changes Implemented

### 1. Text Generation Tracking (`src/services/geminiService.ts`)
Added `recordGeneration` calls to the following functions:
- `parseDocumentToScript`
- `generateCharacterDetails`
- `generateAllCharactersFromStory`
- `generateCompatibleCharacters`
- `fillMissingCharacterDetails`
- `generateFullScriptOutline`
- `generateScene`
- `refineScene`
- `regenerateWithEdits`
- `generateBoundary`
- `generateTitle`
- `generateStructure`
- `generateSinglePlotPoint`
- `convertDialogueToDialect`

### 2. Video Generation Tracking
- **Gemini Veo**: Verified existing tracking in `generateStoryboardVideo` (`geminiService.ts`).
- **Replicate**: Verified existing tracking in `replicateService.ts` for:
  - `generateHotshotXL`
  - `generateAnimateDiffVideo`
  - `generateSVDVideo`
  - `generateAnimateDiffLightning`
  - `generateLTXVideo`
- **ComfyUI Video**: Added tracking to `generateVideoWithComfyUI` in `geminiService.ts`.

### 3. Image Generation Tracking
- **Gemini Image**: Verified existing tracking for Gemini 2.5 and 2.0 in `geminiService.ts`.
- **ComfyUI Image**: Added tracking to `generateImageWithBackend` in `src/services/comfyuiBackendClient.ts`.
- **Pollinations (Stable Diffusion)**: Added tracking (with 0 cost) to `generateImageWithStableDiffusion` in `geminiService.ts`.

### 4. Pricing Configuration (`src/types/analytics.ts`)
Added `COMFYUI` pricing configuration:
```typescript
COMFYUI: {
  image: 0.5, // ฿0.50 per image
  video: 2.0, // ฿2.00 per video
},
```

## Verification
All AI generation functions now include a `try/catch` block where `recordGeneration` is called upon success. This ensures that usage data is written to Firestore, which the Admin Dashboard uses to calculate and display costs.
