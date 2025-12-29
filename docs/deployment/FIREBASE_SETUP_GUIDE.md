# ðŸ”¥ Firebase Setup Guide - Peace Script AI

## à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸—à¸µà¹ˆ 1: à¸ªà¸£à¹‰à¸²à¸‡ Firebase Project (5 à¸™à¸²à¸—à¸µ)

### 1.1 à¹„à¸›à¸—à¸µà¹ˆ Firebase Console

```
https://console.firebase.google.com/
```

### 1.2 à¸„à¸¥à¸´à¸ "Add project" (à¹€à¸žà¸´à¹ˆà¸¡à¹‚à¸›à¸£à¹€à¸ˆà¸„)

### 1.3 à¸•à¸±à¹‰à¸‡à¸Šà¸·à¹ˆà¸­à¹‚à¸›à¸£à¹€à¸ˆà¸„

```
à¸Šà¸·à¹ˆà¸­à¹à¸™à¸°à¸™à¸³: peace-script-ai
à¸«à¸£à¸·à¸­à¸Šà¸·à¹ˆà¸­à¸—à¸µà¹ˆà¸„à¸¸à¸“à¸•à¹‰à¸­à¸‡à¸à¸²à¸£
```

### 1.4 Google Analytics

- à¹€à¸›à¸´à¸”/à¸›à¸´à¸”à¸•à¸²à¸¡à¸•à¹‰à¸­à¸‡à¸à¸²à¸£ (à¹à¸™à¸°à¸™à¸³à¸›à¸´à¸”à¸ªà¸³à¸«à¸£à¸±à¸šà¸„à¸§à¸²à¸¡à¹€à¸£à¹‡à¸§)
- à¸«à¸²à¸à¹€à¸›à¸´à¸” à¹€à¸¥à¸·à¸­à¸ Default Account

### 1.5 à¸„à¸¥à¸´à¸ "Create project"

- à¸£à¸­ 30-60 à¸§à¸´à¸™à¸²à¸—à¸µ
- à¸„à¸¥à¸´à¸ "Continue"

---

## à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸—à¸µà¹ˆ 2: à¹€à¸›à¸´à¸”à¹ƒà¸Šà¹‰à¸‡à¸²à¸™ Authentication (3 à¸™à¸²à¸—à¸µ)

### 2.1 à¹„à¸›à¸—à¸µà¹ˆ Authentication

```
à¹€à¸¡à¸™à¸¹à¸‹à¹‰à¸²à¸¢ > Build > Authentication
```

### 2.2 à¸„à¸¥à¸´à¸ "Get started"

### 2.3 à¹€à¸›à¸´à¸”à¹ƒà¸Šà¹‰à¸‡à¸²à¸™ Email/Password

1. à¸„à¸¥à¸´à¸ "Email/Password"
2. à¹€à¸›à¸´à¸” Enable (à¸ªà¸§à¸´à¸•à¸Šà¹Œà¹à¸£à¸)
3. à¸„à¸¥à¸´à¸ "Save"

### 2.4 à¹€à¸›à¸´à¸”à¹ƒà¸Šà¹‰à¸‡à¸²à¸™ Google Sign-in

1. à¸„à¸¥à¸´à¸ "Google"
2. à¹€à¸›à¸´à¸” Enable
3. à¹€à¸¥à¸·à¸­à¸ Support email (à¸­à¸µà¹€à¸¡à¸¥à¸‚à¸­à¸‡à¸„à¸¸à¸“)
4. à¸„à¸¥à¸´à¸ "Save"

---

## à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸—à¸µà¹ˆ 3: à¸ªà¸£à¹‰à¸²à¸‡ Firestore Database (4 à¸™à¸²à¸—à¸µ)

### 3.1 à¹„à¸›à¸—à¸µà¹ˆ Firestore Database

```
à¹€à¸¡à¸™à¸¹à¸‹à¹‰à¸²à¸¢ > Build > Firestore Database
```

