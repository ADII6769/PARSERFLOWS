"""Vision / handwriting extractor. Server-side only. Providers: Gemini or Claude (VISION_PROVIDER=gemini|anthropic, key in VISION_API_KEY).
Without a key, available() is False and the pipeline flags visual regions instead of guessing."""
import os, io, json, base64, re
import httpx

VALID = {"handwritten_text", "handwritten_code", "equation", "diagram", "chart", "figure", "table", "paragraph", "heading", "list", "unknown"}
PROMPT = """You are a document-extraction engine. The image is a crop from one page of a document.
Identify each distinct region and answer with JSON only:
{"items":[{"type":"handwritten_text|handwritten_code|equation|diagram|chart|figure|table|paragraph|heading|list|unknown",
"content":"exact transcription or null","description":"one-sentence description for visuals or null","latex":"LaTeX for equations or null",
"rows":[["table cells, header row first"]] or null,"elements":["every node/label exactly as written, e.g. 30 (BF +2)"],"relationships":["every edge e.g. 30 -left-> 20, plus rotation arrows/annotations such as LL case: right rotation about 30"],
"chart":{"title":null,"chart_type":null,"axes":null,"legend":null,"data":null},
"bbox":[x1,y1,x2,y2],"confidence":0.0}]}
bbox is normalised 0-1000 relative to this image. Rules: transcribe exactly what is written; never guess illegible text (use content null and confidence below 0.5);
keep code formatting; tables must be returned as type table with rows; hand-drawn AVL/binary trees are type diagram and list every node and edge; never invent chart values (chart.data only if values are printed or clearly labelled, else null); no prose outside the JSON."""

def provider(): return os.getenv("VISION_PROVIDER", "gemini").lower()
def key(): return os.getenv("VISION_API_KEY") or os.getenv("ANTHROPIC_API_KEY" if provider() == "anthropic" else "GEMINI_API_KEY") or ""
def available(): return bool(key())
def model(): return os.getenv("VISION_MODEL") or ("claude-sonnet-5-5" if provider() == "anthropic" else "gemini-2.5-flash")
def info(): return dict(configured=available(), provider=provider(), model=model())

def analyze_crop(img, timeout=60):
    """returns (items, error). Never raises."""
    if not available(): return [], "VISION_API_KEY not configured"
    buf = io.BytesIO(); img.convert("RGB").save(buf, "PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    if provider() == "anthropic":
        url, headers = "https://api.anthropic.com/v1/messages", {"x-api-key": key(), "anthropic-version": "2023-06-01"}
        body = {"model": model(), "max_tokens": 4096, "messages": [{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b64}}, {"type": "text", "text": PROMPT}]}]}
        pick = lambda j: j["content"][0]["text"]
    else:
        url, headers = f"https://generativelanguage.googleapis.com/v1beta/models/{model()}:generateContent", {"x-goog-api-key": key()}
        body = {"contents": [{"parts": [{"text": PROMPT}, {"inline_data": {"mime_type": "image/png", "data": b64}}]}],
                "generationConfig": {"temperature": 0, "responseMimeType": "application/json"}}
        pick = lambda j: j["candidates"][0]["content"]["parts"][0]["text"]
    err = "unknown error"
    for attempt in range(2):
        try:
            r = httpx.post(url, json=body, headers=headers, timeout=timeout)
            if r.status_code >= 400:
                err = f"vision API HTTP {r.status_code}"
                if r.status_code in (429, 500, 503) and attempt == 0: continue
                return [], err
            txt = pick(r.json())
            txt = re.sub(r"^```(?:json)?|```$", "", txt.strip(), flags=re.M).strip()
            items = json.loads(txt).get("items", [])
            return [i for i in items if isinstance(i, dict)], None
        except httpx.TimeoutException: err = "vision API timeout"
        except Exception as e: err = f"vision response unusable ({type(e).__name__})"
    return [], err
