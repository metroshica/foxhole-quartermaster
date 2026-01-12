# Foxhole Stockpiles Scanner Service
# Based on https://github.com/xurxogr/foxhole-stockpiles
#
# This Dockerfile sets up the foxhole-stockpiles FastAPI server
# for scanning Foxhole stockpile screenshots.

FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install foxhole-stockpiles from GitHub with API dependencies
# Using pip install from git to get latest version
RUN pip install --no-cache-dir \
    git+https://github.com/xurxogr/foxhole-stockpiles.git \
    fastapi \
    uvicorn[standard] \
    python-multipart \
    psutil

# Create data directory for template database
RUN mkdir -p /app/data

# Download the template database from releases (v0.3.1 uses .h5 format)
RUN curl -L -o /app/data/foxhole_templates.h5 \
    "https://github.com/xurxogr/foxhole-stockpiles/releases/download/v0.3.1/foxhole_templates.h5"

# Set environment variable for database path
ENV FS_SCANNER__DATABASE_PATH=/app/data/foxhole_templates.h5

# Find Tesseract data directory and add custom trained data
RUN TESSDATA_DIR=$(find /usr -name "tessdata" -type d 2>/dev/null | head -1) && \
    echo "Found tessdata at: $TESSDATA_DIR" && \
    curl -L -o "$TESSDATA_DIR/renner_numbers.traineddata" \
    "https://github.com/xurxogr/foxhole-stockpiles/raw/main/tessdata/renner_numbers.traineddata"

# Set Tesseract data paths - both system env and foxhole-stockpiles config
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata
ENV FS_SCANNER__TESSDATA_PATH=/usr/share/tesseract-ocr/5/tessdata

# Expose the API port
EXPOSE 8000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the FastAPI server
CMD ["python", "-m", "uvicorn", "foxhole_stockpiles.api.server:app", "--host", "0.0.0.0", "--port", "8000"]