### 3.2 à¸„à¸¥à¸´à¸ "Create database"

### 3.3 à¹€à¸¥à¸·à¸­à¸à¹‚à¸«à¸¡à¸”

```
âœ… à¹€à¸¥à¸·à¸­à¸: Start in production mode
(à¹€à¸£à¸²à¸ˆà¸°à¹ƒà¸ªà¹ˆ Security Rules à¸—à¸µà¸«à¸¥à¸±à¸‡)
```

### 3.4 à¹€à¸¥à¸·à¸­à¸ Region (à¸ªà¸³à¸„à¸±à¸!)

```
à¹à¸™à¸°à¸™à¸³à¸ªà¸³à¸«à¸£à¸±à¸šà¹„à¸—à¸¢:
- asia-southeast1 (Singapore)
- asia-southeast2 (Jakarta)

à¸„à¸¥à¸´à¸ "Enable"
à¸£à¸­ 1-2 à¸™à¸²à¸—à¸µ
```

---

## à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸—à¸µà¹ˆ 4: à¹€à¸›à¸´à¸”à¹ƒà¸Šà¹‰à¸‡à¸²à¸™ Storage (2 à¸™à¸²à¸—à¸µ)

### 4.1 à¹„à¸›à¸—à¸µà¹ˆ Storage

```
à¹€à¸¡à¸™à¸¹à¸‹à¹‰à¸²à¸¢ > Build > Storage
```

### 4.2 à¸„à¸¥à¸´à¸ "Get started"

### 4.3 Security Rules

```
âœ… à¹€à¸¥à¸·à¸­à¸: Start in production mode
```

### 4.4 à¹€à¸¥à¸·à¸­à¸ Location

```
à¹ƒà¸Šà¹‰ Location à¹€à¸”à¸µà¸¢à¸§à¸à¸±à¸š Firestore
à¹€à¸Šà¹ˆà¸™: asia-southeast1
```

### 4.5 à¸„à¸¥à¸´à¸ "Done"

---

## à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸—à¸µà¹ˆ 5: à¸£à¸±à¸š Firebase Config (3 à¸™à¸²à¸—à¸µ)

### 5.1 à¹„à¸›à¸—à¸µà¹ˆ Project Settings

```
à¸„à¸¥à¸´à¸à¹„à¸­à¸„à¸­à¸™ âš™ï¸ à¸‚à¹‰à¸²à¸‡ Project Overview
à¹€à¸¥à¸·à¸­à¸ "Project settings"
```

### 5.2 Scroll à¸¥à¸‡à¸¡à¸²à¸«à¸² "Your apps"

### 5.3 à¸„à¸¥à¸´à¸ Web Icon `</>`

```
à¸•à¸±à¹‰à¸‡à¸Šà¸·à¹ˆà¸­ App: Peace Script AI
à¹„à¸¡à¹ˆà¸•à¹‰à¸­à¸‡à¸•à¸´à¹Šà¸ "Firebase Hosting" à¸•à¸­à¸™à¸™à¸µà¹‰
à¸„à¸¥à¸´à¸ "Register app"
```

### 5.4 à¸„à¸±à¸”à¸¥à¸­à¸ Config

à¸ˆà¸°à¹€à¸«à¹‡à¸™à¹‚à¸„à¹‰à¸”à¹à¸šà¸šà¸™à¸µà¹‰:

```javascript
const firebaseConfig = {
  apiKey: 'REDACTED_API_KEY',
  authDomain: 'peace-script-ai.firebaseapp.com',
  projectId: 'peace-script-ai',
  storageBucket: 'peace-script-ai.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abcdef123456',
};
```

### 5.5 à¸„à¸±à¸”à¸¥à¸­à¸à¸„à¹ˆà¸²à¹€à¸«à¸¥à¹ˆà¸²à¸™à¸µà¹‰à¹„à¸›à¹ƒà¸ªà¹ˆà¹ƒà¸™à¹„à¸Ÿà¸¥à¹Œ `.env`

