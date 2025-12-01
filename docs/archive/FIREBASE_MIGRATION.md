# 🔥 Firebase Migration Guide

## 📋 **Migration Checklist**

### ✅ Phase 1: Firebase Setup (COMPLETED)
- [x] Install Firebase SDK (`npm install firebase`)
- [x] Create Firebase config (`src/config/firebase.ts`)
- [x] Create Firebase Auth service (`src/services/firebaseAuth.ts`)
- [x] Create Firestore service (`src/services/firestoreService.ts`)
- [x] Create Firebase security rules
  - [x] `firestore.rules`
  - [x] `storage.rules`
  - [x] `firestore.indexes.json`
- [x] Create `firebase.json` configuration
- [x] Create `.env.example` template

### 🔄 Phase 2: Auth Migration (IN PROGRESS)
- [x] Update `AuthPage.tsx` with Firebase Auth
- [x] Add Google Sign-in button
- [x] Implement email/password auth
- [x] Add offline mode support
- [ ] Test authentication flow
- [ ] Update all auth checks in components

### ⏳ Phase 3: Database Migration (PENDING)
- [ ] Update App.tsx to use Firestore
- [ ] Migrate project save/load logic
- [ ] Update TeamManager component
- [ ] Implement data sync
- [ ] Test data persistence

### ⏳ Phase 4: Backend Migration (PENDING)
- [ ] Replace Express routes with Firestore queries
- [ ] Remove backend folder (optional)
- [ ] Update API calls to use Firebase SDK directly
- [ ] Test all CRUD operations

### ⏳ Phase 5: Testing & Deployment (PENDING)
- [ ] Create Firebase project
- [ ] Configure Firebase CLI
- [ ] Deploy security rules
- [ ] Deploy to Firebase Hosting
- [ ] Test production environment

---

## 🚀 **Setup Instructions**

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Project name: `peace-script-ai`
4. Enable Google Analytics (optional)
5. Create project

### Step 2: Enable Authentication

1. In Firebase Console → **Authentication**
2. Click "Get started"
3. Enable **Email/Password**
4. Enable **Google** sign-in
   - Add your email as authorized domain
   - Configure OAuth consent screen

### Step 3: Create Firestore Database

1. In Firebase Console → **Firestore Database**
2. Click "Create database"
3. Start in **Production mode**
4. Choose location: `asia-southeast1` (Singapore)
5. Click "Enable"

### Step 4: Enable Storage

1. In Firebase Console → **Storage**
2. Click "Get started"
3. Use default security rules
4. Choose same location as Firestore
5. Click "Done"

### Step 5: Get Configuration

1. In Firebase Console → **Project Settings** (⚙️ icon)
2. Scroll to "Your apps" section
3. Click **Web** icon (</>) to add web app
4. App nickname: `Peace Script AI`
5. Check "Also set up Firebase Hosting"
6. Register app
7. **Copy the config object**

### Step 6: Update Environment Variables

Create `.env` file:

```env
VITE_GEMINI_API_KEY=AIzaSyC-Y-j2mQny-YqukGPT4QIDvKOkGewNO48

# Paste your Firebase config here:
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=peace-script-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=peace-script-ai
VITE_FIREBASE_STORAGE_BUCKET=peace-script-ai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Step 7: Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase init
```

Select:
- ✅ Firestore
- ✅ Hosting
- ✅ Storage

Configuration:
- Firestore rules: `firestore.rules` ✓
- Firestore indexes: `firestore.indexes.json` ✓
- Public directory: `dist` ✓
- Single-page app: **Yes** ✓
- Storage rules: `storage.rules` ✓

### Step 8: Deploy Security Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

### Step 9: Build & Deploy

```bash
# Build the app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

---

## 🔐 **Security Rules Explanation**

### Firestore Rules (`firestore.rules`)

```javascript
// Users can only read/write their own data
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}

// Projects can only be accessed by owner
match /projects/{projectId} {
  allow read: if resource.data.userId == request.auth.uid;
  allow create: if request.resource.data.userId == request.auth.uid;
  allow update, delete: if resource.data.userId == request.auth.uid;
}
```

### Storage Rules (`storage.rules`)

```javascript
// Profile images: 10MB max, images only
match /users/{userId}/profile/{fileName} {
  allow read: if true;
  allow write: if request.auth.uid == userId 
               && request.resource.contentType.matches('image/.*')
               && request.resource.size < 10 * 1024 * 1024;
}

// Project assets
match /projects/{projectId}/{allPaths=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null 
               && request.resource.size < 10 * 1024 * 1024;
}
```

---

## 📊 **Data Structure**

### Users Collection

```typescript
{
  uid: string;           // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastLogin: Timestamp;
}
```

### Projects Collection

```typescript
{
  id: string;            // Document ID
  userId: string;        // Owner UID
  title: string;
  genre: string;
  type: 'feature' | 'short' | 'series';
  characters: Character[];
  scenes: Scene[];
  acts?: Act[];
  status: 'draft' | 'in-progress' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 🧪 **Testing**

### Test Authentication

```typescript
// Login with Email/Password
const result = await firebaseAuth.login('test@example.com', 'password123');
console.log(result.user);

// Login with Google
const result = await firebaseAuth.loginWithGoogle();
console.log(result.user);

// Logout
await firebaseAuth.logout();
```

### Test Firestore

```typescript
// Create project
const result = await firestoreService.createProject(userId, {
  title: 'Test Script',
  genre: 'Drama',
  type: 'feature'
});

// Get projects
const projects = await firestoreService.getUserProjects(userId);
console.log(projects);

// Update project
await firestoreService.updateProject(projectId, {
  title: 'Updated Title'
});

// Delete project
await firestoreService.deleteProject(projectId);
```

---

## 🔄 **Migration from MongoDB**

### Old (MongoDB + JWT)
```typescript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const { token } = await response.json();
localStorage.setItem('token', token);

// Get projects
const response = await fetch('/api/projects', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### New (Firebase)
```typescript
// Login
const result = await firebaseAuth.login(email, password);
// No need to manage tokens!

// Get projects
const user = firebaseAuth.getCurrentUser();
const result = await firestoreService.getUserProjects(user.uid);
```

---

## 💰 **Firebase Pricing**

### Free Tier (Spark Plan)

**Firestore:**
- 1 GB storage
- 50K reads/day
- 20K writes/day
- 20K deletes/day

**Authentication:**
- Unlimited users
- Email/Password: FREE
- Google Sign-in: FREE

**Hosting:**
- 10 GB storage
- 360 MB/day transfer

**Storage:**
- 5 GB stored
- 1 GB/day download
- 20K uploads/day

### Estimated Usage
- **Small app** (< 100 users): FREE ✅
- **Medium app** (< 1000 users): ~$0-5/month
- **Large app** (> 1000 users): ~$10-25/month

---

## 🚨 **Common Issues**

### Issue 1: Firebase not initialized
```typescript
// Solution: Check .env variables are set
console.log(import.meta.env.VITE_FIREBASE_API_KEY);
```

### Issue 2: Auth domain not authorized
```typescript
// Solution: Add to Firebase Console
// Authentication → Settings → Authorized domains
// Add: your-app.web.app, localhost
```

### Issue 3: Firestore permission denied
```typescript
// Solution: Check security rules
// Ensure user is authenticated
// Ensure userId matches in rules
```

---

## 📈 **Next Steps**

1. ✅ Complete `.env` configuration
2. ✅ Deploy security rules
3. ⏳ Test authentication locally
4. ⏳ Update remaining components
5. ⏳ Deploy to Firebase Hosting

---

*Last Updated: 30 พฤศจิกายน 2568*
