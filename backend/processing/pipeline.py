"""Understand -> Route -> Extract -> Assemble -> Verify -> Trace. Every processor emits Digital Twin blocks."""
import os, json, re, time
import numpy as np, pymupdf
from PIL import Image
from scipy import ndimage as ndi
from . import pdf_parser, ocr, vision, verifier
from .schema import make_block, verdict, area, overlap_frac

STAGES = ["DETECT", "ANALYZE", "ROUTE", "EXTRACT", "ASSEMBLE", "VERIFY", "OUTPUT"]
Z = 2.0
VIS_EXT = {"handwritten_text": "vision_handwriting", "handwritten_code": "vision_handwriting", "paragraph": "vision_handwriting", "heading": "vision_handwriting",
           "list": "vision_handwriting", "equation": "math_vision", "diagram": "vision_diagram", "figure": "vision_diagram", "chart": "vision_chart", "unknown": "vision_diagram", "table": "vision_table"}
PREFIX = {"table": "tbl", "chart": "chart", "diagram": "diag", "equation": "eq", "handwritten_text": "hand", "handwritten_code": "code", "figure": "fig", "unknown": "unk", "caption": "cap"}

class PFError(Exception):
    def __init__(self, code, title, message): super().__init__(message); self.code, self.title, self.message = code, title, message
    def dict(self): return dict(code=self.code, title=self.title, message=self.message)

class Progress:
    def __init__(self): self.stages = [dict(name=s, state="pending", detail="") for s in STAGES]; self.status = "running"; self.error = None
    def set(self, name, state, detail=""):
        for s in self.stages:
            if s["name"] == name: s["state"], s["detail"] = state, detail or s["detail"]

def open_source(path, filename):
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if ext not in ("pdf", "png", "jpg", "jpeg"): raise PFError("PF-204", "Unsupported Document", "ParseFlow could not process this file type. Supported: PDF, PNG, JPG/JPEG.")
    if os.path.getsize(path) == 0: raise PFError("PF-205", "Empty Document", "The file contains no data.")
    if ext == "pdf":
        try: d = pymupdf.open(path)
        except Exception: raise PFError("PF-201", "Corrupt Document", "The PDF could not be opened. It may be damaged or not a real PDF.")
        if d.needs_pass: raise PFError("PF-202", "Encrypted Document", "The PDF is password protected.")
        if d.page_count == 0: raise PFError("PF-205", "Empty Document", "The PDF has no pages.")
        return "pdf", d
    try:
        im = Image.open(path); im.load(); im = im.convert("RGB")
    except Exception: raise PFError("PF-201", "Corrupt Document", "The image could not be decoded.")
    if max(im.size) > 2400: im.thumbnail((2400, 2400))
    return "image", im

def page_count(path, filename):
    kind, src = open_source(path, filename)
    return src.page_count if kind == "pdf" else 1

