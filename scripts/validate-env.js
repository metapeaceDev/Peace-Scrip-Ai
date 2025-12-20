#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 * ตรวจสอบความครบถ้วนของ environment variables ก่อน build/deploy
 * 
 * Usage:
 *   node scripts/validate-env.js
 *   npm run validate:env
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Required environment variables configuration
const ENV_CONFIG = {
  // Critical - Application won't work without these
  critical: [
    {
      name: 'VITE_FIREBASE_API_KEY',
      description: 'Firebase API Key',
      example: 'AIzaSy_EXAMPLE_KEY',
      validation: (val) => val && val.startsWith('AIza'),
    },
    {
      name: 'VITE_FIREBASE_AUTH_DOMAIN',
      description: 'Firebase Auth Domain',
      example: 'your-project.firebaseapp.com',
      validation: (val) => val && val.includes('firebaseapp.com'),
    },
    {
      name: 'VITE_FIREBASE_PROJECT_ID',
      description: 'Firebase Project ID',
      example: 'your-project-id',
      validation: (val) => val && val.length > 0,
    },
    {
      name: 'VITE_FIREBASE_STORAGE_BUCKET',
      description: 'Firebase Storage Bucket',
      example: 'your-project.appspot.com or your-project.firebasestorage.app',
      validation: (val) => val && (val.includes('appspot.com') || val.includes('firebasestorage.app')),
    },
    {
      name: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
      description: 'Firebase Messaging Sender ID',
      example: '123456789012',
      validation: (val) => val && /^\d+$/.test(val),
    },
    {
      name: 'VITE_FIREBASE_APP_ID',
      description: 'Firebase App ID',
      example: '1:123456789012:web:abcdef123456',
      validation: (val) => val && val.includes(':web:'),
    },
    {
      name: 'VITE_GEMINI_API_KEY',
      description: 'Google Gemini API Key',
      example: 'AIzaSy_EXAMPLE_KEY',
      validation: (val) => val && val.startsWith('AIza'),
    },
  ],

  // Required for production
  production: [
    {
      name: 'VITE_STRIPE_PUBLISHABLE_KEY',
      description: 'Stripe Publishable Key',
      example: 'pk_live_XXXXXXXXXXXXXXXXXXXXXXXX',
      validation: (val) => val && (val.startsWith('pk_live_') || val.startsWith('pk_test_')),
    },
    {
      name: 'VITE_FIREBASE_MEASUREMENT_ID',
      description: 'Firebase Analytics Measurement ID',
      example: 'G-XXXXXXXXXX',
      validation: (val) => val && val.startsWith('G-'),
    },
  ],

  // Optional but recommended
  optional: [
    'VITE_STRIPE_SECRET_KEY',
    'VITE_STRIPE_WEBHOOK_SECRET',
    'VITE_EMAIL_PROVIDER',
    'VITE_EMAIL_FROM',
    'VITE_EMAIL_REPLY_TO',
    'VITE_SENDGRID_API_KEY',
    'VITE_API_URL',
    'VITE_COMFYUI_LOCAL_URL',
    'VITE_USE_COMFYUI_BACKEND',
    'VITE_RUNPOD_API_KEY',
    'VITE_RUNPOD_POD_ID',
    'VITE_COMFYUI_CLOUD_URL',
    'VITE_REPLICATE_API_KEY',
    'VITE_HUGGINGFACE_API_KEY',
    'VITE_GOOGLE_TTS_API_KEY',
    'VITE_AZURE_TTS_KEY',
    'VITE_AZURE_TTS_REGION',
  ],
};

// Load environment variables from .env files
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};

  content.split('\n').forEach((line) => {
    line = line.trim();
    
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) {
      return;
    }

    // Parse KEY=VALUE
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Remove quotes if present
      env[key] = value.replace(/^["'](.*)["']$/, '$1');
    }
  });

  return env;
}

