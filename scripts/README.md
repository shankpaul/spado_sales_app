# Scripts Directory

This directory contains utility scripts for managing the SPADO Sales Dashboard.

## Available Scripts

### force-update.sh

**Purpose**: Forces a cache clear by updating the service worker cache version to the current timestamp, then builds the application.

**Usage**:
```bash
./scripts/force-update.sh
```

**What it does**:
1. Updates `CACHE_VERSION` in `public/sw.js` with current timestamp
2. Cleans the `dist` folder
3. Installs dependencies (if needed)
4. Builds the application
5. Provides git commands to commit and push

**When to use**:
- When deploying critical updates that users must see immediately
- When you want to force all users to clear their cache
- After fixing bugs that require cache clearing

**After running**:
1. Commit the updated sw.js with `git add public/sw.js && git commit -m "Force cache clear"`
2. Push to GitHub with `git push origin main`
3. Vercel will auto-deploy (wait ~2 minutes)
4. Users will automatically get the update within 60 seconds
5. Old caches will be automatically replaced

## Adding New Scripts

When adding scripts to this directory:
1. Make them executable: `chmod +x scripts/your-script.sh`
2. Add documentation to this README
3. Consider adding an npm script alias in `package.json`
