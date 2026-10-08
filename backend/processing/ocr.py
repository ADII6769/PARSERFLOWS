"""OCR via Tesseract (local). Returns text, bbox, confidence; coordinates are never discarded."""
import pytesseract
from pytesseract import Output
from PIL import ImageOps

def available():
    try: return "tesseract " + str(pytesseract.get_tesseract_version())
    except Exception: return None

def words(img, psm=3):
    g = ImageOps.autocontrast(img.convert("L"))
    d = pytesseract.image_to_data(g, output_type=Output.DICT, config=f"--psm {psm}")
    out = []
    for i, t in enumerate(d["text"]):
        try: c = float(d["conf"][i])
        except Exception: continue
        if t.strip() and c >= 0:
            x, y, w, h = d["left"][i], d["top"][i], d["width"][i], d["height"][i]
            out.append(dict(text=t.strip(), conf=c/100, box=(x, y, x+w, y+h), key=(d["block_num"][i], d["par_num"][i]), line=d["line_num"][i], h=h))
    return out

def paragraphs(ws, min_conf=0.6):
    groups = {}
    for w in ws:
        if w["conf"] >= min_conf: groups.setdefault(w["key"], []).append(w)
    res = []
    for g in groups.values():
        lines = {}
        for w in g: lines.setdefault(w["line"], []).append(w)
        text = "\n".join(" ".join(x["text"] for x in sorted(l, key=lambda z: z["box"][0])) for _, l in sorted(lines.items()))
        bb = (min(w["box"][0] for w in g), min(w["box"][1] for w in g), max(w["box"][2] for w in g), max(w["box"][3] for w in g))
        res.append(dict(text=text, bbox=bb, conf=sum(w["conf"] for w in g)/len(g), height=sum(w["h"] for w in g)/len(g), words=len(g)))
    return res

def quick_text(img):
    try: return pytesseract.image_to_string(ImageOps.autocontrast(img.convert("L")), config="--psm 6").strip()
    except Exception: return ""

def quick_conf(img):
    ws = words(img, 6)
    return (sum(w["conf"] for w in ws)/len(ws), " ".join(w["text"] for w in ws)) if ws else (0.0, "")
