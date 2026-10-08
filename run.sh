#!/usr/bin/env bash
cd "$(dirname "$0")"
[ -f .env ] || cp .env.example .env
[ -d .venv ] || python3 -m venv .venv || { echo "Need Python 3.9+ (python3 -m venv failed)"; exit 1; }
. .venv/bin/activate
pip install -q -r requirements.txt || exit 1
command -v tesseract >/dev/null || echo "NOTE: tesseract not found - scanned pages cannot be OCR'd. Install: brew install tesseract  |  sudo apt install tesseract-ocr"
echo "ParseFlow -> http://localhost:8000"
cd backend && python -m uvicorn app:app --host 127.0.0.1 --port 8000
