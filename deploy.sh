#!/bin/bash

# ========================================
# Peace Script AI - Firebase Deployment Script
# ========================================

set -e  # Exit on error

echo "════════════════════════════════════════════════════════════════"
echo "         🚀 Firebase Deployment Script"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local not found!"
    echo ""
    echo "📝 Please create .env.local with your Firebase config:"
    echo "   cp .env.template .env.local"
    echo "   # Then edit .env.local with your Firebase values"
    echo ""
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found!"
    echo ""
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
    echo "✅ Firebase CLI installed"
    echo ""
fi

echo "✅ Firebase CLI ready"
echo ""

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please login to Firebase..."
    firebase login
    echo ""
fi

echo "✅ Firebase authenticated"
echo ""

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
    echo ""
else
    echo "❌ Build failed!"
    exit 1
fi

# Check if .firebaserc exists (project initialized)
if [ ! -f .firebaserc ]; then
    echo "🔧 Firebase not initialized. Running firebase init..."
    echo ""
    echo "⚠️  Please select:"
    echo "   - Firestore, Hosting, Storage"
    echo "   - Use existing project"
    echo "   - Public directory: dist"
    echo "   - Single-page app: Yes"
    echo "   - Overwrite files: No"
    echo ""
    firebase init
    echo ""
fi

# Deploy
echo "🚀 Deploying to Firebase..."
echo ""

# Deploy security rules first
echo "📋 Deploying Firestore rules..."
firebase deploy --only firestore:rules

echo "📋 Deploying Storage rules..."
firebase deploy --only storage:rules

echo "📋 Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

# Deploy hosting
echo "🌐 Deploying website..."
firebase deploy --only hosting

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "         ✅ DEPLOYMENT COMPLETE!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🌐 Your website is live!"
echo ""
echo "📊 Next steps:"
echo "   1. Open your hosting URL (shown above)"
echo "   2. Test authentication (Email + Google)"
echo "   3. Create a test project"
echo "   4. Check Firebase Console for data"
echo ""
echo "🎉 Peace Script AI is now online!"
echo ""
