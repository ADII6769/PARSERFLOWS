# PARSEFLOW
> **"Evidence-preserving document intelligence."**

ParseFlow is a Universal Document Intelligence & Provenance Engine that accepts complex documents, scanned documents, images, spreadsheets, and presentations, decodes their contents, reconstructs their semantic structure, verifies extracted information, preserves page/bounding-box provenance, and produces structured Markdown + JSON.

---

## Core Pipeline Architecture

```
UNDERSTAND → ROUTE → EXTRACT → ASSEMBLE → VERIFY → TRACE → ANSWER
```

1. **UNDERSTAND**: Heuristic file identification, rasterization detection, layout analysis.
2. **ROUTE**: Content-Aware Router sends digital text to AST parsers, scanned images to Tesseract OCR, and complex handwriting/formulas/diagrams to Gemini Multimodal Vision.
3. **EXTRACT**: Extracts words, bounding boxes, tables, LaTeX equations, and code blocks.
4. **ASSEMBLE**: Multi-column reading order reconstruction (`reading_order`).
5. **VERIFY**: Quality assurance engine flagging low confidence (<65%), structural anomalies, or character ambiguities as `REVIEW` instead of hallucinating.
6. **TRACE**: Complete bounding-box coordinate tracking `[x1, y1, x2, y2]` linked back to rendered document pages.
7. **ANSWER**: Grounded Evidence Q&A quoting solely from document blocks with clickable `[Page X, Block ID]` citations.

---

## Authentication & Security
- **Bcrypt Password Hashing**: Passwords are cryptographically salted and hashed. Plaintext is never stored.
- **JWT Session Persistence**: Bearer tokens with strict 7-day expiration.
- **Complete User Isolation**: User A cannot view, query, or mutate User B's documents.
- **Zero Hallucination Policy**: If evidence cannot be found, ParseFlow explicitly states: *"I couldn't find sufficient evidence in this document."*

---

## Local Development & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file (see `.env.example`):
```env
GEMINI_API_KEY="your-gemini-api-key"
JWT_SECRET="your-jwt-secret"
PORT=3000
```

### 3. Start Development Server
```bash
npm run dev
```
The app runs on `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## Docker Deployment
```bash
docker-compose up --build
```
Access the application on port `3000`.
