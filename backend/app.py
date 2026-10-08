import os, sys, json, uuid, shutil, tempfile, threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
sys.path.insert(0, str(Path(__file__).parent))
ROOT = Path(__file__).resolve().parent.parent
try:
    for line in (ROOT/".env").read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            if v.strip(): os.environ.setdefault(k.strip(), v.strip())
except FileNotFoundError: pass
from processing import pipeline, ocr, vision

DATA = ROOT/"data"; DATA.mkdir(exist_ok=True)
MAX_BYTES = 50*1024*1024
JOBS = {}; POOL = ThreadPoolExecutor(2)
app = FastAPI(title="ParseFlow")

def err(code, title, msg, status=400): return JSONResponse(dict(error=dict(code=code, title=title, message=msg)), status_code=status)

@app.get("/api/health")
def health(): return dict(ok=True, ocr=ocr.available(), vision=vision.info())

@app.post("/api/process")
async def process(file: UploadFile = File(...)):
    name = os.path.basename(file.filename or "upload")
    doc_id = uuid.uuid4().hex[:12]; d = DATA/doc_id; d.mkdir(); src = d/("source_"+doc_id+"_"+name.replace(" ", "_"))
    size = 0
    with open(src, "wb") as f:
        while chunk := await file.read(1024*1024):
            size += len(chunk)
            if size > MAX_BYTES: f.close(); shutil.rmtree(d, True); return err("PF-206", "File Too Large", "Maximum size is 50 MB.", 413)
            f.write(chunk)
    try: pages = pipeline.page_count(str(src), name)
    except pipeline.PFError as e: shutil.rmtree(d, True); return JSONResponse(dict(error=e.dict()), status_code=400)
    except Exception: shutil.rmtree(d, True); return err("PF-201", "Corrupt Document", "The file could not be read.")
    prog = pipeline.Progress(); JOBS[doc_id] = dict(prog=prog, doc=None)
    def run():
        try: JOBS[doc_id]["doc"] = pipeline.process(str(src), name, doc_id, str(d), prog); prog.status = "complete"
        except pipeline.PFError as e: prog.status, prog.error = "failed", e.dict()
        except Exception as e: prog.status, prog.error = "failed", dict(code="PF-500", title="Processing Error", message=f"Unexpected failure ({type(e).__name__}); the server is still running.")
    POOL.submit(run)
    return dict(document_id=doc_id, filename=name, size=size, type=name.rsplit(".", 1)[-1].upper(), pages=pages)

@app.get("/api/status/{doc_id}")
def status(doc_id: str):
    j = JOBS.get(doc_id)
    if not j: return err("PF-404", "Unknown Document", "No such processing job.", 404)
    return dict(status=j["prog"].status, stages=j["prog"].stages, error=j["prog"].error)

@app.get("/api/document/{doc_id}")
def document(doc_id: str):
    p = DATA/doc_id/"document.json"
    if not doc_id.isalnum() or not p.exists(): return err("PF-404", "Not Ready", "Document not available.", 404)
    return FileResponse(p, media_type="application/json")

@app.get("/api/page/{doc_id}/{n}.png")
def page_png(doc_id: str, n: int):
    p = DATA/doc_id/f"page_{n}.png"
    if not doc_id.isalnum() or not p.exists(): return err("PF-404", "Not Found", "Page image not found.", 404)
    return FileResponse(p, media_type="image/png")

app.mount("/", StaticFiles(directory=str(ROOT/"frontend"), html=True), name="ui")
