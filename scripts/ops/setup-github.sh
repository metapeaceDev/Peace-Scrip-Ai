# Quick Setup Script for GitHub Deployment

# This script will help you deploy to GitHub and then to Netlify/Vercel

echo "🚀 Peace Script AI - GitHub Setup"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Installing..."
    echo "Please install GitHub CLI first:"
    echo "brew install gh"
    echo "or visit: https://cli.github.com/"
    exit 1
fi

# Authenticate if needed
echo "📝 Checking GitHub authentication..."
if ! gh auth status &> /dev/null; then
    echo "🔐 Please login to GitHub:"
    gh auth login
fi

# Create repository
echo ""
echo "📦 Creating GitHub repository..."
read -p "Enter repository name (default: peace-script-ai): " REPO_NAME
REPO_NAME=${REPO_NAME:-peace-script-ai}

read -p "Make repository private? (y/N): " IS_PRIVATE
if [[ $IS_PRIVATE =~ ^[Yy]$ ]]; then
    VISIBILITY="--private"
else
    VISIBILITY="--public"
fi

gh repo create "$REPO_NAME" $VISIBILITY --source=. --remote=origin --description="Professional AI-powered screenwriting and pre-production tool"

# Push code
echo ""
echo "⬆️  Pushing code to GitHub..."
git push -u origin main

echo ""
echo "✅ Success! Repository created and code pushed."
echo ""
echo "🌐 Repository URL:"
gh repo view --web

echo ""
echo "🎯 Next Steps:"
echo "1. Go to Netlify: https://app.netlify.com/start"
echo "2. Click 'Import from Git' → Select your repository"
echo "3. Set environment variable: VITE_GEMINI_API_KEY"
echo "4. Deploy!"
echo ""
echo "Or deploy to Vercel:"
echo "1. Go to Vercel: https://vercel.com/new"
echo "2. Import your GitHub repository"
echo "3. Set environment variable: VITE_GEMINI_API_KEY"
echo "4. Deploy!"
echo ""
echo "For detailed instructions, see DEPLOYMENT.md"