// Main validation function
function validateEnvironment(isProduction = false) {
  log('\n🔍 Validating Environment Variables...\n', 'cyan');

  const errors = [];
  const warnings = [];
  const info = [];

  // Determine which env file to use
  const envFiles = [
    '.env.local',
    '.env.production',
    '.env',
  ];

  let env = {};
  let loadedFile = null;

  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      env = { ...env, ...loadEnvFile(filePath) };
      loadedFile = file;
      info.push(`✓ Loaded: ${file}`);
    }
  }

  if (!loadedFile) {
    errors.push('❌ No .env file found! Please create .env or .env.local');
    errors.push('   Copy .env.example to .env.local and fill in your values');
  }

  // Validate critical variables
  log('📋 Checking CRITICAL variables:', 'yellow');
  ENV_CONFIG.critical.forEach((config) => {
    const value = env[config.name];
    
    if (!value) {
      errors.push(`❌ Missing: ${config.name}`);
      errors.push(`   Description: ${config.description}`);
      errors.push(`   Example: ${config.example}\n`);
    } else if (value.includes('your_') || value.includes('xxxx')) {
      errors.push(`❌ Invalid: ${config.name} still contains placeholder value`);
      errors.push(`   Current: ${value}`);
      errors.push(`   Expected format: ${config.example}\n`);
    } else if (config.validation && !config.validation(value)) {
      errors.push(`❌ Invalid format: ${config.name}`);
      errors.push(`   Current: ${value}`);
      errors.push(`   Expected format: ${config.example}\n`);
    } else {
      // Mask sensitive values in output
      const maskedValue = value.substring(0, 10) + '...' + value.substring(value.length - 4);
      log(`  ✓ ${config.name}: ${maskedValue}`, 'green');
    }
  });

  // Validate production variables (if in production mode)
  if (isProduction) {
    log('\n📋 Checking PRODUCTION variables:', 'yellow');
    ENV_CONFIG.production.forEach((config) => {
      const value = env[config.name];
      
      if (!value) {
        warnings.push(`⚠️  Missing: ${config.name} (recommended for production)`);
        warnings.push(`   Description: ${config.description}\n`);
      } else if (config.validation && !config.validation(value)) {
        warnings.push(`⚠️  Invalid format: ${config.name}`);
        warnings.push(`   Current: ${value}`);
        warnings.push(`   Expected format: ${config.example}\n`);
      } else {
        const maskedValue = value.substring(0, 10) + '...' + value.substring(value.length - 4);
        log(`  ✓ ${config.name}: ${maskedValue}`, 'green');
      }
    });
  }

  // Check optional variables
  log('\n📋 Checking OPTIONAL variables:', 'yellow');
  const configuredOptional = ENV_CONFIG.optional.filter((name) => env[name]);
  const missingOptional = ENV_CONFIG.optional.filter((name) => !env[name]);

  configuredOptional.forEach((name) => {
    const value = env[name];
    const maskedValue = value.substring(0, 10) + '...' + value.substring(value.length - 4);
    log(`  ✓ ${name}: ${maskedValue}`, 'green');
  });

  if (missingOptional.length > 0) {
    info.push(`ℹ️  Optional variables not configured: ${missingOptional.length}/${ENV_CONFIG.optional.length}`);
    info.push(`   (These are optional and can be configured later)`);
  }

  // Print results
  log('\n' + '='.repeat(80), 'blue');
  log('📊 VALIDATION RESULTS', 'cyan');
  log('='.repeat(80) + '\n', 'blue');

  if (info.length > 0) {
    log('ℹ️  Information:', 'blue');
    info.forEach((msg) => log(msg, 'blue'));
    log('');
  }

  if (warnings.length > 0) {
    log('⚠️  Warnings:', 'yellow');
    warnings.forEach((msg) => log(msg, 'yellow'));
    log('');
  }

  if (errors.length > 0) {
    log('❌ Errors:', 'red');
    errors.forEach((msg) => log(msg, 'red'));
    log('');
    log('🔧 How to fix:', 'cyan');
    log('1. Copy .env.example to .env.local', 'cyan');
    log('2. Fill in all required values with your actual credentials', 'cyan');
    log('3. Run this script again to validate', 'cyan');
    log('');
    process.exit(1);
  }

  // Summary
  const totalRequired = ENV_CONFIG.critical.length + (isProduction ? ENV_CONFIG.production.length : 0);
  const totalConfigured = ENV_CONFIG.critical.filter((c) => env[c.name]).length +
    (isProduction ? ENV_CONFIG.production.filter((c) => env[c.name]).length : 0);

  log('✅ Validation Summary:', 'green');
  log(`   Critical Variables: ${totalConfigured}/${totalRequired} configured`, 'green');
  log(`   Optional Variables: ${configuredOptional.length}/${ENV_CONFIG.optional.length} configured`, 'green');
  log('');

  if (totalConfigured === totalRequired) {
    log('🎉 All required environment variables are properly configured!', 'green');
    log('✨ Your application is ready to run!', 'green');
    process.exit(0);
  } else {
    log('⚠️  Some required variables are missing', 'yellow');
    process.exit(1);
  }
}

// Run validation
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production');
validateEnvironment(isProduction);
