FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Clone ComfyUI
WORKDIR /app
RUN git clone https://github.com/comfyanonymous/ComfyUI.git
WORKDIR /app/ComfyUI

# Install Python dependencies
RUN pip install --no-cache-dir \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 \
    xformers \
    opencv-python \
    pillow \
    safetensors \
    transformers \
    diffusers \
    accelerate

# Install ComfyUI requirements
RUN pip install -r requirements.txt

# Create model directories
WORKDIR /app/ComfyUI/models
RUN mkdir -p checkpoints vae controlnet upscale_models clip loras

# Download FLUX.1-schnell (Main model)
RUN wget -q --show-progress \
    https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors \
    -O checkpoints/flux1-schnell.safetensors

# Download VAE
RUN wget -q --show-progress \
    https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/ae.safetensors \
    -O vae/flux_vae.safetensors

# Download Text encoders
RUN wget -q --show-progress \
    https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors \
    -O clip/clip_l.safetensors

RUN wget -q --show-progress \
    https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors \
    -O clip/t5xxl_fp8_e4m3fn.safetensors

# Download ControlNet for pose control
RUN wget -q --show-progress \
    https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_openpose.pth \
    -O controlnet/control_openpose.pth

# Expose ComfyUI port
EXPOSE 8188

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8188/system_stats || exit 1

# Start ComfyUI
WORKDIR /app/ComfyUI
CMD ["python", "main.py", "--listen", "0.0.0.0", "--port", "8188", "--preview-method", "auto"]
