#!/usr/bin/env python3
"""
Download WAN 1.3B Model for ComfyUI
สำหรับ WAN POC Day 2 - Phase 6
"""

from huggingface_hub import snapshot_download
import os
import sys

def download_wan_model():
    """Download WAN Video 1.3B model from Kijai (~2.6 GB)"""
    
    # Correct model repository from Kijai (not Wanx)
    model_id = "Kijai/WanVideo_comfy"
    local_dir = r"C:\Users\USER\ComfyUI\models\diffusion_models\wan-video-comfy"
    
    print(f"\n{'='*60}")
    print(f"🚀 Downloading WAN Video Model (from Kijai)")
    print(f"{'='*60}")
    print(f"Model: {model_id}")
    print(f"Size: ~several GB (multiple files)")
    print(f"Destination: {local_dir}")
    print(f"📝 Note: Downloading fp8_scaled version (recommended)")
    print(f"{'='*60}\n")
    
    try:
        # Create directory if not exists
        os.makedirs(local_dir, exist_ok=True)
        
        print("⏳ Starting download... (this may take 5-15 minutes)")
        print("💡 Tip: You can monitor progress in the terminal\n")
        
        # Download with progress
        snapshot_download(
            repo_id=model_id,
            local_dir=local_dir,
            local_dir_use_symlinks=False,
            resume_download=True
        )
        
        print(f"\n{'='*60}")
        print("✅ Download Complete!")
        print(f"{'='*60}")
        print(f"Model saved to: {local_dir}")
        
        # List downloaded files
        print("\n📁 Downloaded files:")
        for root, dirs, files in os.walk(local_dir):
            for file in files:
                filepath = os.path.join(root, file)
                size_mb = os.path.getsize(filepath) / (1024 * 1024)
                print(f"  - {file} ({size_mb:.1f} MB)")
        
        print(f"\n{'='*60}")
        print("🎯 Next Steps:")
        print("  1. Restart ComfyUI if running")
        print("  2. Load example workflow: wanvideo_1_3B_*.json")
        print("  3. Generate first test video!")
        print(f"{'='*60}\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error downloading model: {e}")
        print(f"\n💡 Troubleshooting:")
        print("  - Check internet connection")
        print("  - Verify disk space (~3 GB free)")
        print("  - Try again - download will resume")
        return False

if __name__ == "__main__":
    success = download_wan_model()
    sys.exit(0 if success else 1)
