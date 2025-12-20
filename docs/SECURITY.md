# Security Policy

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
const apiKey = "AIzaSy_YOUR_KEY_HERE"

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
