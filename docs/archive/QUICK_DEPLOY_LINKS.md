# 🚀 Peace Script AI - Quick Deploy Links

## 📱 Deploy Your Project (Choose One)

### Option 1: Netlify (Recommended - Easiest)
**Click here to deploy:** 👇
```
https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_USERNAME/peace-script-ai
```

**Or manual setup:**
1. Go to: https://app.netlify.com/start
2. Click "Import from Git"
3. Choose your repository
4. Set environment variable: `VITE_GEMINI_API_KEY`
5. Click Deploy

---

### Option 2: Vercel (Fast & Modern)
**Click here to deploy:** 👇
```
https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/peace-script-ai
```

**Or manual setup:**
1. Go to: https://vercel.com/new
2. Import your Git repository
3. Set environment variable: `VITE_GEMINI_API_KEY`
4. Click Deploy

---

## 🔑 Important Links

### API Key Setup
- **Get Gemini API Key:** https://aistudio.google.com/app/apikey
- **Google Cloud Console:** https://console.cloud.google.com/

### GitHub Repository Setup
If you haven't pushed to GitHub yet:

```bash
# Create new repository on GitHub
https://github.com/new

# Then run:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## 🎯 Complete Deployment Steps

### Step 1: Push to GitHub
```bash
# If you have GitHub CLI:
gh repo create peace-script-ai --public --source=. --remote=origin
git push -u origin main

# OR manually:
# 1. Go to https://github.com/new
# 2. Create repository named "peace-script-ai"
# 3. Run:
git remote add origin https://github.com/YOUR_USERNAME/peace-script-ai.git
git push -u origin main
```

### Step 2: Deploy to Netlify
1. Click: https://app.netlify.com/start
2. Choose "Import from Git"
3. Select GitHub → Choose your repository
4. Build settings (auto-detected):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Environment variables** → Add new variable:
   - Key: `VITE_GEMINI_API_KEY`
   - Value: Your API key from https://aistudio.google.com/app/apikey
6. Click "Deploy site"
7. Wait 2-3 minutes ⏳
8. Get your live URL: `https://your-site-name.netlify.app` 🎉

### Step 3: Test Your Deployment
- Open your deployed URL
- Test login (offline mode)
- Create a project
- Test AI features (requires API key)

---

## 🆘 Quick Help Links

### Troubleshooting
- **Netlify Build Errors:** https://answers.netlify.com/
- **Vercel Support:** https://vercel.com/support
- **Vite Documentation:** https://vitejs.dev/guide/

### Documentation Files in This Project
- `README.md` - Quick overview
- `README_FULL.md` - Complete guide
- `DEPLOYMENT.md` - Detailed deployment instructions
- `PROJECT_HEALTH_REPORT.md` - Technical details
- `FINAL_DEPLOYMENT_SUMMARY.md` - Deployment checklist

---

## 📊 Deployment Services Comparison

| Feature | Netlify | Vercel | GitHub Pages |
|---------|---------|--------|--------------|
| Free Tier | ✅ 100GB/month | ✅ 100GB/month | ✅ 1GB |
| Build Time | ~2 min | ~1 min | ~3 min |
| HTTPS | ✅ Auto | ✅ Auto | ✅ Auto |
| Custom Domain | ✅ Free | ✅ Free | ✅ Free |
| Env Variables | ✅ Yes | ✅ Yes | ❌ No |
| Functions | ✅ Yes | ✅ Yes | ❌ No |
| **Best For** | General apps | Next.js apps | Static sites |
| **Recommended** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

---

## 🎁 Bonus: One-Click Deploy Buttons

Copy these to your README.md for easy deployment:

### Netlify Deploy Button
```markdown
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_USERNAME/peace-script-ai)
```

### Vercel Deploy Button
```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/peace-script-ai)
```

---

## ✅ Post-Deployment Checklist

- [ ] Repository pushed to GitHub
- [ ] Netlify/Vercel connected
- [ ] Environment variable `VITE_GEMINI_API_KEY` set
- [ ] First deployment successful
- [ ] Tested live URL
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (auto)
- [ ] Analytics added (optional)

---

## 🎉 You're Done!

After deployment, your app will be live at:
- **Netlify:** `https://YOUR_SITE_NAME.netlify.app`
- **Vercel:** `https://YOUR_PROJECT_NAME.vercel.app`

Share the link with your team and users! 🚀

---

**Need Help?**
- Check `DEPLOYMENT.md` for detailed instructions
- Run `./setup-github.sh` for automated GitHub setup
- Visit https://docs.netlify.com or https://vercel.com/docs

**Good luck! 🎬✨**
