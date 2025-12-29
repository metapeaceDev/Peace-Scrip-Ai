"""Check actual files in WAN Video repository"""
from huggingface_hub import list_repo_files

print("Fetching file list from Kijai/WanVideo_comfy...")
files = list_repo_files('Kijai/WanVideo_comfy')

print(f"\nTotal files: {len(files)}")
print("\n" + "="*80)
print("ALL FILES:")
print("="*80)

for f in sorted(files):
    print(f)
