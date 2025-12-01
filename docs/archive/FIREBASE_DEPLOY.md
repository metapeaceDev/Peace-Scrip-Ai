# 🚀 Firebase Deployment Guide - Quick Start

## ⚡ **30-Minute Deployment**

### ✅ Prerequisites
- [ ] Google Account
- [ ] Firebase CLI installed
- [ ] Node.js 18+

---

## 📋 **Step-by-Step Deployment**

### **Step 1: Install Firebase CLI (2 min)**

```bash
npm install -g firebase-tools
firebase login
```

### **Step 2: Create Firebase Project (3 min)**

1. Visit: https://console.firebase.google.com/
2. Click **"Add project"**
3. Project name: `peace-script-ai` (or your choice)
4. Enable Google Analytics: **Optional**
5. Click **"Create project"**
6. Wait for project creation (~30 seconds)

### **Step 3: Enable Services (5 min)**

#### Enable Authentication:
1. Left menu → **Authentication**
2. Click **"Get started"**
3. Sign-in method → Enable **"Email/Password"** ✅
4. Sign-in method → Enable **"Google"** ✅
   - Select support email
   - Save

#### Enable Firestore:
1. Left menu → **Firestore Database**
2. Click **"Create database"**
3. Start in **"Production mode"** (we have security rules)
4. Location: **asia-southeast1** (Singapore) or nearest
5. Click **"Enable"**

#### Enable Storage:
1. Left menu → **Storage**
2. Click **"Get started"**
3. Start in **"Production mode"**
4. Use same location as Firestore
5. Click **"Done"**

### **Step 4: Get Firebase Config (3 min)**

1. Project Overview (⚙️) → **Project settings**
2. Scroll to **"Your apps"**
3. Click **Web icon** (</>)
4. App nickname: `Peace Script AI`
5. ✅ Check **"Also set up Firebase Hosting"**
6. Click **"Register app"**
7. **COPY** the config object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "peace-script-ai.firebaseapp.com",
  projectId: "peace-script-ai",
  storageBucket: "peace-script-ai.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123...",
  measurementId: "G-XXX..."
};
```

### **Step 5: Update .env File (2 min)**

Create `.env` in project root:

```env
# Gemini AI (existing)
VITE_GEMINI_API_KEY=AIzaSyC-Y-j2mQny-YqukGPT4QIDvKOkGewNO48

# Firebase (paste your config values)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=peace-script-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=peace-script-ai
VITE_FIREBASE_STORAGE_BUCKET=peace-script-ai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123...
VITE_FIREBASE_MEASUREMENT_ID=G-XXX...
```

### **Step 6: Initialize Firebase (3 min)**

```bash
cd /Users/surasak.peace/Desktop/peace-script-basic-v1\ 
firebase init
```

**Select:**
- ✅ Firestore
- ✅ Hosting  
- ✅ Storage

**Configuration answers:**
```
? Use existing project → Select your project
? Firestore rules file → firestore.rules (already exists) ✅
? Firestore indexes file → firestore.indexes.json (already exists) ✅
? Public directory → dist ✅
? Configure as single-page app → Yes ✅
? Set up automatic builds with GitHub → No (later)
? Storage rules file → storage.rules (already exists) ✅
```

### **Step 7: Deploy Security Rules (2 min)**

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
firebase deploy --only firestore:indexes
```

Expected output:
```
✔ Deploy complete!
```

### **Step 8: Build & Deploy (5 min)**

```bash
# Build the app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Expected output:
```
✔ Deploy complete!

Hosting URL: https://peace-script-ai.web.app
```

### **Step 9: Test Your App (3 min)**

1. Open: `https://YOUR_PROJECT_ID.web.app`
2. Test email/password registration
3. Test Google Sign-in
4. Create a test project
5. Verify data in Firestore Console

---

## 🎯 **Quick Commands Reference**

```bash
# Build only
npm run build

# Deploy hosting only
npm run firebase:hosting

# Deploy rules only
npm run firebase:rules

# Deploy everything
npm run firebase:deploy

# View deployment history
firebase hosting:channel:list

# Rollback (if needed)
firebase hosting:clone SOURCE_SITE_ID:SOURCE_CHANNEL_ID TARGET_SITE_ID:live
```

---

## ✅ **Post-Deployment Checklist**

- [ ] App loads at Firebase URL
- [ ] Email/Password auth works
- [ ] Google Sign-in works
- [ ] Can create projects
- [ ] Projects save to Firestore
- [ ] Offline mode works
- [ ] PWA installable
- [ ] No console errors

---

## 🔐 **Security Verification**

Test security rules:

```bash
# In Firestore Console → Rules → Playground

# Test 1: Unauthenticated read (should FAIL)
get /projects/test123

# Test 2: Authenticated read own project (should PASS)
# Set auth → uid: your-test-uid
get /projects/test123
# Resource data → userId: your-test-uid
```

---

## 🌍 **Custom Domain (Optional)**

1. Firebase Console → Hosting
2. Click **"Add custom domain"**
3. Enter domain: `peacescript.com`
4. Follow DNS setup instructions
5. Wait for SSL certificate (~24 hours)

---

## 📊 **Monitor Usage**

Check Firebase Console:
- **Authentication** → Users count
- **Firestore** → Usage tab
- **Storage** → Usage
- **Hosting** → Usage

Free tier limits:
- ✅ 50K Firestore reads/day
- ✅ 20K Firestore writes/day
- ✅ 10 GB hosting storage
- ✅ 360 MB/day hosting transfer

---

## 🐛 **Troubleshooting**

### Error: "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "Firebase permission denied"
```bash
firebase login --reauth
```

### Error: "Build failed"
```bash
# Check .env file exists
cat .env

# Verify all VITE_ variables set
npm run build
```

### Error: "Firestore permission denied"
- Check security rules deployed
- Verify user is authenticated
- Check userId matches in rules

---

## 🚀 **Advanced: CI/CD with GitHub Actions**

Create `.github/workflows/firebase-deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: peace-script-ai
```

---

## 💰 **Cost Estimation**

**Small scale (< 100 active users):**
- Cost: **$0/month** (FREE tier)

**Medium scale (< 1,000 active users):**
- Firestore: ~$5-10/month
- Hosting: $0 (within free tier)
- Storage: $0-2/month
- **Total: ~$5-12/month**

**Large scale (< 10,000 active users):**
- Firestore: ~$20-40/month
- Hosting: ~$5-10/month
- Storage: ~$5-10/month
- **Total: ~$30-60/month**

---

## 📞 **Support Resources**

- Firebase Docs: https://firebase.google.com/docs
- Firebase Support: https://firebase.google.com/support
- Community: https://stackoverflow.com/questions/tagged/firebase
- Project Issues: https://github.com/metapeaceDev/Peace-Scrip-Ai/issues

---

**Estimated Total Time: ~30 minutes** ⏱️

**Congratulations! Your app is now live on Firebase! 🎉**

---

*Last Updated: 30 พฤศจิกายน 2568*
