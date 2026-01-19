#!/usr/bin/env node

/**
 * Test script to verify the setup is correct
 * Run this before deploying to your remote VM
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 RemoteAssistant Setup Test\n');

let allPassed = true;

// Test 1: Check if dist directory exists
console.log('1️⃣  Checking build output...');
if (fs.existsSync('dist') && fs.existsSync('dist/index.js')) {
  console.log('   ✅ Build output found\n');
} else {
  console.log('   ❌ Build output not found. Run: npm run build\n');
  allPassed = false;
}

// Test 2: Check if node_modules exists
console.log('2️⃣  Checking dependencies...');
if (fs.existsSync('node_modules')) {
  console.log('   ✅ Dependencies installed\n');
} else {
  console.log('   ❌ Dependencies not installed. Run: npm install\n');
  allPassed = false;
}

// Test 3: Check Node.js version
console.log('3️⃣  Checking Node.js version...');
try {
  const version = process.version;
  const majorVersion = parseInt(version.slice(1).split('.')[0]);
  if (majorVersion >= 18) {
    console.log(`   ✅ Node.js ${version} (>= 18.x required)\n`);
  } else {
    console.log(`   ⚠️  Node.js ${version} found, but 18.x or higher recommended\n`);
  }
} catch (error) {
  console.log('   ❌ Cannot determine Node.js version\n');
  allPassed = false;
}

// Test 4: Check if .env exists
console.log('4️⃣  Checking configuration...');
if (fs.existsSync('.env')) {
  console.log('   ✅ .env file found');

  // Check if it's configured
  const envContent = fs.readFileSync('.env', 'utf8');
  const hasToken = envContent.includes('TELEGRAM_BOT_TOKEN=') &&
                   !envContent.includes('your_bot_token_here');
  const hasUserId = envContent.includes('ALLOWED_USER_ID=') &&
                    !envContent.includes('your_telegram_user_id_here');

  if (hasToken && hasUserId) {
    console.log('   ✅ Configuration appears complete\n');
  } else {
    console.log('   ⚠️  Configuration needs to be updated');
    console.log('      Edit .env file with your credentials\n');
  }
} else {
  console.log('   ⚠️  .env file not found');
  console.log('      Copy .env.example to .env and configure it\n');
}

// Test 5: Check if Claude Code CLI is available (optional on local machine)
console.log('5️⃣  Checking Claude Code CLI...');
try {
  execSync('claude --version', { stdio: 'ignore' });
  console.log('   ✅ Claude Code CLI is available\n');
} catch (error) {
  console.log('   ⚠️  Claude Code CLI not found (install on your remote VM)');
  console.log('      https://github.com/anthropics/claude-code\n');
}

// Test 6: Test module syntax (don't actually run it)
console.log('6️⃣  Testing module syntax...');
try {
  const indexCode = fs.readFileSync('dist/index.js', 'utf8');
  if (indexCode.includes('RemoteAssistantBot') && indexCode.includes('SessionManager')) {
    console.log('   ✅ Compiled modules look correct\n');
  } else {
    console.log('   ⚠️  Module structure may be incorrect\n');
  }
} catch (error) {
  console.log('   ❌ Cannot read compiled modules:', error.message, '\n');
  allPassed = false;
}

// Summary
console.log('=' .repeat(50));
if (allPassed) {
  console.log('✅ All critical tests passed!\n');
  console.log('📋 Next Steps:');
  console.log('   1. Configure .env file with your Telegram credentials');
  console.log('   2. Copy this project to your remote VM');
  console.log('   3. On the VM, ensure Claude Code CLI is installed');
  console.log('   4. Run: npm start\n');
} else {
  console.log('❌ Some tests failed. Fix the issues above.\n');
}
