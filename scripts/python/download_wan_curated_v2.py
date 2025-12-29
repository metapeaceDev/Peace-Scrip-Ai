"""
WAN Video Models - Curated Download Script v2
Downloads the BEST and MOST COMPLETE set of models prioritized by importance
Based on ACTUAL file paths in Kijai/WanVideo_comfy repository
Optimized for RTX 5090 24GB VRAM
"""

from huggingface_hub import hf_hub_download
from pathlib import Path
import time
import sys

class WANModelDownloader:
    def __init__(self):
        self.repo_id = "Kijai/WanVideo_comfy"
        self.base_dir = Path("C:/Users/USER/ComfyUI/models/diffusion_models/wan-video-comfy")
        self.base_dir.mkdir(parents=True, exist_ok=True)
        
        # Curated model list - BEST selections for complete WAN experience
        # Based on ACTUAL files in the repository
        self.model_priorities = {
            "PRIORITY 1 - CORE (Required for ANY video generation)": [
                {
                    "name": "Text Encoder uMT5-XXL (bf16)",
                    "path": "umt5-xxl-enc-bf16.safetensors",
                    "size": "4.7 GB",
                    "why": "Required - Encodes text prompts into embeddings (WAN 2.1)"
                },
                {
                    "name": "CLIP Vision XLM-RoBERTa (fp16)",
                    "path": "open-clip-xlm-roberta-large-vit-huge-14_visual_fp16.safetensors",
                    "size": "3.9 GB",
                    "why": "Required - Image understanding for I2V and control"
                },
                {
                    "name": "VAE Decoder (WAN 2.1 bf16)",
                    "path": "Wan2_1_VAE_bf16.safetensors",
                    "size": "1.2 GB",
                    "why": "Required - Decodes latents to video frames (WAN 2.1)"
                },
            ],
            
            "PRIORITY 2 - TRANSFORMER MODELS (Choose by use case)": [
                {
                    "name": "WAN 2.1 T2V 1.3B fp8 (RECOMMENDED FOR TESTING) ⭐",
                    "path": "Wan2_1-T2V-1_3B_fp8_e4m3fn.safetensors",
                    "size": "1.5 GB",
                    "why": "Fast, low VRAM (8-10 GB), good quality - BEST for POC"
                },
                {
                    "name": "WAN 2.1 T2V 14B fp8 (High Quality, Efficient)",
                    "path": "Wan2_1-T2V-14B_fp8_e4m3fn.safetensors",
                    "size": "16 GB",
                    "why": "Best quality, fp8 quantized for efficiency (12-16 GB VRAM)"
                },
                {
                    "name": "WAN 2.1 HuMo 14B fp16 (Production Quality)",
                    "path": "HuMo/Wan2_1-HuMo-14B_fp16.safetensors",
                    "size": "34 GB",
                    "why": "Maximum quality, human motion specialist (20+ GB VRAM)"
                },
                {
                    "name": "Phantom-Wan 1.3B fp16 (Balanced)",
                    "path": "Phantom-Wan-1_3B_fp16.safetensors",
                    "size": "2.9 GB",
                    "why": "Good balance of speed and quality"
                },
            ],
            
            "PRIORITY 3 - IMAGE-TO-VIDEO (I2V Models)": [
                {
                    "name": "WAN 2.1 I2V 14B Bindweave fp16",
                    "path": "Bindweave/Wan2_1-I2V-14B-Bindweave_fp16.safetensors",
                    "size": "33 GB",
                    "why": "Convert images to videos with high fidelity"
                },
                {
                    "name": "WAN 2.1 I2V 14B 720P fp8 (Efficient)",
                    "path": "Wan2_1-I2V-14B-720P_fp8_e4m3fn.safetensors",
                    "size": "16 GB",
                    "why": "Image-to-video 720P, memory efficient"
                },
                {
                    "name": "WAN 2.2 I2V A14B HIGH bf16",
                    "path": "Wan2_2-I2V-A14B-HIGH_bf16.safetensors",
                    "size": "34 GB",
                    "why": "WAN 2.2 I2V - highest quality audio-visual"
                },
            ],
            
            "PRIORITY 4 - VIDEO EDITING & TRANSFORMATION": [
                {
                    "name": "ChronoEdit 14B (Video Editing) 🎬",
                    "path": "ChronoEdit/Wan2_1-I2V-14B_ChronoEdit_fp16.safetensors",
                    "size": "33 GB",
                    "why": "Edit and modify existing videos with temporal consistency"
                },
                {
                    "name": "Lynx Full IP Layers (Character Consistency) 👤",
                    "path": "Lynx/Wan2_1-T2V-14B-Lynx_full_ip_layers_fp16.safetensors",
                    "size": "4.2 GB",
                    "why": "Maintain character appearance across frames"
                },
                {
                    "name": "Video-as-Prompt Module (V2V Control)",
                    "path": "Video-as-prompt/Wan2_1-I2V-14B-VAP_module_bf16.safetensors",
                    "size": "5.3 GB",
                    "why": "Use video as control signal - video-to-video transformation"
                },
            ],
            
            "PRIORITY 5 - MOTION & CAMERA CONTROL": [
                {
                    "name": "VACE Module 14B (Camera Control) 🎥",
                    "path": "Wan2_1-VACE_module_14B_bf16.safetensors",
                    "size": "5.3 GB",
                    "why": "Video-Aligned Camera Editing - control camera movements"
                },
                {
                    "name": "UniLumos 1.3B (Light Control) 💡",
                    "path": "UniLumos/Wan2_1_UniLumos_1_3B_bf16.safetensors",
                    "size": "2.8 GB",
                    "why": "Control lighting and illumination in videos"
                },
                {
                    "name": "CamCloneMaster 1.3B (Camera Cloning)",
                    "path": "CamCloneMaster/Wan-I2V-1_3B-KwaiVGI_CamCloneMaster_Step9500_bf16.safetensors",
                    "size": "2.8 GB",
                    "why": "Clone camera movements from reference videos"
                },
            ],
            
            "PRIORITY 6 - LORA FINE-TUNING (Optional enhancements)": [
                {
                    "name": "LoRA Dance Styles (Stable Video Infinity)",
                    "path": "LoRAs/Stable-Video-Infinity/svi-dance_lora_rank_128_fp16.safetensors",
                    "size": "1.2 GB",
                    "why": "Dance motion styles and choreography"
                },
                {
                    "name": "LoRA Film Looks (Stable Video Infinity)",
                    "path": "LoRAs/Stable-Video-Infinity/svi-film_lora_rank_128_fp16.safetensors",
                    "size": "1.2 GB",
                    "why": "Cinematic film aesthetics and grading"
                },
                {
                    "name": "LoRA Film Transitions (Stable Video Infinity)",
                    "path": "LoRAs/Stable-Video-Infinity/svi-film-transitions_lora_rank_128_fp16.safetensors",
                    "size": "1.2 GB",
                    "why": "Smooth transitions and camera movements"
                },
            ],
            
            "PRIORITY 7 - AUDIO & MULTIMODAL (WAN 2.2)": [
                {
                    "name": "Ovi Audio Model (WAN 2.2 bf16) 🔊",
                    "path": "Ovi/Wan_2_2_Ovi_audio_model_bf16.safetensors",
                    "size": "12 GB",
                    "why": "Audio-driven video generation (lip sync, dance)"
                },
                {
                    "name": "Ovi Video Model (WAN 2.2 bf16)",
                    "path": "Ovi/Wan_2_2_Ovi_video_model_bf16.safetensors",
                    "size": "11 GB",
                    "why": "Multimodal video synthesis with audio"
                },
                {
                    "name": "MMAudio VAE 16k bf16",
                    "path": "Ovi/mmaudio_vae_16k_bf16.safetensors",
                    "size": "343 MB",
                    "why": "Audio VAE for multimodal generation"
                },
            ],
        }
        
        self.downloaded_files = []
        self.failed_files = []
        self.total_size_gb = 0
    
    def format_size(self, bytes_size):
        """Convert bytes to human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if bytes_size < 1024:
                return f"{bytes_size:.2f} {unit}"
            bytes_size /= 1024
        return f"{bytes_size:.2f} TB"
    
    def download_file(self, file_info):
        """Download a single file with progress tracking"""
        file_path = file_info["path"]
        local_path = self.base_dir / file_path
        
        # Check if already exists
        if local_path.exists():
            size_mb = local_path.stat().st_size / (1024 * 1024)
            print(f"   ⏭️  SKIP - Already exists ({size_mb:.2f} MB)")
            self.downloaded_files.append(file_path)
            return True
        
        try:
            print(f"   ⬇️  Downloading from HuggingFace...")
            start_time = time.time()
            
            # Ensure parent directory exists
            local_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Download with resume support
            hf_hub_download(
                repo_id=self.repo_id,
                filename=file_path,
                local_dir=str(self.base_dir),
                local_dir_use_symlinks=False,
                resume_download=True,
            )
            
            # Verify file exists
            if not local_path.exists():
                print(f"   ❌ ERROR - File not found after download")
                self.failed_files.append(file_info)
                return False
            
            # Calculate download stats
            elapsed = time.time() - start_time
            size_mb = local_path.stat().st_size / (1024 * 1024)
            speed_mbps = size_mb / elapsed if elapsed > 0 else 0
            
            print(f"   ✅ SUCCESS")
            print(f"      Size: {size_mb:.2f} MB")
            print(f"      Time: {elapsed:.1f}s ({speed_mbps:.2f} MB/s)")
            
            self.downloaded_files.append(file_path)
            self.total_size_gb += size_mb / 1024
            return True
            
        except KeyboardInterrupt:
            print(f"\n   ⚠️  Download interrupted by user")
            raise
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
            self.failed_files.append(file_info)
            return False
    
    def download_priority_group(self, priority_name, models, skip_confirmation=False):
        """Download a priority group of models"""
        print("\n" + "=" * 80)
        print(f"{priority_name}")
        print("=" * 80)
        
        total_size = sum([float(m['size'].split()[0]) for m in models])
        print(f"\n📊 Group Size: ~{total_size:.1f} GB")
        print(f"📦 Models: {len(models)}")
        
        if not skip_confirmation:
            print("\n" + "-" * 80)
            for i, model in enumerate(models, 1):
                print(f"{i}. {model['name']}")
                print(f"   📁 {model['path']}")
                print(f"   💾 {model['size']}")
                print(f"   ❓ {model['why']}")
                print()
            
            response = input(f"Download this group? (y/n/all): ").lower().strip()
            if response == 'n':
                print("⏭️  Skipped group")
                return "skip"
            elif response == 'all':
                skip_confirmation = True
        
        # Download each model
        success_count = 0
        for i, model in enumerate(models, 1):
            print(f"\n[{i}/{len(models)}] {model['name']}")
            print(f"   📁 {model['path']}")
            print(f"   ❓ {model['why']}")
            
            if self.download_file(model):
                success_count += 1
        
        print(f"\n✅ Downloaded {success_count}/{len(models)} models from this group")
        return "all" if skip_confirmation else "continue"
    
    def run(self):
        """Main download orchestration"""
        print("=" * 80)
        print("WAN VIDEO MODELS - CURATED DOWNLOAD V2")
        print("=" * 80)
        print(f"\n📦 Repository: {self.repo_id}")
        print(f"📁 Destination: {self.base_dir}")
        print("\n🎯 Strategy: Download BEST models by priority")
        print("🔄 Resume: Already downloaded files will be skipped")
        print("\n✅ UPDATED: Fixed file paths based on actual repository structure")
        print("\n" + "=" * 80)
        
        skip_all = False
        
        try:
            for priority_name, models in self.model_priorities.items():
                result = self.download_priority_group(
                    priority_name, 
                    models,
                    skip_confirmation=skip_all
                )
                
                if result == "skip":
                    continue
                elif result == "all":
                    skip_all = True
            
            # Final summary
            self.print_summary()
            return len(self.failed_files) == 0
            
        except KeyboardInterrupt:
            print("\n\n" + "=" * 80)
            print("⚠️  DOWNLOAD INTERRUPTED")
            print("=" * 80)
            print("\nProgress saved! Run this script again to resume.")
            self.print_summary()
            return False
    
    def print_summary(self):
        """Print final download summary"""
        print("\n" + "=" * 80)
        print("📊 DOWNLOAD SUMMARY")
        print("=" * 80)
        
        print(f"\n✅ Successfully downloaded: {len(self.downloaded_files)} files")
        print(f"💾 Total size: {self.total_size_gb:.2f} GB")
        
        if self.failed_files:
            print(f"\n❌ Failed downloads: {len(self.failed_files)} files")
            print("\nFailed files:")
            for f in self.failed_files:
                print(f"  - {f['name']}")
                print(f"    {f['path']}")
        
        print("\n" + "=" * 80)
        print("🚀 NEXT STEPS:")
        print("=" * 80)
        print("1. Restart ComfyUI to load the new models")
        print("2. Open ComfyUI at http://127.0.0.1:8189")
        print("3. Go to example_workflows folder")
        print("4. Load a WAN workflow and generate your first video!")
        print("\n💡 TIP: Start with Priority 1 + Priority 2 (1.3B fp8) for testing")
        print("    Then add Priority 3-7 models as needed")
        print("=" * 80)

def main():
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                  WAN VIDEO MODELS - CURATED DOWNLOADER V2                    ║
║                                                                              ║
║  Downloads the BEST models for complete WAN Video experience                ║
║  Prioritized by importance and use case                                     ║
║  Optimized for RTX 5090 24GB VRAM                                          ║
║                                                                              ║
║  ✅ FIXED: Updated with actual file paths from repository                   ║
║  ✅ INCLUDES: V2V (Video-to-Video) via Video-as-Prompt module               ║
║  ✅ INCLUDES: S2V (Speed Control) via VACE camera module                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    print("\n📋 DOWNLOAD PRIORITIES:")
    print("   1. CORE - Text encoder, CLIP, VAE (~10 GB)")
    print("   2. TRANSFORMERS - Choose based on VRAM/speed (1.5-34 GB)")
    print("   3. IMAGE-TO-VIDEO - I2V models (16-34 GB each)")
    print("   4. VIDEO EDITING - ChronoEdit, Lynx, VAP (4-33 GB)")
    print("   5. MOTION & CAMERA - VACE, UniLumos, CamClone (~3-5 GB each)")
    print("   6. LORA - Fine-tuning and style control (~1 GB each)")
    print("   7. AUDIO - Multimodal generation (WAN 2.2, ~23 GB)")
    
    print("\n💡 RECOMMENDED COMBINATIONS:")
    print("   🚀 Quick Start: Priority 1 + 2 (1.3B fp8) = ~12 GB, 15 min")
    print("      → Test T2V generation quickly")
    print("")
    print("   🎬 Production: Priority 1 + 2 (14B fp8) + 3 (I2V 720P) = ~42 GB, 50 min")
    print("      → High quality T2V + I2V capability")
    print("")
    print("   🎨 Video Editor: Priority 1-5 = ~90 GB, 2 hours")
    print("      → Complete editing suite (V2V, camera, motion)")
    print("")
    print("   🎵 Complete: All priorities = ~135 GB, 3-4 hours")
    print("      → Full WAN ecosystem with audio")
    
    response = input("\n⚡ Ready to start? (y/n): ").lower().strip()
    if response != 'y':
        print("👋 Cancelled by user")
        return
    
    downloader = WANModelDownloader()
    success = downloader.run()
    
    if success:
        print("\n🎉 All downloads completed successfully!")
        sys.exit(0)
    else:
        print("\n⚠️  Some downloads incomplete - you can resume anytime")
        sys.exit(1)

if __name__ == "__main__":
    main()
