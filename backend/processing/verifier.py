"""Evidence verification: EXTRACT -> VALIDATE -> ACCEPT or FLAG. Never upgrades a block without independent evidence."""
import re
from .schema import verdict, OK
from . import ocr

def _norm(s): return re.sub(r"[^a-z0-9]+", "", (s or "").lower())
def _toks(s): return set(re.findall(r"[a-z0-9]{2,}", (s or "").lower()))

def verify(b, page_info, crop):
    """page_info: dict(width,height,text); crop: callable(bbox)->PIL image. Mutates and returns block."""
    c, ex, ev = b["confidence"], b["extractor"], "none"
    x0, y0, x1, y1 = b["bbox"]
    v = verdict(c)
    if x0 < -2 or y0 < -2 or x1 > page_info["width"]+2 or y1 > page_info["height"]+2 or x1 <= x0 or y1 <= y0:
        v = "failed"; b["warnings"].append("Bounding box outside page bounds.")
    elif ex == "digital_text_parser":
        ev = "text-layer"
        if not b["content"]: v = "failed"
    elif ex == "table_engine":
        cells = [x for r in b["rows"] for x in r if x]
        found = sum(1 for x in cells if _norm(x) and _norm(x) in page_info["norm_text"]) / max(1, len(cells))
        ev = f"cells found in text layer: {found:.0%}"
        if found < 0.9: v = "review" if v == "verified" else v; b["warnings"].append("Some table cells not found in the page text layer.")
    elif ex == "ocr":
        ev = "ocr word confidence"
        if not b["content"]: v = "failed"
    elif ex == "fallback":
        v = "failed"; ev = "no extractor available"
    else:  # model-based (vision_*, math_vision)
        if not b["content"]:
            v = "failed"; ev = "model returned no content"
        else:
            ev = "model self-reported only"
            if b["type"] == "table" and b.get("rows"):
                cells = [x for r in b["rows"] for x in r if x]
                fr = sum(1 for x in cells if _norm(x) and _norm(x) in page_info["norm_text"]) / max(1, len(cells))
                ev = f"cells found in text layer {fr:.0%}"
                if fr >= 0.9 and c >= OK and page_info["norm_text"]: v, ev = "verified", "independent: " + ev
                elif v == "verified": v = "review"
            if b["type"] in ("handwritten_text", "handwritten_code", "paragraph", "heading", "list"):
                try:
                    oc, ot = ocr.quick_conf(crop(b["bbox"]))
                    a, t = _toks(ot), _toks(b["content"])
                    if t and a:
                        ov = len(a & t)/len(t); ev = f"independent OCR token overlap {ov:.0%}"
                        if ov >= 0.5 and oc >= 0.6 and c >= OK: v = "verified"
                except Exception: pass
    if v == "verified" and ex.startswith(("vision", "math")) and not ev.startswith("independent"): v = "review"
    b["verification"], b["evidence"] = v, ev
    if v != "verified" and not b["warnings"]:
        b["warnings"].append("Confidence below verification threshold (0.85) — review source." if v == "review" else "Low confidence — review source.")
    if v == "review" and ex.startswith(("vision", "math")) and "Model self-reported" not in " ".join(b["warnings"]) and not ev.startswith("independent"):
        b["warnings"].append("Model self-reported confidence; no independent evidence available.")
    return b
