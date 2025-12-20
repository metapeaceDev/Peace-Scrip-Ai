# Ollama Setup Guide - Local AI Text Generation

## 🎯 Overview

Ollama ให้คุณรัน AI models บนเครื่องของคุณเองได้ฟรี 100% ไม่ต้องจ่ายค่า API

**ประหยัดได้เท่าไหร่?**

- Gemini 1.5 Flash: ~฿0.35 ต่อโปรเจค
- **Ollama (Local): ฿0 ต่อโปรเจค** ✨

สำหรับ 100 โปรเจค = ประหยัด **฿35** (100%)

---

## 📥 Installation

### macOS

```bash
# Download and install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Or using Homebrew
brew install ollama
```

### Windows

1. Download: https://ollama.com/download/windows
2. Run the installer
3. Ollama will start automatically

### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

---

## 🚀 Quick Start

### 1. Start Ollama Service

```bash
# macOS/Linux
ollama serve

# Windows: Already running as service
```

### 2. Download Recommended Models

**For Quick Drafts (2GB, 1-2s):**

```bash
ollama pull llama3.2:3b
```

**For Balanced Performance (4GB, 3-5s):**

```bash
ollama pull llama3.2:7b
ollama pull qwen2.5:7b
```

**For Advanced Writing (9GB+, 8-12s):**

```bash
ollama pull qwen2.5:14b
ollama pull deepseek-r1:7b
```

### 3. Test Your Model

```bash
ollama run llama3.2:3b "เขียนบทภาพยนตร์แนวสยองขวัญ 3 ฉาก"
```

---

## 🎬 Recommended Models for Script Writing

| Model              | Size  | Speed         | Quality    | Best For               |
| ------------------ | ----- | ------------- | ---------- | ---------------------- |
| **Llama 3.2 3B**   | 2GB   | ⚡⚡⚡⚡ 1-2s | ⭐⭐⭐     | Quick drafts, dialogue |
| **Llama 3.2 7B**   | 4GB   | ⚡⚡⚡ 3-5s   | ⭐⭐⭐⭐   | Scene descriptions     |
| **Qwen 2.5 7B**    | 4GB   | ⚡⚡⚡ 3-5s   | ⭐⭐⭐⭐   | Creative writing       |
| **Qwen 2.5 14B**   | 9GB   | ⚡⚡ 8-12s    | ⭐⭐⭐⭐⭐ | Full screenplays       |
| **DeepSeek R1 7B** | 4.7GB | ⚡⚡ 5-8s     | ⭐⭐⭐⭐⭐ | Plot analysis          |

---

## 💻 System Requirements

### Minimum (for 3B models)

- **RAM**: 8GB
- **Storage**: 5GB free space
- **CPU**: Any modern processor
- **OS**: macOS 11+, Windows 10+, Linux

### Recommended (for 7B models)

- **RAM**: 16GB
- **Storage**: 10GB free space
- **CPU**: 4+ cores
- **GPU**: Optional (speeds up generation)

### Advanced (for 14B+ models)

- **RAM**: 32GB
- **Storage**: 20GB free space
- **CPU**: 8+ cores
- **GPU**: 8GB+ VRAM (recommended)

---

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```env
# Ollama API endpoint
OLLAMA_BASE_URL=http://localhost:11434

# Default model preference
OLLAMA_DEFAULT_MODEL=llama3.2:7b

# Temperature (0.0-1.0, lower = more focused)
OLLAMA_TEMPERATURE=0.7

# Max tokens per response
OLLAMA_MAX_TOKENS=2000
```

### GPU Acceleration (Optional)

**For NVIDIA GPUs:**

```bash
# Check if GPU is detected
ollama run llama3.2:3b --verbose

# Should show: "Using CUDA backend"
```

**For Apple Silicon (M1/M2/M3):**

```bash
# Automatically uses Metal acceleration
# No additional setup needed!
```

---

## 📊 Usage Examples

### Generate Scene Description

