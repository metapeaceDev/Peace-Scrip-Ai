"""
Selective WAN Model Download Script
Download only the essential models needed for POC Day 1 testing
Total size: ~10-15 GB instead of 200+ GB
"""

from huggingface_hub import hf_hub_download
import os
from pathlib import Path

def download_essential_models():
    """Download only the minimum models needed for first video generation test"""
    
    repo_id = "Kijai/WanVideo_comfy"
    local_dir = Path("C:/Users/USER/ComfyUI/models/diffusion_models/wan-video-comfy")
    local_dir.mkdir(parents=True, exist_ok=True)
    
    # ESSENTIAL FILES FOR TESTING (prioritized by README recommendations)
    essential_files = {
        # 1. Text Encoder (required) - ~2.5 GB
        "text_encoder": [
            "fp8_scaled/t5xxl_fp8_e4m3fn_scaled.safetensors",
        ],
        
        # 2. CLIP Vision (required) - ~3.7 GB
        "clip_vision": [
            "clip_vision/sigclip_vision_patch14_384_fp16.safetensors",
        ],
        
        # 3. Transformer Model - LIGHTWEIGHT 1.3B VERSION (recommended for testing)
        "transformer_1.3b": [
            "fp8_scaled/Wan2_1-T2V-1-3B-KwaiVGI_Step_8000_fp8_scaled.safetensors",  # ~1.5 GB
        ],
        
        # 4. VAE (required for video encoding/decoding)
        "vae": [
            "vae/wan2_1_vae_c_decoder_bf16.safetensors",  # ~470 MB
            "vae/wan2_1_vae_t_decoder_bf16.safetensors",  # ~300 MB
        ],
        
        # 5. Configuration Files
        "configs": [
            "configs/inference_1_3B_T2V.yaml",
            "configs/inference_14B_T2V.yaml",
        ],
    }
    
    print("=" * 80)
    print("WAN POC - Selective Model Download")
    print("=" * 80)
    print(f"\n📁 Destination: {local_dir}")
    print(f"🎯 Strategy: Download ONLY essential models for testing")
    print(f"📊 Estimated size: ~10-15 GB (vs 200+ GB full repo)")
    print("\n" + "=" * 80)
    
    downloaded_count = 0
    failed_files = []
    
    for category, files in essential_files.items():
        print(f"\n{'='*80}")
        print(f"📦 Category: {category.upper()}")
        print(f"{'='*80}")
        
        for file_path in files:
            try:
                print(f"\n⬇️  Downloading: {file_path}")
                print(f"   From: {repo_id}")
                
                # Download to correct subdirectory
                local_path = local_dir / file_path
                local_path.parent.mkdir(parents=True, exist_ok=True)
                
                hf_hub_download(
                    repo_id=repo_id,
                    filename=file_path,
                    local_dir=str(local_dir),
                    local_dir_use_symlinks=False,
                    resume_download=True,
                )
                
                # Verify file exists
                if local_path.exists():
                    size_mb = local_path.stat().st_size / (1024 * 1024)
                    print(f"   ✅ SUCCESS - Size: {size_mb:.2f} MB")
                    downloaded_count += 1
                else:
                    print(f"   ⚠️  WARNING: File not found after download")
                    failed_files.append(file_path)
                    
            except Exception as e:
                print(f"   ❌ ERROR: {str(e)}")
                failed_files.append(file_path)
    
    # Final summary
    print("\n" + "=" * 80)
    print("📊 DOWNLOAD SUMMARY")
    print("=" * 80)
    print(f"✅ Successfully downloaded: {downloaded_count} files")
    
    if failed_files:
        print(f"❌ Failed downloads: {len(failed_files)} files")
        print("\nFailed files:")
        for f in failed_files:
            print(f"  - {f}")
    else:
        print("🎉 All essential models downloaded successfully!")
        
    # Calculate total size
    total_size_mb = 0
    for file in local_dir.rglob("*.safetensors"):
        total_size_mb += file.stat().st_size / (1024 * 1024)
    
    print(f"\n💾 Total downloaded: {total_size_mb:.2f} MB ({total_size_mb/1024:.2f} GB)")
    print("\n" + "=" * 80)
    print("🚀 NEXT STEPS:")
    print("=" * 80)
    print("1. Restart ComfyUI to load the new models")
    print("2. Open example workflow: wanvideo_1_3B_control_lora_example_01.json")
    print("3. Generate your first WAN video!")
    print("=" * 80)
    
    return downloaded_count > 0

if __name__ == "__main__":
    try:
        success = download_essential_models()
        if success:
            print("\n✅ Download complete! Ready for WAN POC testing.")
            exit(0)
        else:
            print("\n❌ Download failed. Please check errors above.")
            exit(1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Download interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        exit(1)