---

## à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸—à¸µà¹ˆ 6: à¸­à¸±à¸žà¹€à¸”à¸— .env File (2 à¸™à¸²à¸—à¸µ)

### 6.1 à¹€à¸›à¸´à¸”à¹„à¸Ÿà¸¥à¹Œ `.env.local` à¹ƒà¸™ Project

```bash
# à¸«à¸²à¸à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¹„à¸Ÿà¸¥à¹Œ à¹ƒà¸«à¹‰à¸ªà¸£à¹‰à¸²à¸‡à¹ƒà¸«à¸¡à¹ˆ
touch .env.local
```

### 6.2 à¹ƒà¸ªà¹ˆà¸‚à¹‰à¸­à¸¡à¸¹à¸¥ Firebase Config

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=REDACTED_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=peace-script-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=peace-script-ai
VITE_FIREBASE_STORAGE_BUCKET=peace-script-ai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Gemini AI (à¸—à¸µà¹ˆà¸¡à¸µà¸­à¸¢à¸¹à¹ˆà¹à¸¥à¹‰à¸§)
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

### 6.3 à¸šà¸±à¸™à¸—à¸¶à¸à¹„à¸Ÿà¸¥à¹Œ

---

## à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸—à¸µà¹ˆ 7: à¸—à¸”à¸ªà¸­à¸š Local (2 à¸™à¸²à¸—à¸µ)

### 7.1 à¹€à¸›à¸´à¸” Terminal à¹à¸¥à¸°à¸£à¸±à¸™

```bash
npm run dev
```

### 7.2 à¹€à¸›à¸´à¸”à¹€à¸šà¸£à¸²à¸§à¹Œà¹€à¸‹à¸­à¸£à¹Œ

```
http://localhost:5173
```

### 7.3 à¸—à¸”à¸ªà¸­à¸š Sign Up

1. à¸„à¸¥à¸´à¸ "Sign Up"
2. à¹ƒà¸ªà¹ˆà¸­à¸µà¹€à¸¡à¸¥, à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™, à¸Šà¸·à¹ˆà¸­
3. à¸„à¸¥à¸´à¸ "Sign Up"
4. à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸§à¹ˆà¸²à¸ªà¸¡à¸±à¸„à¸£à¸ªà¸³à¹€à¸£à¹‡à¸ˆ

### 7.4 à¸—à¸”à¸ªà¸­à¸š Google Sign-in

1. à¸„à¸¥à¸´à¸ "Sign in with Google"
2. à¹€à¸¥à¸·à¸­à¸à¸šà¸±à¸à¸Šà¸µ Google
3. à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸§à¹ˆà¸²à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸ªà¸³à¹€à¸£à¹‡à¸ˆ

### 7.5 à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¹ƒà¸™ Firebase Console

```
Authentication > Users
à¸„à¸§à¸£à¹€à¸«à¹‡à¸™à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸—à¸µà¹ˆà¸ªà¸£à¹‰à¸²à¸‡à¹ƒà¸«à¸¡à¹ˆ
```

---

## âš ï¸ à¸‚à¹‰à¸­à¸„à¸§à¸£à¸£à¸°à¸§à¸±à¸‡

### Security Rules à¸¢à¸±à¸‡à¹„à¸¡à¹ˆ Deploy!

- à¸•à¸­à¸™à¸™à¸µà¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™ Local à¹„à¸”à¹‰à¹à¸¥à¹‰à¸§
- **à¹à¸•à¹ˆà¸•à¹‰à¸­à¸‡ Deploy Security Rules à¸à¹ˆà¸­à¸™à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸ˆà¸£à¸´à¸‡**
- à¸ˆà¸°à¸—à¸³à¹ƒà¸™à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸–à¸±à¸”à¹„à¸› (Phase 5)

### Authorized Domains à¸ªà¸³à¸«à¸£à¸±à¸š Google Sign-in

