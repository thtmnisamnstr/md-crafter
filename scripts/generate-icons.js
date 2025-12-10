#!/usr/bin/env node

/**
 * Icon generation script for md-crafter desktop app
 * 
 * Prerequisites:
 * - Node.js 18+
 * - sharp: npm install sharp
 * 
 * Usage:
 * node scripts/generate-icons.js
 * 
 * This script generates:
 * - icon.png (512x512 for Linux)
 * - icon.ico (Windows)
 * - icon.icns (macOS)
 */

const fs = require('fs');
const path = require('path');

const RESOURCES_DIR = path.join(__dirname, '../packages/desktop/resources');
const SVG_PATH = path.join(RESOURCES_DIR, 'icon.svg');

async function generateIcons() {
  console.log('Generating icons for md-crafter desktop app...\n');

  // Check if sharp is available
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.log('sharp is not installed. Installing...');
    const { execSync } = require('child_process');
    execSync('npm install sharp --save-dev', { stdio: 'inherit' });
    sharp = require('sharp');
  }

  // Check if SVG exists
  if (!fs.existsSync(SVG_PATH)) {
    console.error('Error: icon.svg not found in resources directory');
    process.exit(1);
  }

  // Generate PNG for Linux (512x512)
  console.log('Generating icon.png (512x512)...');
  await sharp(SVG_PATH)
    .resize(512, 512)
    .png()
    .toFile(path.join(RESOURCES_DIR, 'icon.png'));
  console.log('✓ icon.png created\n');

  // Generate various sizes for Windows ICO
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = await Promise.all(
    sizes.map(size =>
      sharp(SVG_PATH)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );

  // For ICO generation, we'll use png-to-ico if available, or just create 256x256 PNG
  try {
    const pngToIco = require('png-to-ico');
    console.log('Generating icon.ico...');
    const icoBuffer = await pngToIco(pngBuffers);
    fs.writeFileSync(path.join(RESOURCES_DIR, 'icon.ico'), icoBuffer);
    console.log('✓ icon.ico created\n');
  } catch (e) {
    console.log('png-to-ico not available, creating 256x256 PNG as icon.ico placeholder');
    await sharp(SVG_PATH)
      .resize(256, 256)
      .png()
      .toFile(path.join(RESOURCES_DIR, 'icon.ico'));
    console.log('✓ icon.ico placeholder created (use electron-icon-builder for proper ICO)\n');
  }

  // For macOS ICNS, we'll need electron-icon-builder or similar
  // For now, create a 1024x1024 PNG that electron-builder can use
  console.log('Generating icon.icns...');
  try {
    // electron-builder can convert PNG to ICNS on macOS
    await sharp(SVG_PATH)
      .resize(1024, 1024)
      .png()
      .toFile(path.join(RESOURCES_DIR, 'icon.icns'));
    console.log('✓ icon.icns created (PNG format, electron-builder will convert on macOS)\n');
  } catch (e) {
    console.log('Warning: Could not create icon.icns:', e.message);
  }

  console.log('Icon generation complete!');
  console.log('\nNote: For production builds, consider using electron-icon-builder:');
  console.log('  npx electron-icon-builder --input=./icon.svg --output=./');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});