def detect_ink_regions(img, ocr_boxes):
    """Regions with ink that OCR could not explain (handwriting, diagrams, charts). Ruled lines are removed first."""
    g = np.array(img.convert("L")); thr = min(170, np.median(g) * 0.65)
    mask = g < thr
    mask &= ~ndi.binary_dilation(ndi.binary_opening(mask, structure=np.ones((1, 90))) | ndi.binary_opening(mask, structure=np.ones((90, 1))), iterations=2)
    for (x0, y0, x1, y1) in ocr_boxes: mask[max(0, y0-3):y1+3, max(0, x0-3):x1+3] = False
    f = 4; h, w = (mask.shape[0]//f)*f, (mask.shape[1]//f)*f
    coarse = mask[:h, :w].reshape(h//f, f, w//f, f).max(axis=(1, 3))
    lab, n = ndi.label(ndi.binary_dilation(coarse, structure=np.ones((3, 3)), iterations=10))
    out = []
    for sl in ndi.find_objects(lab):
        y0, y1, x0, x1 = sl[0].start*f, sl[0].stop*f, sl[1].start*f, sl[1].stop*f
        ink = int(mask[y0:y1, x0:x1].sum()); bw, bh = x1-x0, y1-y0
        if ink < 400 or bw < 24 or bh < 24 or bw*bh > 0.9*img.size[0]*img.size[1]: continue
        out.append((max(0, x0-8), max(0, y0-8), min(img.size[0], x1+8), min(img.size[1], y1+8)))
    return out

def vision_blocks(crop_img, bbox, hint, state, tag):
    """Specialised extraction for one visual region. Falls back to a flagged, evidence-preserving block."""
    cx0, cy0, cx1, cy1 = bbox; cw, ch = cx1-cx0, cy1-cy0
    err = None
    if state["vision_left"] > 0 and vision.available():
        state["vision_left"] -= 1; state["vision_used"] += 1
        items, err = vision.analyze_crop(crop_img)
        blocks = []
        for it in items:
            t = it.get("type") if it.get("type") in vision.VALID else "unknown"
            rows = None
            if t == "table":
                rr = it.get("rows")
                rows = [[str(c or "").strip() for c in r] for r in rr if isinstance(r, list)] if isinstance(rr, list) else None
                rows = [r for r in (rows or []) if any(r)]
                if len(rows) < 2 or max((len(r) for r in rows), default=0) < 2: t, rows = "unknown", None
            content = it.get("content") or (it.get("description") if t in ("diagram", "chart", "figure", "unknown") else None)
            if t == "table": content = f"Table with {len(rows)} rows"
            try: conf = max(0.0, min(0.95, float(it.get("confidence", 0.5))))
            except Exception: conf = 0.5
            warns, bb = [], bbox
            raw = it.get("bbox")
            if isinstance(raw, list) and len(raw) == 4 and all(isinstance(v, (int, float)) and 0 <= v <= 1000 for v in raw) and raw[2]-raw[0] > 8 and raw[3]-raw[1] > 8:
                bb = (cx0+raw[0]/1000*cw, cy0+raw[1]/1000*ch, cx0+raw[2]/1000*cw, cy0+raw[3]/1000*ch)
            elif len(items) > 1: warns.append("Model gave no valid sub-region box; using the whole analysed region.")
            if not content: conf = min(conf, 0.45); warns.append("Low confidence — review source. Content withheld rather than guessed.")
            ch_ = it.get("chart") if isinstance(it.get("chart"), dict) else {}
            data = ch_.get("data") if isinstance(ch_.get("data"), list) and ch_.get("data") else None
            b = make_block("", t, 0, bb, conf, "model (self-reported)", VIS_EXT[t], content, latex=it.get("latex") if t == "equation" else None,
                           elements=it.get("elements") or None, relationships=[str(r) for r in it.get("relationships") or []] if t == "diagram" else None,
                           chart_type=ch_.get("chart_type") if t == "chart" else None, title=ch_.get("title") if t == "chart" else None,
                           data=data if t == "chart" else None, rows=rows, axes=ch_.get("axes") if t == "chart" else None, legend=ch_.get("legend") if t == "chart" else None)
            if t == "chart" and not data: b["warnings"].append("Chart values not extracted — trend described only; no values invented.")
            b["warnings"] += warns; blocks.append(b)
        if blocks: return blocks
        err = err or "vision model returned no regions"
    why = f"Vision extraction failed ({err}) — region preserved, flagged." if err else "Visual analysis unavailable: no VISION_API_KEY configured — region preserved, flagged."
    oc, ot = ocr.quick_conf(crop_img) if ocr.available() else (0, "")
    b = make_block("", "figure" if hint == "figure" else "unknown", 0, bbox, 0.3, "heuristic (estimated)", "fallback", None,
                   ocr_text=ot if oc >= 0.6 and len(ot) >= 3 else None, preserved_image=True)
    b["warnings"] += [why] + (["Legible printed labels found by OCR (see ocr_text); not treated as the region's meaning."] if b.get("ocr_text") else [])
    return [b]

def process(path, filename, doc_id, out_dir, prog):
    state = dict(vision_left=int(os.getenv("MAX_VISION_REGIONS", "12")), vision_used=0)
    max_pages = int(os.getenv("MAX_PAGES", "60")); warnings = []
    # DETECT
    prog.set("DETECT", "running"); kind, src = open_source(path, filename)
    n_pages = src.page_count if kind == "pdf" else 1
    if n_pages > max_pages: warnings.append(f"Document has {n_pages} pages; only the first {max_pages} were processed."); n_pages = max_pages
    os.makedirs(out_dir, exist_ok=True); imgs, pdfp = [], []
    for i in range(n_pages):
        if kind == "pdf":
            p = src[i]; pix = p.get_pixmap(matrix=pymupdf.Matrix(Z, Z), alpha=False); im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples); pdfp.append(p)
        else: im = src; pdfp.append(None)
        im.save(os.path.join(out_dir, f"page_{i+1}.png")); imgs.append(im)
    prog.set("DETECT", "done", f"{kind.upper()} · {n_pages} page{'s' if n_pages > 1 else ''}")
    # ANALYZE
    prog.set("ANALYZE", "running"); pages, plan, ocr_ok = [], [], bool(ocr.available())
    for i in range(n_pages):
        n, im, p = i+1, imgs[i], pdfp[i]; W, H = im.size; entries, flags = [], {}
        try:
            a = pdf_parser.analyze(p) if p else dict(chars=0, image_coverage=1.0, has_text_layer=False, scanned=True)
            if not a["scanned"]:
                tb = pdf_parser.tables(p); tr = [t["bbox"] for t in tb]
                figs = pdf_parser.figures(p, tr); items, _ = pdf_parser.text_blocks(p, tr)
                items = [it for it in items if not any(overlap_frac(it["bbox"], f) > 0.6 for f in figs)]; items = pdf_parser.absorb_labels(items, figs)
                sc = lambda r: tuple(v*Z for v in r)
                for it in items: entries.append(dict(page=n, kind="text", bbox=sc(it["bbox"]), data=it, route="digital_text_parser"))
                for t in tb: entries.append(dict(page=n, kind="table", bbox=sc(t["bbox"]), data=t, route="table_engine"))
                for f in figs: entries.append(dict(page=n, kind="figure", bbox=sc(f), data=None, route=None))
                flags = dict(text_layer=True, scanned=False, tables=len(tb), figures=len(figs))
                label = "mixed" if (figs or tb) else "digital"
            else:
                flags = dict(text_layer=False, scanned=True, tables=0, figures=0)
                if ocr_ok:
                    ws = ocr.words(im); paras = [q for q in ocr.paragraphs(ws, 0.6) if len(re.sub(r"\W", "", q["text"])) >= 3]
                    med = float(np.median([q["height"] for q in paras])) if paras else 0
                    for q in paras: entries.append(dict(page=n, kind="ocr", bbox=q["bbox"], data=dict(q, heading=med and q["height"] > 1.35*med and q["text"].count("\n") < 2), route="ocr"))
                    boxes = [tuple(int(v) for v in e["bbox"]) for e in entries]
                else: boxes = []; warnings.append(f"Page {n}: OCR engine unavailable; scanned content cannot be read.")
                for r in detect_ink_regions(im, boxes): entries.append(dict(page=n, kind="ink", bbox=r, data=None, route=None))
                flags["visual_regions"] = sum(1 for e in entries if e["kind"] == "ink")
                label = "scanned" + (" + visual/handwriting" if flags["visual_regions"] else "")
            pages.append(dict(n=n, kind=label, width=W, height=H, flags=flags, **{k: a[k] for k in ("chars", "image_coverage")}))
        except Exception as e:
            pages.append(dict(n=n, kind="error", width=W, height=H, flags={})); warnings.append(f"Page {n}: analysis failed ({type(e).__name__}); page image preserved.")
        plan += entries
    prog.set("ANALYZE", "done", f"{len(plan)} regions identified")
    # ROUTE
    prog.set("ROUTE", "running")
    for e in plan:
        if e["route"] is None: e["route"] = "vision" if (vision.available() and state["vision_left"] > 0) else "fallback"
    cnt = {r: sum(1 for e in plan if e["route"] == r) for r in ("digital_text_parser", "table_engine", "ocr", "vision", "fallback")}
    prog.set("ROUTE", "done", f"local {cnt['digital_text_parser']+cnt['table_engine']} · ocr {cnt['ocr']} · vision {cnt['vision']} · flagged {cnt['fallback']}")
    # EXTRACT
    prog.set("EXTRACT", "running"); per_page = {}
    for e in plan:
        n, im = e["page"], imgs[e["page"]-1]; bb = tuple(max(0, v) for v in e["bbox"])
        try:
            if e["kind"] == "text":
                d = e["data"]; bl = [make_block("", d["type"], n, bb, 0.99, "native text layer", "digital_text_parser", d["content"])]
            elif e["kind"] == "table":
                d = e["data"]; bl = [make_block("", "table", n, bb, min(0.95, 0.6+0.35*d["filled"]), "heuristic (estimated)", "table_engine", f"Table with {len(d['rows'])} rows", rows=d["rows"])]
            elif e["kind"] == "ocr":
                d = e["data"]; bl = [make_block("", "heading" if d["heading"] else "paragraph", n, bb, d["conf"], "ocr", "ocr", d["text"].replace("\n", " " if d["heading"] else "\n"))]
            else:
                crop = im.crop(tuple(int(v) for v in bb)); bl = vision_blocks(crop, bb, "figure" if e["kind"] == "figure" else "unknown", state, e["kind"])
                if e["kind"] == "figure" and e["data"] is None and not state["vision_used"] and bl and bl[0]["extractor"] == "fallback": pass
            for b in bl: b["page"] = n; per_page.setdefault(n, []).append(b)
        except Exception as ex:
            b = make_block("", "unknown", n, bb, 0.0, "heuristic (estimated)", "fallback", None, preserved_image=True)
            b["warnings"].append(f"Extractor error ({type(ex).__name__}) — region preserved, flagged."); per_page.setdefault(n, []).append(b)
    prog.set("EXTRACT", "done", f"{sum(len(v) for v in per_page.values())} blocks")
    # ASSEMBLE
    prog.set("ASSEMBLE", "running"); blocks = []
    for n in range(1, n_pages+1):
        bs = per_page.get(n, []); W = imgs[n-1].size[0]
        ordered, cols = pdf_parser.reading_order([dict(bbox=b["bbox"], b=b) for b in bs], W)
        if cols: pages[n-1]["flags"]["multi_column"] = True
        ctr = {}
        for k, it in enumerate(ordered, 1):
            b = it["b"]; b["reading_order"] = k
            pre = PREFIX.get(b["type"]) or ("ocr" if b["extractor"] == "ocr" else "txt")
            if b["type"] in ("heading", "paragraph", "list") and b["extractor"] != "ocr": pre = "txt" if b["extractor"] == "digital_text_parser" else "hand"
            ctr[pre] = ctr.get(pre, 0)+1; b["block_id"] = f"{pre}_{n}_{ctr[pre]:02d}"; blocks.append(b)
        targets = [b for b in bs if b["type"] in ("table", "chart", "diagram", "figure")]
        for c in [b for b in bs if b["type"] == "caption"]:
            near = sorted(targets, key=lambda t: min(abs(t["bbox"][1]-c["bbox"][3]), abs(c["bbox"][1]-t["bbox"][3])))
            if near and min(abs(near[0]["bbox"][1]-c["bbox"][3]), abs(c["bbox"][1]-near[0]["bbox"][3])) < 160:
                c["relationships"].append("caption_of:"+near[0]["block_id"]); near[0]["relationships"].append("caption:"+c["block_id"])
    prog.set("ASSEMBLE", "done", f"{len(blocks)} blocks ordered")
    # VERIFY
    prog.set("VERIFY", "running")
    for n in range(1, n_pages+1):
        p = pdfp[n-1]; txt = p.get_text("text") if p else ""
        info = dict(width=imgs[n-1].size[0], height=imgs[n-1].size[1], norm_text=re.sub(r"[^a-z0-9]+", "", txt.lower()))
        for b in [x for x in blocks if x["page"] == n]:
            if b["extractor"] == "table_engine": info_t = info
            verifier.verify(b, info, lambda bb, im=imgs[n-1]: im.crop(tuple(int(v) for v in bb)))
    flagged = sum(1 for b in blocks if b["verification"] != "verified")
    prog.set("VERIFY", "done", f"{len(blocks)-flagged} verified · {flagged} flagged")
    # OUTPUT
    prog.set("OUTPUT", "running")
    if not vision.available() and any(b["extractor"] == "fallback" for b in blocks): warnings.append("Vision API not configured: visual/handwritten regions were preserved and flagged, not interpreted.")
    if not blocks: warnings.append("No content could be extracted from this document.")
    vis = ("chart", "figure", "diagram", "equation", "handwritten_text", "handwritten_code", "unknown")
    doc = dict(document_id=doc_id, filename=filename, format=kind, real=True, pages=pages, blocks=blocks, warnings=warnings, processing_status="complete",
               router=[dict(block_id=b["block_id"], region_type=b["type"], extractor=b["extractor"]) for b in blocks],
               stats=dict(pages=n_pages, blocks=len(blocks), tables=sum(b["type"] == "table" for b in blocks), visuals=sum(b["type"] in vis for b in blocks), verified=len(blocks)-flagged, flagged=flagged,
                          lanes=dict(local=cnt["digital_text_parser"]+cnt["table_engine"], ocr=cnt["ocr"], vision=state["vision_used"], flagged=sum(b["extractor"] == "fallback" for b in blocks))),
               engines=dict(ocr=ocr.available(), vision=vision.info()))
    with open(os.path.join(out_dir, "document.json"), "w") as f: json.dump(doc, f)
    prog.set("OUTPUT", "done", "Markdown + JSON ready")
    return doc
