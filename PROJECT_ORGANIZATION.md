# Project Organization & Deployment Guide

## 1. Directory Structure Cleanup
The project has been reorganized to separate source code, documentation, and operational scripts.

### New Structure:
- **`src/`**: Contains all frontend source code (`App.tsx`, `index.tsx`, components, services, etc.).
- **`scripts/ops/`**: Contains operational scripts (`.sh`, `.js`) for maintenance, setup, and checks.
- **`docs/reports/`**: Contains all progress reports and summaries.
- **`tests/manual/`**: Contains manual HTML test files.
- **`public/`**: Static assets.
- **`functions/`**: Firebase Cloud Functions.
- **`backend/`**: Python backend services (if applicable).

## 2. Git Management (What to Commit)

### ✅ Files to Commit:
- **Source Code**: `src/`, `functions/`, `backend/`
- **Configuration**: `package.json`, `tsconfig.json`, `vite.config.ts`, `firebase.json`, `firestore.rules`, `netlify.toml`, `vercel.json`
- **Documentation**: `README.md`, `docs/`
- **Scripts**: `scripts/`
- **Public Assets**: `public/`

### ❌ Files to Ignore (Do NOT Commit):
- `node_modules/` (Dependencies)
- `dist/` (Build output)
- `.env`, `.env.*` (Environment variables/Secrets)
- `service-account-key.json` (Private Keys)
- `*.log` (Logs)
- `coverage/` (Test coverage reports)

### Recommended Git Commands:
```bash
# 1. Add all changes
git add .

# 2. Commit
git commit -m "refactor: organize project structure, move source files to src/, archive reports"

# 3. Push
git push origin main
```

## 3. Deployment Strategy

### Frontend (React/Vite)
- **Build Command**: `npm run build`
- **Output Directory**: `dist/`
- **Deploy To**: Firebase Hosting, Vercel, or Netlify.
  - **Firebase**: `firebase deploy --only hosting`
  - **Vercel**: Connect GitHub repo, set Root Directory to `peace-script-basic-v1` (if needed), Build Command: `npm run build`, Output: `dist`.

### Backend (Firebase Functions)
- **Directory**: `functions/`
- **Deploy Command**: `firebase deploy --only functions`

### AI Services (ComfyUI)
- **Directory**: `comfyui-backend/` or `backend/`
- **Deploy To**: GPU Cloud (RunPod, MassedCompute)
- **Method**: Docker container (see `runpod-comfyui.Dockerfile`).

## 4. Next Steps
1. Verify the application runs locally: `npm run dev`
2. Run tests to ensure no imports are broken: `npm run test`
3. Commit the changes.
