@echo off
cd /d "%~dp0"
if not exist .env copy .env.example .env >nul
if not exist .venv python -m venv .venv
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt || exit /b 1
where tesseract >nul 2>nul || echo NOTE: tesseract not found - scanned pages cannot be OCR'd. Install from https://github.com/UB-Mannheim/tesseract/wiki and add it to PATH.
echo ParseFlow -^> http://localhost:8000
cd backend
start "" http://localhost:8000
python -m uvicorn app:app --host 127.0.0.1 --port 8000
