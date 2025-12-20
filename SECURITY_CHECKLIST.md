# 🔐 Security Checklist - Peace Script AI

**Last Updated**: December 19, 2025

---

## ✅ Pre-Deployment Security Checklist

### 1. Environment Variables

- [ ] **All sensitive keys stored in .env files** (not committed to Git)
- [ ] **.env.example updated** with all required variables (without actual values)
- [ ] **No hardcoded API keys** in source code
- [ ] **Firebase config uses environment variables** (not hardcoded)
- [ ] **Run validation**: `node scripts/validate-env.js`

### 2. Firebase Security

#### Firestore Rules
- [ ] **All collections have access control rules**
- [ ] **User data protected** (users can only access their own data)
- [ ] **Admin-only endpoints protected** with custom claims
- [ ] **Team collaboration permissions** properly implemented
- [ ] **Test rules**: `firebase emulators:start --only firestore`

#### Storage Rules
- [ ] **File size limits enforced** (10MB for images, 50MB for videos)
- [ ] **File type validation** (images, videos only)
- [ ] **User isolation** (users can only access their own files)
- [ ] **Public read restrictions** (token-based access for videos)

#### Authentication
- [ ] **Email verification required** for new accounts
- [ ] **Password strength requirements** implemented
- [ ] **Rate limiting** on login attempts
- [ ] **2-Step verification** for admin roles

### 3. API Keys & Secrets

- [ ] **Firebase Admin SDK key** NOT in repository
  ```bash
  # Check:
  git log --all --full-history -- "*service-account*.json"
  ```
- [ ] **Service account keys** in .gitignore
  ```
  **/service-account.json
  **/serviceAccountKey.json
  service-account-key.json
  firebase-adminsdk-*.json
  ```
- [ ] **Stripe keys** stored in environment variables only
- [ ] **Gemini API key** not exposed in client-side code
- [ ] **Third-party API keys** (Replicate, Hugging Face) secured

### 4. Code Security

#### TypeScript
- [ ] **strictNullChecks enabled** (prevent null/undefined errors)
- [ ] **No `any` types** in production code
- [ ] **Proper type definitions** for all functions
- [ ] **Input validation** on all user inputs

#### Dependencies
- [ ] **Run security audit**: `npm audit`
- [ ] **Fix high/critical vulnerabilities**: `npm audit fix`
- [ ] **Update dependencies**: Check for outdated packages
  ```bash
  npm outdated
  ```
- [ ] **Remove unused dependencies**: 
  ```bash
  npx depcheck
  ```

#### Code Quality
- [ ] **ESLint passing** with no warnings
- [ ] **Prettier formatting** consistent
- [ ] **No console.log in production** (use proper logging)
- [ ] **Error handling** in all async functions
- [ ] **Input sanitization** for user-generated content

### 5. Firebase Functions Security

- [ ] **CORS properly configured** (specific origins only)
- [ ] **Rate limiting** on cloud functions
- [ ] **Input validation** on all function parameters
- [ ] **Authentication checks** in all protected functions
- [ ] **Admin role verification** for admin-only functions

### 6. Frontend Security

- [ ] **No sensitive data in localStorage/sessionStorage**
- [ ] **XSS protection** (React escapes by default, but verify)
- [ ] **Content Security Policy** headers configured
- [ ] **HTTPS enforced** in production
- [ ] **No inline scripts** (CSP violation)

### 7. Payment Security (Stripe)

- [ ] **Stripe webhook signature verification**
- [ ] **Payment amounts validated** server-side
- [ ] **User subscription status** synced with Firestore
- [ ] **Refund handling** implemented
- [ ] **Test mode keys** used in development only

### 8. Data Privacy

- [ ] **User consent** for data collection (GDPR/PDPA)
- [ ] **Privacy policy** published and linked
- [ ] **Data retention policy** defined
- [ ] **User data export** functionality
- [ ] **User data deletion** functionality (right to be forgotten)

### 9. Infrastructure Security

- [ ] **Firebase rules deployed**: `firebase deploy --only firestore:rules,storage:rules`
- [ ] **Functions use minimum permissions** (principle of least privilege)
- [ ] **Secrets stored in Firebase Functions config**
  ```bash
  firebase functions:config:set someservice.key="THE API KEY"
  ```
