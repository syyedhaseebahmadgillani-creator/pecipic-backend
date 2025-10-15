#!/usr/bin/env bash
# ==== Render build script ====

set -e

echo "🚀 Installing OCR dependencies..."
apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip tesseract-ocr libtesseract-dev libleptonica-dev pkg-config

pip3 install --no-cache-dir pytesseract opencv-python-headless python-docx pillow

echo "📦 Installing Node dependencies..."
npm install

echo "✅ Build completed successfully."
