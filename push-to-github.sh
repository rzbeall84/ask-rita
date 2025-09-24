#!/bin/bash

# Rita Recruit AI - GitHub Push Script
# This script helps complete the final step of pushing code to GitHub

echo "🚀 Rita Recruit AI - Final GitHub Push"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the rita-recruit-ai-clean directory"
    exit 1
fi

echo "📁 Current directory: $(pwd)"
echo "🔍 Checking git status..."
git status

echo ""
echo "🔗 Remote repository:"
git remote -v

echo ""
echo "📋 Ready to push to GitHub!"
echo ""
echo "Choose your authentication method:"
echo "1. Personal Access Token (Recommended)"
echo "2. SSH Key"
echo "3. GitHub CLI"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "📝 Using Personal Access Token:"
        echo "1. Go to GitHub Settings > Developer Settings > Personal Access Tokens"
        echo "2. Generate a new token with 'repo' permissions"
        echo "3. Use your GitHub username and the token as password"
        echo ""
        echo "🚀 Running git push..."
        git push origin main
        ;;
    2)
        echo ""
        echo "🔑 Using SSH Key:"
        echo "First, let's change the remote to SSH:"
        git remote set-url origin git@github.com:rzbeall84/ask-rita.git
        echo "🚀 Running git push..."
        git push origin main
        ;;
    3)
        echo ""
        echo "🔧 Using GitHub CLI:"
        echo "🚀 Authenticating with GitHub CLI..."
        gh auth login --web
        echo "🚀 Running git push..."
        git push origin main
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Code pushed to GitHub successfully!"
    echo "🎉 Vercel will now automatically deploy your application"
    echo "🌐 Check your deployment at: https://www.askrita.org"
    echo ""
    echo "📋 Next steps:"
    echo "1. Run the database setup SQL in Supabase"
    echo "2. Test the application"
    echo "3. Configure additional services (OpenAI, Stripe) if needed"
else
    echo ""
    echo "❌ Push failed. Please check your authentication and try again."
    echo ""
    echo "💡 Alternative options:"
    echo "1. Use GitHub Desktop application"
    echo "2. Use VS Code with GitHub integration"
    echo "3. Upload files manually through GitHub web interface"
fi