à¸«à¸²à¸à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¹ƒà¸Šà¹‰ Google Sign-in à¸šà¸™ Production:

1. à¹„à¸›à¸—à¸µà¹ˆ `Authentication > Settings > Authorized domains`
2. à¹€à¸žà¸´à¹ˆà¸¡ Domain à¸‚à¸­à¸‡à¸„à¸¸à¸“ à¹€à¸Šà¹ˆà¸™:
   - `peace-script-ai.web.app` (Firebase Hosting)
   - `yourdomain.com` (Custom Domain)

---

## ðŸ“Š à¸ªà¸£à¸¸à¸›à¸ªà¸´à¹ˆà¸‡à¸—à¸µà¹ˆà¸—à¸³

âœ… à¸ªà¸£à¹‰à¸²à¸‡ Firebase Project  
âœ… à¹€à¸›à¸´à¸”à¹ƒà¸Šà¹‰à¸‡à¸²à¸™ Email/Password Authentication  
âœ… à¹€à¸›à¸´à¸”à¹ƒà¸Šà¹‰à¸‡à¸²à¸™ Google Sign-in  
âœ… à¸ªà¸£à¹‰à¸²à¸‡ Firestore Database (asia-southeast1)  
âœ… à¹€à¸›à¸´à¸”à¹ƒà¸Šà¹‰à¸‡à¸²à¸™ Storage  
âœ… à¸£à¸±à¸š Firebase Config  
âœ… à¸­à¸±à¸žà¹€à¸”à¸— .env.local  
âœ… à¸—à¸”à¸ªà¸­à¸š Local à¸ªà¸³à¹€à¸£à¹‡à¸ˆ

---

## ðŸš€ à¸žà¸£à¹‰à¸­à¸¡à¸ªà¸³à¸«à¸£à¸±à¸š Phase 5: Deployment!

à¸•à¹ˆà¸­à¹„à¸›à¸ˆà¸°à¹€à¸›à¹‡à¸™:

1. Deploy Firestore Security Rules
2. Deploy Storage Security Rules
3. Deploy Website à¹„à¸›à¸—à¸µà¹ˆ Firebase Hosting
4. à¸—à¸”à¸ªà¸­à¸š Production

---

## ðŸ†˜ à¹à¸à¹‰à¹„à¸‚à¸›à¸±à¸à¸«à¸²à¸—à¸µà¹ˆà¸žà¸šà¸šà¹ˆà¸­à¸¢

### à¸›à¸±à¸à¸«à¸²: Google Sign-in à¹„à¸¡à¹ˆà¸—à¸³à¸‡à¸²à¸™à¸šà¸™ Local

**à¹à¸à¹‰à¹„à¸‚:**

```
1. à¹„à¸›à¸—à¸µà¹ˆ Authentication > Settings > Authorized domains
2. à¹€à¸žà¸´à¹ˆà¸¡ "localhost"
```

### à¸›à¸±à¸à¸«à¸²: Firestore Permission Denied

**à¹à¸à¹‰à¹„à¸‚:**

```
à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰ Deploy Security Rules
à¸ˆà¸°à¹à¸à¹‰à¹„à¸‚à¹ƒà¸™ Phase 5
```

### à¸›à¸±à¸à¸«à¸²: Build Error - Cannot find module 'firebase'

**à¹à¸à¹‰à¹„à¸‚:**

```bash
npm install firebase
```

### à¸›à¸±à¸à¸«à¸²: Environment Variables à¹„à¸¡à¹ˆà¸—à¸³à¸‡à¸²à¸™

**à¹à¸à¹‰à¹„à¸‚:**

```bash
# Restart Dev Server
npm run dev
```

---

**à¸«à¸²à¸à¸—à¸¸à¸à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸—à¸³à¸ªà¸³à¹€à¸£à¹‡à¸ˆ à¸žà¸£à¹‰à¸­à¸¡ Deploy à¹à¸¥à¹‰à¸§! ðŸŽ‰**