```typescript
import { generateText } from './services/ollamaService';

const response = await generateText({
  model: 'llama3.2:7b',
  prompt: 'เขียนบทฉากเปิดภาพยนตร์แนวระทึกขวัญ ฉากในป่าลึกเวลากลางคืน',
  temperature: 0.7,
});

console.log(response.text);
console.log(`Generated in ${response.generationTime}s`);
console.log(`Cost: ฿${response.cost}`); // Always ฿0!
```

### Stream Real-time Output

```typescript
import { streamText } from './services/ollamaService';

for await (const chunk of streamText({
  model: 'qwen2.5:7b',
  prompt: 'เขียนบทภาพยนตร์ 5 ฉาก',
})) {
  process.stdout.write(chunk); // Shows text as it generates
}
```

### Auto-Select Optimal Model

```typescript
import { selectOptimalOllamaModel } from './services/ollamaService';

const model = await selectOptimalOllamaModel('balanced', 16); // 16GB RAM
console.log(`Using: ${model.name}`);
console.log(`Speed: ${model.avgSpeed}`);
```

---

## 🛠️ Troubleshooting

### ❌ "Connection refused"

**Problem:** Ollama service not running

**Solution:**

```bash
ollama serve
```

### ❌ "Model not found"

**Problem:** Model not downloaded yet

**Solution:**

```bash
ollama pull llama3.2:7b
```

### ❌ Slow generation

**Problem:** Not using GPU / Insufficient RAM

**Solutions:**

1. Use smaller model (3B instead of 7B)
2. Close other apps to free RAM
3. Enable GPU acceleration (see Configuration)

### ❌ "Out of memory"

**Problem:** Model too large for available RAM

**Solution:**

```bash
# Switch to smaller model
ollama pull llama3.2:3b  # Only 2GB RAM needed
```

---

## 📈 Performance Optimization

### 1. Choose Right Model for Task

```typescript
// Quick dialogue = Use 3B model
const quickModel = 'llama3.2:3b';

// Detailed scenes = Use 7B model
const balancedModel = 'llama3.2:7b';

// Full screenplay = Use 14B model
const advancedModel = 'qwen2.5:14b';
```

### 2. Adjust Temperature

```typescript
// More creative (varied output)
temperature: 0.9;

// Balanced
temperature: 0.7;

// More focused (consistent output)
temperature: 0.3;
```

### 3. Limit Token Count

```typescript
// Short responses (faster)
maxTokens: 500;

// Medium responses
maxTokens: 1000;

// Long responses (full scenes)
maxTokens: 2000;
```

---

## 🔄 Model Management

### List Installed Models

```bash
ollama list
```

### Delete Model (Free Space)

```bash
ollama rm llama3.2:3b
```

### Update Model

```bash
ollama pull llama3.2:7b  # Downloads latest version
```

---

## 💰 Cost Comparison

### Per 100 Projects

| Provider             | Cost   | Speed         | Setup             |
| -------------------- | ------ | ------------- | ----------------- |
| **Gemini 1.5 Flash** | ฿35    | ⚡⚡⚡⚡ 2-5s | Easy (API key)    |
| **Ollama 3B**        | **฿0** | ⚡⚡⚡ 1-2s   | Medium (download) |
| **Ollama 7B**        | **฿0** | ⚡⚡ 3-5s     | Medium (download) |
| **Ollama 14B**       | **฿0** | ⚡ 8-12s      | Hard (GPU needed) |

### 💡 Best Strategy: Hybrid Mode

Use Ollama for drafts, Gemini for final polish:

- **Drafts (90%)**: Ollama = ฿0
- **Final polish (10%)**: Gemini = ฿3.50

**Total Cost: ฿3.50/100 projects (90% savings!)**

---

## 📚 Additional Resources

- **Ollama Website**: https://ollama.com
- **Model Library**: https://ollama.com/library
- **GitHub**: https://github.com/ollama/ollama
- **Discord Community**: https://discord.gg/ollama

---

## 🎯 Next Steps

1. ✅ Install Ollama
2. ✅ Download your first model (`ollama pull llama3.2:7b`)
3. ✅ Test generation (`ollama run llama3.2:7b "สวัสดี"`)
4. 🔄 Configure in Peace Script (`.env`)
5. 🚀 Start generating scripts for FREE!

---

**Last Updated:** January 2025
**Compatibility:** Ollama 0.1.x+
