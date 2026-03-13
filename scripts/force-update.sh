#!/bin/bash

# SPADO Sales Dashboard - Cache Clear & Force Update Script
# This script helps clear all caches and force users to see the latest version

echo "🔄 SPADO Cache Clear & Update Script"
echo "===================================="
echo ""

# Get current timestamp for cache busting
TIMESTAMP=$(date +%s)
CURRENT_DATE=$(date +%Y-%m-%d)
echo "📅 Build timestamp: $TIMESTAMP ($CURRENT_DATE)"

# Update the service worker cache version
echo "🔧 Updating service worker cache version..."
sed -i.bak "s/const CACHE_VERSION = '[0-9]*'; \/\/ Updated: [0-9-]*/const CACHE_VERSION = '$TIMESTAMP'; \/\/ Updated: $CURRENT_DATE/" public/sw.js

# Clean old build
echo "🧹 Cleaning old build..."
rm -rf dist

# Install dependencies (if needed)
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Build the application
echo "🏗️  Building application..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build successful!"
  echo ""
  echo "📋 Next steps to deploy:"
  echo "1. Commit the updated service worker:"
  echo "   git add public/sw.js"
  echo "   git commit -m 'Force cache clear - update to v$TIMESTAMP'"
  echo ""
  echo "2. Push to GitHub (Vercel will auto-deploy):"
  echo "   git push origin main"
  echo ""
  echo "3. Monitor deployment at vercel.com dashboard"
  echo ""
  echo "4. After deployment (wait ~2 minutes):"
  echo "   - Users will auto-update within 60 seconds"
  echo "   - Or they can refresh the PWA manually"
  echo ""
  echo "If users still see old content:"
  echo "- Ask them to close and reopen the PWA"
  echo "- Or follow cache clear steps in DEPLOYMENT.md"
  echo ""
  echo "🎉 Cache version updated to: $TIMESTAMP"
else
  echo "❌ Build failed!"
  # Restore backup
  mv public/sw.js.bak public/sw.js
  exit 1
fi

# Clean up backup
rm -f public/sw.js.bak

echo ""
echo "🚀 Ready to deploy!"
