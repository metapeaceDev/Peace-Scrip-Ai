# Peace Script AI - Pricing & Subscription Plan

## Overview

This document outlines the subscription tiers and pricing model for Peace Script AI, designed to cater to different user groups ranging from hobbyists to professional studios.

## Subscription Tiers

### 1. Peace Starter (Free)

**Target Audience:** Hobbyists, Students, Beginners.
**Price:** $0 / month

**Features:**

- **Script Generation:** Unlimited basic scripts (Gemini Flash).
- **Image Generation:**
  - Models: Pollinations.ai (Unlimited), Gemini Flash (Daily Quota: 10 images).
  - Quality: Standard Resolution (1024x1024).
  - Face ID: Basic (Low accuracy).
- **Video Generation:**
  - Models: ComfyUI SVD (Local/Cloud Free Tier).
  - Limits: 3 seconds per clip, 5 clips per day.
  - Resolution: 576p.
- **Storage:** Local Browser Storage only.
- **Export:** Text (.txt) only.

### 2. Peace Creator (Basic)

**Target Audience:** Content Creators, YouTubers, Indie Filmmakers.
**Price:** $9.99 / month (or 350 THB)

**Features:**

- **Script Generation:** Advanced scripts (Gemini Pro).
- **Image Generation:**
  - Models: Gemini Pro (Unlimited), ComfyUI SDXL (Cloud - Fast).
  - Quality: High Resolution (up to 2K).
  - Face ID: Standard (Good accuracy).
- **Video Generation:**
  - Models: ComfyUI SVD (Cloud - Fast), AnimateDiff.
  - Limits: 4 seconds per clip, 50 clips per month.
  - Resolution: 720p.
- **Storage:** Cloud Sync (up to 1GB).
- **Export:** PDF, CSV (Shot List).

### 3. Peace Studio (Pro)

**Target Audience:** Professional Studios, Production Houses.
**Price:** $29.99 / month (or 1,000 THB)

**Features:**

- **Script Generation:** Expert scripts (Gemini Ultra / GPT-4).
- **Image Generation:**
  - Models: DALL-E 3, FLUX.1 (Cloud - Best Quality).
  - Quality: Ultra High Resolution (4K).
  - Face ID: Advanced (High accuracy with IP-Adapter).
- **Video Generation:**
  - Models: Gemini Veo, Luma Dream Machine (API), Runway Gen-2 (API).
  - Limits: 5-10 seconds per clip, 200 clips per month.
  - Resolution: 1080p / 4K Upscaled.
- **Storage:** Cloud Sync (up to 10GB).
- **Export:** All formats + Storyboard HTML/PDF.
- **Priority Support:** Email & Chat.

### 4. Enterprise (Custom)

**Target Audience:** Large Agencies, Enterprise Clients.
**Price:** Contact Sales

**Features:**

- Custom Model Fine-tuning (Characters/Style).
- Dedicated GPU Servers.
- API Access.
- Team Collaboration Features.

## AI Model Cost Analysis (Backend)

| Model Type | Provider             | Cost (Est.)            | Pricing Tier |
| :--------- | :------------------- | :--------------------- | :----------- |
| **Image**  | Pollinations         | Free                   | Free         |
| **Image**  | Gemini Flash         | Free (Rate Limited)    | Free         |
| **Image**  | ComfyUI SDXL (Local) | Free (User Hardware)   | Free         |
| **Image**  | Gemini Pro           | ~$0.0025 / image       | Basic/Pro    |
| **Image**  | DALL-E 3             | ~$0.040 / image        | Pro          |
| **Image**  | FLUX.1 (Cloud GPU)   | ~$0.01 - $0.03 / image | Pro          |
| **Video**  | ComfyUI SVD (Local)  | Free (User Hardware)   | Free         |
| **Video**  | ComfyUI SVD (Cloud)  | ~$0.05 / video         | Basic        |
| **Video**  | Gemini Veo           | ~$0.10 - $0.20 / video | Pro          |
| **Video**  | Luma/Runway          | ~$0.10 - $0.50 / video | Pro          |

## Implementation Strategy

1.  **Credit System:** Users purchase "Peace Credits" or get monthly credits via subscription.
2.  **Model Routing:** The backend routes requests to the appropriate API based on the user's tier and selected model.
3.  **Usage Tracking:** Monitor API usage per user to enforce quotas.

---

_Note: Prices and quotas are subject to change based on API provider pricing updates._
