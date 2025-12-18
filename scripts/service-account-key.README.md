# Service Account Key Placeholder

⚠️ **IMPORTANT: DO NOT COMMIT THIS FILE TO GIT** ⚠️

This file should contain your Firebase service account key JSON.

## How to Get Service Account Key:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click ⚙️ (Settings) → Project Settings
4. Go to "Service Accounts" tab
5. Click "Generate New Private Key"
6. Download the JSON file
7. Rename it to `service-account-key.json`
8. Place it in the `scripts/` directory

## Expected Structure:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-...@your-project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

## Security Notes:

- This file contains sensitive credentials
- Never commit to version control
- Add to `.gitignore`
- Keep it secure on your local machine only
- Use environment variables in production

## Alternative: Environment Variables

Instead of using a JSON file, you can set environment variables:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

Or in Cloud Functions/Cloud Run:

```bash
gcloud functions deploy myFunction \
  --set-env-vars GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
```
