#!/usr/bin/env node

/**
 * Automatically update Service Worker cache version before build
 * This ensures users get fresh content on every deployment
 */

const fs = require('fs');
const path = require('path');

const SW_PATH = path.join(__dirname, '..', 'public', 'sw.js');
const timestamp = Math.floor(Date.now() / 1000);
const currentDate = new Date().toISOString().split('T')[0];

console.log('🔄 Updating Service Worker cache version...');
console.log(`📅 Build timestamp: ${timestamp} (${currentDate})`);

try {
  // Read the service worker file
  let swContent = fs.readFileSync(SW_PATH, 'utf8');

  // Update the CACHE_VERSION line with new timestamp
  const updated = swContent.replace(
    /const CACHE_VERSION = '\d+'; \/\/ Updated: .+/,
    `const CACHE_VERSION = '${timestamp}'; // Updated: ${currentDate}`
  );

  // Write back to file
  fs.writeFileSync(SW_PATH, updated, 'utf8');

  console.log('✅ Service Worker cache version updated successfully!');
  console.log(`   New version: ${timestamp}`);
} catch (error) {
  console.error('❌ Error updating service worker:', error.message);
  process.exit(1);
}
