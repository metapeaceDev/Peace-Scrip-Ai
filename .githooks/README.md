# Git Hooks for Security

This directory contains Git hooks to prevent accidentally committing sensitive data.

## Installation

Run this command once to enable the hooks:

```bash
git config core.hooksPath .githooks
```

## What it does

The pre-commit hook will:

1. ✅ Block commits of `.env`, `.env.local`, `.env.production`
2. ✅ Detect Google API keys (AIza...)
3. ✅ Warn about Firebase config in code
4. ✅ Ensure template files don't contain real keys

## Bypass (Emergency Only)

If you absolutely need to bypass the hook (NOT RECOMMENDED):

```bash
git commit --no-verify -m "your message"
```

## Testing

Test the hook without committing:

```bash
.githooks/pre-commit
```
