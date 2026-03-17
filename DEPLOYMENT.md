# SPADO Sales Dashboard - Deployment Guide

## PWA Cache Management & Updates

> **Note**: This project is configured with Vercel auto-deployment. When you push to GitHub (main branch), Vercel automatically builds and deploys the application. No manual `vercel` commands needed!

> **✨ New**: Cache versioning is now automatic! Every deployment automatically updates the service worker cache version via a prebuild script. No need to run `npm run force-update` manually unless troubleshooting.

### Understanding the Issue
When you deploy new changes to Vercel, mobile users might not see updates immediately due to:
1. **Service Worker Caching** - Old files cached by the service worker
2. **Browser Caching** - Browser's own cache
3. **PWA Installation** - Installed PWAs cache aggressively

### What We've Fixed

#### 1. **Network-First Strategy for HTML**
- HTML files now fetch from network first
- This ensures the app shell is always fresh
- Falls back to cache only when offline

#### 2. **Dynamic Cache Versioning** (Automatic)
- Service worker cache name includes timestamp
- **Automatically updates on every build** via prebuild script
- Each deployment gets a new cache version
- Old caches are automatically cleaned up
- No manual `npm run force-update` needed for normal deployments

#### 3. **Proper Cache Headers** (vercel.json)
```json
{
  "index.html": "max-age=0, must-revalidate",
  "manifest.webmanifest": "max-age=0, must-revalidate",
  "sw.js": "max-age=0, must-revalidate",
  "assets/*": "max-age=31536000, immutable"
}
```

#### 4. **Auto-Update Mechanism**
- Service worker checks for updates every 60 seconds
- When update found, automatically reloads after 1 second
- User sees fresh content on next page load

### Deployment Checklist

#### Before Deploying:
1. ✅ Increment version in `package.json` (optional but recommended)
2. ✅ Test locally: `npm run build && npm run preview`
3. ✅ Commit all changes

#### Typical Development Workflow:
```bash
# 1. Make your changes
# 2. Test locally
npm run dev

# 3. Commit your changes
git add .
git commit -m "Your feature/fix description"

# 4. Push to GitHub - Vercel auto-deploys
git push origin main

# Cache version is automatically updated during Vercel build!
# No manual force-update needed - it happens on every deployment

# 5. Monitor at https://vercel.com/dashboard
# Deployment typically takes 1-2 minutes
```

#### Deploy to Vercel:

**Option 1: Automatic Git Deploy (Recommended)**
```bash
# Vercel auto-deploys when you push to GitHub
git add .
git commit -m "Your commit message"
git push origin main

# Vercel will automatically build and deploy
# Check deployment status at vercel.com dashboard
```

**Option 2: Manual Force Update (Rarely Needed)**
```bash
# Only needed if you want to manually update cache version locally
# Normal deployments update automatically via prebuild script
npm run force-update

# Then commit and push
git add public/sw.js
git commit -m "Manual cache clear - update service worker version"
git push origin main
```

**Option 3: Manual Vercel Deploy (if needed)**
```bash
# Build locally and deploy directly
npm run build
vercel --prod
```

#### After Deploying:
1. ✅ Check Vercel Dashboard - deployment should show "Ready" status
2. ✅ Wait 1-2 minutes for deployment to complete and propagate
3. ✅ Visit your production URL to verify changes
4. ✅ Open DevTools > Application > Service Workers > Click "Update"
5. ✅ Within 60 seconds, users will automatically receive the update

### Force Cache Clear on Mobile

If users still see old content, have them:

#### iOS Safari:
1. Open the PWA
2. Settings App > Safari > Clear History and Website Data
3. OR: Close PWA, reopen Safari, visit site, then install PWA again

#### Android Chrome:
1. Chrome Menu (⋮) > Settings
2. Privacy > Clear browsing data
3. Select "Cached images and files"
4. Click "Clear data"
5. Revisit the site or PWA

#### Quick Fix (All Devices):
1. **Uninstall the PWA** from home screen
2. Clear browser cache
3. Visit the website in browser
4. **Reinstall the PWA**

### Testing Updates Work

```javascript
// Add this to browser console after deployment
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => {
    registration.update();
    console.log('Service worker updated!');
  });
});

// Then reload after 2 seconds
setTimeout(() => location.reload(), 2000);
```

### PWA Install Requirements

For the install prompt to show:

#### General Requirements:
- ✅ HTTPS (Vercel provides this)
- ✅ Valid manifest.json with icons
- ✅ Service worker registered
- ✅ User engagement (visit site at least twice, 5 minutes apart)

#### iOS Specific:
- No automatic install prompt
- User must manually: Share button → Add to Home Screen
- Requires all manifest fields properly set

#### Android Specific:
- Shows mini-infobar automatically after engagement criteria met
- Full install dialog via prompt

### Troubleshooting

#### Problem: PWA Install Not Showing
**Android:**
```javascript
// Check if PWA is installable in console:
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('Install prompt available!');
  deferredPrompt = e;
});
```

**iOS:**
- No automatic prompt - users must manually add via Share menu
- Ensure manifest.webmanifest is correctly linked in HTML

#### Problem: Users See Old Content
1. Check service worker is registered: DevTools > Application > Service Workers
2. Force update: Click "Update" button in DevTools
3. Check cache version in DevTools > Application > Cache Storage
4. Clear old caches manually if needed

#### Problem: Changes Not Appearing After Deploy
1. Wait 60 seconds (auto-update interval)
2. Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
3. Check Network tab - should see new file hashes in JS/CSS names
4. Verify sw.js has new timestamp

### Monitoring

#### Check Current Cache Version:
```javascript
// In browser console
caches.keys().then(keys => console.log('Cache versions:', keys));
```

#### Check Service Worker Status:
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => {
    console.log('SW State:', reg.active?.state);
    console.log('SW URL:', reg.active?.scriptURL);
  });
});
```

### Best Practices

1. **Always test in incognito** before declaring deployment successful
2. **Use version numbers** in console.logs for debugging
3. **Monitor Vercel deployment logs** for build errors
4. **Keep service worker simple** - avoid complex caching logic
5. **Document breaking changes** that require cache clear

### Emergency: Nuclear Cache Clear

If all else fails, add this to your app temporarily:

```javascript
// Add to src/main.jsx temporarily
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
    });
  });
  
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
    });
  });
}
```

Then:
1. Deploy this version
2. Users visit once (clears everything)
3. Remove the code
4. Deploy normal version
5. Service worker reinstalls fresh

