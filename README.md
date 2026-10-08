# ParseFlow — Evidence-preserving document intelligence
Team DEADLOCK · DataQuest 3.0 · DQCL ParseAnything

## Run on your computer (needs Python 3.9+)
Mac / Linux:  `bash run.sh`        Windows:  double-click `run.bat`
Then open **http://localhost:8000**

Optional but recommended: install Tesseract (OCR for scanned pages)
 - Mac `brew install tesseract` · Ubuntu `sudo apt install tesseract-ocr` · Windows: UB-Mannheim installer, add to PATH

## Handwriting, hand-drawn trees, scanned tables
These need a vision model. Put a key in `.env` (created on first run):
    VISION_PROVIDER=anthropic   and   VISION_API_KEY=sk-ant-...      (or provider=gemini + Gemini key)
Restart. The top-right badge shows "Vision <model>". Without a key everything else works and
those regions are preserved + flagged, never guessed.

## Layout
    backend/app.py                      FastAPI: /api/process, /api/status, /api/document, /api/page, /api/health
    backend/processing/                 pdf_parser · ocr · vision · verifier · pipeline · schema
    frontend/index.html                 single-file UI served by the backend
