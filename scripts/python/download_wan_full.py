"""
Full WAN Model Repository Download
Downloads ALL 213 files from Kijai/WanVideo_comfy (~200+ GB)
Supports resume - will skip already downloaded files
"""

from huggingface_hub import snapshot_download
from pathlib import Path
import os

def download_full_wan_repo():
    """Download the complete WAN Video model repository"""
    
    repo_id = "Kijai/WanVideo_comfy"
    local_dir = Path("C:/Users/USER/ComfyUI/models/diffusion_models/wan-video-comfy")
    local_dir.mkdir(parents=True, exist_ok=True)
    
    print("=" * 80)
    print("WAN FULL REPOSITORY DOWNLOAD")
    print("=" * 80)
    print(f"\n📦 Repository: {repo_id}")
    print(f"📁 Destination: {local_dir}")
    print(f"📊 Total files: 213")
    print(f"💾 Estimated size: 200+ GB")
    print(f"⏱️  Estimated time: 3-6 hours (depends on internet speed)")
    print(f"\n🔄 Resume enabled: Already downloaded files will be skipped")
    print("\n⚠️  WARNING: This will take several hours and use significant disk space!")
    print("=" * 80)
    print("\nStarting download...\n")
    
    try:
        # Download entire repository with resume support
        snapshot_download(
            repo_id=repo_id,
            local_dir=str(local_dir),
            local_dir_use_symlinks=False,
            resume_download=True,  # Resume partial downloads
            max_workers=8,  # Parallel downloads
            repo_type="model",
        )
        
        print("\n" + "=" * 80)
        print("✅ DOWNLOAD COMPLETE!")
        print("=" * 80)
        
        # Calculate total size
        total_size_gb = 0
        file_count = 0
        for file in local_dir.rglob("*"):
            if file.is_file():
                total_size_gb += file.stat().st_size / (1024**3)
                file_count += 1
        
        print(f"\n📊 Statistics:")
        print(f"   Files downloaded: {file_count}")
        print(f"   Total size: {total_size_gb:.2f} GB")
        print("\n" + "=" * 80)
        print("🚀 NEXT STEPS:")
        print("=" * 80)
        print("1. Restart ComfyUI to load all models")
        print("2. Models will be available in all WAN nodes")
        print("3. Test with example workflows")
        print("=" * 80)
        
        return True
        
    except KeyboardInterrupt:
        print("\n\n" + "=" * 80)
        print("⚠️  DOWNLOAD INTERRUPTED")
        print("=" * 80)
        print("\nProgress has been saved!")
        print("Run this script again to resume from where it stopped.")
        print("Already downloaded files will NOT be re-downloaded.")
        return False
        
    except Exception as e:
        print(f"\n\n❌ ERROR: {e}")
        print("\nYou can run this script again to resume.")
        return False

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("WAN Video - Full Repository Download")
    print("=" * 80)
    
    success = download_full_wan_repo()
    
    if success:
        print("\n✅ Ready to generate WAN videos!")
        exit(0)
    else:
        print("\n⚠️  Download incomplete - you can resume anytime")
        exit(1)
