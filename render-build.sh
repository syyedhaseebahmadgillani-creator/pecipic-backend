#!/usr/bin/env bash
set -e

echo "===== Installing Python & OCR dependencies ====="
apt-get update -y
apt-get install -y python3 python3-pip tesseract-ocr libtesseract-dev libleptonica-dev pkg-config

echo "===== Installing Python packages ====="
pip3 install --no-cache-dir opencv-python-headless pytesseract python-docx pillow

echo "===== Installing Node packages ====="
npm install

echo "===== Build finished successfully ====="
