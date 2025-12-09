# Security Policy

## 🔒 API Keys & Secrets Management

### ❌ NEVER Commit These Files

```bash
.env
.env.local
.env.production
.env.*.local
```

These files are in `.gitignore` and should **NEVER** be committed to Git.

### ✅ Safe Files (Template Only)

```bash
.env.example      # ✅ Safe - contains placeholders only
.env.template     # ✅ Safe - contains placeholders only
```

**IMPORTANT:** Template files should only contain example values:

```bash
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 🛡️ Protection Measures

1. **Git Hooks Enabled**
   - Pre-commit hook scans for API keys
   - Blocks commits with sensitive data
   - Install: `git config core.hooksPath .githooks`

2. **.gitignore Coverage**
   - All `.env*` files (except examples) ignored
   - Pattern: `*.local`, `.env`, `.env.production`

3. **Automated Detection**
   - Google API Keys: `AIza[0-9A-Za-z_-]{35}`
   - Firebase configs in source code

## 🚨 What To Do If You Leaked an API Key

### Immediate Actions (Within 5 Minutes)

1. **Revoke the Key**
   - Google Gemini: https://aistudio.google.com/apikey
   - Delete the leaked key immediately

2. **Generate New Key**

   ```bash
   # Get new key from provider
   # Update .env.local ONLY (not .env.template!)
   ```

3. **Clean Git History**

   ```bash
   # Install BFG Repo-Cleaner
   brew install bfg

   # Remove leaked key
   bfg --replace-text <(echo 'LEAKED_KEY==>REMOVED') .

   # Force push (⚠️ rewrites history)
   git push --force
   ```

## ✅ Secure Setup Checklist

- [ ] Copy `.env.template` to `.env.local`
- [ ] Add real API keys to `.env.local` only
- [ ] Verify `.env.local` not tracked: `git status`
- [ ] Enable Git hooks: `git config core.hooksPath .githooks`
- [ ] Test hook: `.githooks/pre-commit`

## 📋 Before Every Commit

```bash
# Check for sensitive files
git status | grep -E '\.env$|\.env\.local'

# Review changes
git diff --cached

# Verify hook is active
.githooks/pre-commit
```

---

## Supported Versions

Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### Do NOT

- ❌ Open a public GitHub issue
- ❌ Disclose the vulnerability publicly
- ❌ Test the vulnerability in production

### DO

1. ✅ Email: security@peacescript.app (if available)
2. ✅ Use GitHub Security Advisories (preferred)
3. ✅ Provide detailed description with steps to reproduce
4. ✅ Include potential impact assessment

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
- Your contact information

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 1 week
  - Medium: 2 weeks
  - Low: 1 month

## Security Best Practices

### For Users

#### API Keys

- ⚠️ Never commit `.env` files
- ⚠️ Never share API keys publicly
- ⚠️ Rotate keys regularly
- ⚠️ Use environment variables

#### Authentication

- Use strong passwords (12+ characters)
- Enable 2FA when available
- Don't reuse passwords

### For Developers

#### Environment Variables

```bash
# ❌ BAD
const apiKey = "AIzaSyC-Y-j2mQny-YqukGPT4QIDvKOkGewNO48"

# ✅ GOOD
const apiKey = import.meta.env.VITE_GEMINI_API_KEY
```

#### Backend Security

- Always validate input
- Use parameterized queries
- Implement rate limiting
- Use HTTPS in production
- Keep dependencies updated

#### Database

- Use strong MongoDB passwords
- Enable authentication
- Limit network access
- Regular backups

## Known Security Features

### Frontend

- ✅ Environment variable protection
- ✅ Error boundary implementation
- ✅ Input sanitization
- ✅ CORS configuration

### Backend

- ✅ JWT authentication
- ✅ Bcrypt password hashing
- ✅ Helmet security headers
- ✅ Rate limiting
- ✅ Express validator
- ✅ MongoDB authentication

### Infrastructure

- ✅ Docker containerization
- ✅ Environment isolation
- ✅ Secure defaults

## Security Updates

Security updates will be:

- Released as patch versions (1.0.x)
- Announced via GitHub Security Advisories
- Documented in CHANGELOG.md

## Acknowledgments

We appreciate responsible disclosure and will:

- Credit you in release notes (if desired)
- Keep you updated on fix progress
- Thank you publicly (with permission)

## Questions?

For security-related questions:

- 📧 security@peacescript.app
- 🔒 GitHub Security Advisories
- 📖 Documentation: README.md

---

**Last Updated:** 29 พฤศจิกายน 2568
