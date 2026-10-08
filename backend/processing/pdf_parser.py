"""Digital text, table and figure-region extraction from the PDF text layer / vector data (local, no AI)."""
import statistics, re
import pymupdf
from .schema import overlap_frac

def analyze(page):
    W, H = page.rect.width, page.rect.height
    chars = len(page.get_text("text").strip())
    cov = 0.0
    for i in page.get_image_info():
        b = i["bbox"]
        cov += max(0, min(b[2], W)-max(b[0], 0)) * max(0, min(b[3], H)-max(b[1], 0))
    cov /= (W*H)
    scanned = chars < 30 or (cov > 0.85 and chars < 80)
    return dict(chars=chars, image_coverage=round(cov, 2), has_text_layer=chars >= 30, scanned=scanned)

def tables(page):
    out = []
    try:
        for t in page.find_tables().tables:
            rows = [[(c or "").strip().replace("\n", " ") for c in r] for r in t.extract()]
            rows = [r for r in rows if any(r)]
            if len(rows) < 2 or max(len(r) for r in rows) < 2: continue
            cells = sum(len(r) for r in rows); filled = sum(1 for r in rows for c in r if c)
            if filled/cells < 0.3: continue
            out.append(dict(bbox=tuple(t.bbox), rows=rows, filled=filled/cells))
    except Exception:
        pass
    return out

def text_blocks(page, skip):
    items, sizes = [], []
    for b in page.get_text("dict")["blocks"]:
        if b["type"] != 0: continue
        lines, sz, bold = [], [], False
        for l in b["lines"]:
            t = "".join(s["text"] for s in l["spans"]).strip()
            if not t: continue
            lines.append(t)
            for s in l["spans"]:
                if s["text"].strip():
                    sz.append(s["size"]); bold = bold or bool(s["flags"] & 16)
        if not lines: continue
        r = tuple(b["bbox"])
        if any(overlap_frac(r, s) > 0.5 for s in skip): continue
        sizes += sz
        items.append(dict(bbox=r, lines=lines, size=max(sz), bold=bold))
    body = statistics.median(sizes) if sizes else 11
    for it in items:
        text = " ".join(it["lines"]); text = re.sub(r"(\w)- (\w)", r"\1\2", text)
        bullets = all(re.match(r"^(\u2022|[-*\u25cf]|\d+[.)]|[a-z][.)])\s", l) for l in it["lines"])
        if bullets and len(it["lines"]) >= 1 and len(it["lines"]) > 1 or (bullets and re.match(r"^(\u2022|[-*])", it["lines"][0])):
            it["type"], it["content"] = "list", "\n".join(it["lines"])
        elif (it["size"] >= body*1.2 or (it["bold"] and it["size"] >= body)) and len(text) < 160 and len(it["lines"]) <= 2:
            it["type"], it["content"] = "heading", text
        elif re.match(r"^(fig(ure)?|table)\.?\s*\d+", text, re.I) and len(text) < 220:
            it["type"], it["content"] = "caption", text
        else:
            it["type"], it["content"] = "paragraph", text
    return items, body

def figures(page, avoid):
    W, H = page.rect.width, page.rect.height
    rects = [tuple(i["bbox"]) for i in page.get_image_info()]
    try: rects += [tuple(r) for r in page.cluster_drawings()]
    except Exception: pass
    rects = [r for r in rects if (r[2]-r[0]) >= 3 and (r[3]-r[1]) >= 3 and not any(overlap_frac(r, a) > 0.5 for a in avoid)]
    g, merged = 60, True            # a bar chart is many small drawings: merge first, filter after
    while merged:
        merged = False
        for i in range(len(rects)):
            for j in range(i+1, len(rects)):
                a, b = rects[i], rects[j]
                if a[0]-g < b[2] and b[0]-g < a[2] and a[1]-g < b[3] and b[1]-g < a[3]:
                    rects[i] = (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])); del rects[j]; merged = True; break
            if merged: break
    return [r for r in rects if (r[2]-r[0]) >= 40 and (r[3]-r[1]) >= 40 and 0.02*W*H <= (r[2]-r[0])*(r[3]-r[1]) <= 0.9*W*H]

def absorb_labels(items, figs, pad=22):
    """Short text blocks hugging a figure (axis labels, legends) belong to the figure, not the body text."""
    out = []
    for it in items:
        grown = [(f[0]-pad, f[1]-pad, f[2]+pad, f[3]+pad) for f in figs]
        if any(overlap_frac(it["bbox"], g) > 0.8 for g in grown) and len(" ".join(it["lines"])) < 80 and it["type"] != "caption": continue
        out.append(it)
    return out

def reading_order(items, W):
    """Column-aware ordering: full-width items split bands; two-column bands read left then right."""
    items = sorted(items, key=lambda i: (i["bbox"][1], i["bbox"][0]))
    res, band, cols = [], [], False
    def flush():
        nonlocal cols
        if not band: return
        L = [i for i in band if (i["bbox"][0]+i["bbox"][2])/2 < W/2]; R = [i for i in band if i not in L]
        vo = lambda a, b: min(a["bbox"][3], b["bbox"][3]) - max(a["bbox"][1], b["bbox"][1]) > 5
        side = (len(L) >= 2 and len(R) >= 1 and any(sum(vo(r, l) for l in L) >= 2 for r in R)) or (len(R) >= 2 and len(L) >= 1 and any(sum(vo(l, r) for r in R) >= 2 for l in L))
        if side or (len(L) >= 2 and len(R) >= 2):
            cols = True
            res.extend(sorted(L, key=lambda i: i["bbox"][1]) + sorted(R, key=lambda i: i["bbox"][1]))
        else:
            res.extend(sorted(band, key=lambda i: (i["bbox"][1], i["bbox"][0])))
        band.clear()
    for i in items:
        if i["bbox"][2]-i["bbox"][0] > 0.6*W: flush(); res.append(i)
        else: band.append(i)
    flush()
    return res, cols
