# Peace Script AI - Deployment Guide

## 🚀 Quick Deploy Options

### Option 1: Netlify (Recommended)

#### Via Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

#### Via Netlify Dashboard
1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Build settings (auto-detected from netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Environment variables** (IMPORTANT):
   - Add `VITE_GEMINI_API_KEY` with your API key
6. Click "Deploy site"

### Option 2: Vercel

#### Via Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your Git repository
4. Build settings (auto-detected from vercel.json):
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
5. **Environment variables** (IMPORTANT):
   - Add `VITE_GEMINI_API_KEY` with your API key
6. Click "Deploy"

### Option 3: Manual Static Hosting

#### Build locally
```bash
npm run build
```

The `dist/` folder is ready to upload to any static hosting:
- **GitHub Pages**: Use `gh-pages` branch
- **Firebase Hosting**: `firebase deploy`
- **AWS S3 + CloudFront**: Upload to S3 bucket
- **Azure Static Web Apps**: Deploy via VS Code extension

---

## 🔑 Environment Variables Setup

### Required Variable
```
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### Optional Variables
```
VITE_API_URL=https://your-backend-api.com/api
```

### How to Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key"
3. Create new API key or use existing
4. Copy the key

---

## 📋 Pre-Deployment Checklist

- [x] Build successful (`npm run build`)
- [x] Environment variables prepared
- [x] `.gitignore` configured
- [x] `netlify.toml` or `vercel.json` present
- [ ] Update repository URL in README.md
- [ ] Test production build locally (`npm run preview`)

---

## 🔧 Post-Deployment Setup

### 1. Update CORS (if using backend)
Add your deployed domain to backend CORS settings

### 2. Custom Domain (Optional)
- **Netlify**: Settings → Domain management → Add custom domain
- **Vercel**: Settings → Domains → Add domain

### 3. Environment Variables
Always set `VITE_GEMINI_API_KEY` in hosting platform dashboard

### 4. Analytics (Optional)
- Google Analytics
- Plausible
- Umami

---

## 🧪 Testing Deployment

After deployment, test these features:
1. Authentication (Login/Offline mode)
2. Create new project
3. AI features (requires valid API key)
4. Save/Load projects
5. Export functions
6. Offline mode

---

## 🐛 Troubleshooting

### Build fails
- Check Node.js version (18+)
- Run `npm install` first
- Check for TypeScript errors

### API Key not working
- Ensure variable name is exactly `VITE_GEMINI_API_KEY`
- Verify API key is valid
- Check API quotas in Google Cloud Console

### Routing issues (404 on refresh)
- Ensure redirects are configured (netlify.toml/vercel.json)
- For other hosts, configure SPA fallback to index.html

### Large bundle size warning
- This is normal (530KB includes React + AI SDK)
- Gzipped size is much smaller (127KB)
- Consider code splitting for optimization

---

## 📊 Deployment Status

| Platform | Status | URL |
|----------|--------|-----|
| Netlify  | ⚪ Not deployed | - |
| Vercel   | ⚪ Not deployed | - |
| Production | 🟢 Ready | - |

---

## 🎯 Next Steps

1. Choose hosting platform
2. Connect Git repository
3. Set environment variables
4. Deploy!
5. Share with team and users

---

**Need help?** Check the full documentation in `README_FULL.md`