- [ ] **Production database** separate from development
- [ ] **Regular backups** configured

### 10. Monitoring & Logging

- [ ] **Error tracking** (Sentry, Firebase Crashlytics)
- [ ] **Authentication logs** monitored
- [ ] **Unusual activity alerts** configured
- [ ] **Performance monitoring** enabled
- [ ] **Security event logging** (admin actions, permission changes)

---

## 🔴 Critical Security Issues (Fix Immediately)

### Issue 1: Service Account Key in Repository

**Status**: ⚠️ FOUND `service-account-key.json` in project

**Risk**: HIGH - Complete access to Firebase project

**Fix**:
```bash
# 1. Remove from Git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch service-account-key.json" \
  --prune-empty --tag-name-filter cat -- --all

# 2. Delete local file
rm service-account-key.json

# 3. Regenerate key in Firebase Console
# Firebase Console > Project Settings > Service Accounts > Generate new private key

# 4. Store new key securely (outside repo)
# Add to .env:
# GOOGLE_APPLICATION_CREDENTIALS=../path/to/new-service-account-key.json
```

### Issue 2: Missing Environment Variable Validation

**Status**: ⚠️ No validation before build/deployment

**Risk**: MEDIUM - App might deploy with missing config

**Fix**:
```bash
# Run validation before every build
npm run validate:env

# Add to package.json scripts:
"prebuild": "node scripts/validate-env.js",
"predeploy": "node scripts/validate-env.js --production"
```

---

## 🟡 Recommended Improvements

### 1. Implement Rate Limiting

**Current**: No rate limiting on API endpoints

**Recommendation**: Add express-rate-limit to backend

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### 2. Add Content Security Policy

**Current**: No CSP headers

**Recommendation**: Add to `firebase.json`:

```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com"
          }
        ]
      }
    ]
  }
}
```

### 3. Enable Firebase App Check

**Current**: Not enabled

**Recommendation**: Add App Check for API protection

```bash
# Enable in Firebase Console
# Add to your app:
npm install firebase/app-check

# In firebase config:
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
  isTokenAutoRefreshEnabled: true
});
```

### 4. Implement Audit Logging

**Current**: Limited logging

**Recommendation**: Log all security-relevant events

```typescript
// Log admin actions
async function logAdminAction(userId: string, action: string, details: any) {
  await db.collection('admin-audit-log').add({
    userId,
    action,
    details,
    timestamp: FieldValue.serverTimestamp(),
    ip: request.ip,
    userAgent: request.headers['user-agent']
  });
}
```

---

## 📋 Regular Maintenance Tasks

### Weekly
- [ ] Review authentication logs
- [ ] Check for failed login attempts
- [ ] Monitor error rates

### Monthly
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Review and update dependencies
- [ ] Check Firebase usage and quotas
- [ ] Review access logs

### Quarterly
- [ ] Full security audit
- [ ] Review and update security policies
- [ ] Penetration testing (if applicable)
- [ ] Rotate API keys (if needed)

---

## 🚨 Incident Response Plan

### If API Key is Compromised

1. **Immediately revoke** the compromised key
2. **Generate new key** in the service console
3. **Update environment variables** with new key
4. **Deploy** new version immediately
5. **Monitor** for unusual activity
6. **Review logs** to assess impact

### If User Data is Leaked

1. **Contain the breach** (disable affected endpoints)
2. **Assess scope** (how many users affected?)
3. **Notify users** (required by GDPR/PDPA)
4. **Document incident** for compliance
5. **Implement fixes** to prevent recurrence
6. **Report to authorities** if required by law

---

## ✅ Sign-Off

Before deploying to production, confirm:

- [ ] All items in Pre-Deployment Checklist completed
- [ ] All critical issues resolved
- [ ] Security testing performed
- [ ] Backup and recovery procedures tested
- [ ] Team trained on security procedures

**Signed by**: _________________  
**Date**: _________________  
**Role**: _________________

---

## 📞 Security Contact

For security concerns or to report vulnerabilities:

- **Email**: security@peace-script-ai.web.app
- **Response Time**: Within 24 hours
- **Encryption**: Use PGP key (if available)

---

**Note**: This checklist should be reviewed and updated regularly as new threats emerge and the application evolves.
