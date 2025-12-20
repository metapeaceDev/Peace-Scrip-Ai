FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    gcc \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY server.py ./
COPY *.py ./
COPY entrypoint.sh ./

# Create directories
RUN mkdir -p uploads outputs models

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Expose port (Cloud Run uses PORT env variable, default to 8080)
EXPOSE 8080
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Run with gunicorn for production, bind to PORT from environment
CMD ["sh", "entrypoint.sh"]
