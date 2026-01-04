/**
 * Model Configuration Verification Script
 * ตรวจสอบว่าโมเดลที่ติดตั้งพร้อมใช้งานหรือไม่
 */

import { VIDEO_MODELS } from './src/utils/workflowBuilders.js';
import fs from 'fs';
import path from 'path';

const COMFYUI_MODELS_PATH = 'C:/ComfyUI/ComfyUI_windows_portable/ComfyUI/models';

console.log('\n🔍 ตรวจสอบการติดตั้งโมเดล\n');
console.log('='.repeat(60));

// 1. Check WAN Models
console.log('\n📹 WAN Video Models:');
console.log('-'.repeat(60));

const wanBasePath = path.join(COMFYUI_MODELS_PATH, 'wan-video-comfy');
const wanModels = VIDEO_MODELS.wan.models;

Object.entries(wanModels).forEach(([key, modelPath]) => {
  const fullPath = path.join(COMFYUI_MODELS_PATH, modelPath);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  const isDefault = VIDEO_MODELS.wan.defaultModelPath.includes(modelPath) ? '⭐' : '  ';
  console.log(`${status} ${isDefault} ${key.padEnd(15)} → ${modelPath}`);
  
  if (exists) {
    // Check if directory has files
    const files = fs.readdirSync(fullPath);
    const modelFiles = files.filter(f => f.endsWith('.safetensors') || f.endsWith('.pth') || f.endsWith('.ckpt'));
    console.log(`     └─ ไฟล์: ${modelFiles.length} files`);
  }
});

// 2. Check AnimateDiff
console.log('\n🎬 AnimateDiff Models:');
console.log('-'.repeat(60));

const animateDiffPath = path.join(COMFYUI_MODELS_PATH, 'animatediff_models');
const animateDiffModels = {
  'v3 Motion Module': 'v3_sd15_mm.ckpt',
  'v3 Adapter': 'v3_sd15_adapter.ckpt',
  'v2 Motion Module': 'mm_sd_v15_v2.ckpt',
};

Object.entries(animateDiffModels).forEach(([name, filename]) => {
  const fullPath = path.join(animateDiffPath, filename);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  const isDefault = VIDEO_MODELS.animateDiff.defaultMotionModel === filename ? '⭐' : '  ';
  
  if (exists) {
    const stats = fs.statSync(fullPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(0);
    console.log(`${status} ${isDefault} ${name.padEnd(20)} → ${filename} (${sizeMB} MB)`);
  } else {
    console.log(`${status} ${isDefault} ${name.padEnd(20)} → ${filename}`);
  }
});

// 3. Check IPAdapter
console.log('\n🎨 IPAdapter Models:');
console.log('-'.repeat(60));

const ipadapterPath = path.join(COMFYUI_MODELS_PATH, 'ipadapter', 'models');
const ipadapterModels = {
  'IPAdapter SD1.5': 'ip-adapter_sd15.safetensors',
  'IPAdapter Plus': 'ip-adapter-plus_sd15.safetensors',
};

Object.entries(ipadapterModels).forEach(([name, filename]) => {
  const fullPath = path.join(ipadapterPath, filename);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  
  if (exists) {
    const stats = fs.statSync(fullPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(0);
    console.log(`${status}    ${name.padEnd(20)} → ${filename} (${sizeMB} MB)`);
  } else {
    console.log(`${status}    ${name.padEnd(20)} → ${filename}`);
  }
});

// 4. Check CLIP Vision
console.log('\n👁️  CLIP Vision Model:');
console.log('-'.repeat(60));

const clipVisionPath = path.join(COMFYUI_MODELS_PATH, 'clip_vision', 'models', 'image_encoder', 'model.safetensors');
const clipExists = fs.existsSync(clipVisionPath);
const status = clipExists ? '✅' : '❌';

if (clipExists) {
  const stats = fs.statSync(clipVisionPath);
  const sizeGB = (stats.size / 1024 / 1024 / 1024).toFixed(1);
  console.log(`${status}    CLIP Vision Encoder → model.safetensors (${sizeGB} GB)`);
} else {
  console.log(`${status}    CLIP Vision Encoder → model.safetensors`);
}

// 5. Summary
console.log('\n📊 สรุป:');
console.log('='.repeat(60));

const checks = [
  { name: 'WAN T2V 14B', path: path.join(COMFYUI_MODELS_PATH, wanModels.t2v14B) },
  { name: 'WAN Animate 14B ⭐', path: path.join(COMFYUI_MODELS_PATH, wanModels.animate14B) },
  { name: 'WAN S2V 14B', path: path.join(COMFYUI_MODELS_PATH, wanModels.s2v14B) },
  { name: 'AnimateDiff v3 ⭐', path: path.join(animateDiffPath, 'v3_sd15_mm.ckpt') },
  { name: 'AnimateDiff Adapter', path: path.join(animateDiffPath, 'v3_sd15_adapter.ckpt') },
  { name: 'IPAdapter Plus', path: path.join(ipadapterPath, 'ip-adapter-plus_sd15.safetensors') },
  { name: 'CLIP Vision', path: clipVisionPath },
];

const allExists = checks.every(check => fs.existsSync(check.path));

checks.forEach(check => {
  const exists = fs.existsSync(check.path);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
});

console.log('\n' + '='.repeat(60));
if (allExists) {
  console.log('✅ ทุกโมเดลพร้อมใช้งาน!');
  console.log('\n💡 Next Steps:');
  console.log('   1. Restart ComfyUI service: docker-compose restart comfyui');
  console.log('   2. หรือ restart ComfyUI manually');
  console.log('   3. ทดสอบสร้างวิดีโอด้วย WAN Animate 14B');
} else {
  console.log('⚠️  มีโมเดลบางตัวยังไม่พร้อม');
  console.log('   กรุณาตรวจสอบและติดตั้งโมเดลที่ขาดหายไป');
}

console.log('\n📝 Configuration:');
console.log('   - Default WAN: Wan2.2-Animate-14B (character animation)');
console.log('   - Default AnimateDiff: v3_sd15_mm.ckpt (better motion)');
console.log('   - IPAdapter: พร้อมใช้งาน (manual ComfyUI workflow)');
console.log('\n' + '='.repeat(60));
