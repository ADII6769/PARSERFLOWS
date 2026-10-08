# ParseFlow

**ParseFlow** is a document processing system developed by **Team DEADLOCK** for the **DQCL ParseAnything** problem statement.

The main idea of the project is to process different types of content present inside a document and extract them into a structured format.

A document may contain normal digital text, tables, scanned pages, handwritten content, diagrams, equations, charts, etc. Instead of using the same technique for everything, ParseFlow identifies the type of content and uses a suitable method for extracting it.

---

## Problem Statement

Most document extraction systems work well when the document contains normal digital text, but real-world documents are often more complicated.

For example, a single PDF may contain:

- Digital text
- Tables
- Scanned pages
- Handwritten notes
- Handwritten code
- Mathematical equations
- Diagrams
- Charts
- Images

Using only one extraction technique for all these cases can result in missing or incorrect information.

Another problem is that when an AI model is used for extraction, it may sometimes generate information that is not actually present in the document.

Our project tries to solve these problems by using different processing methods depending on the type of content and by keeping track of where the extracted information came from.

---

# Our Approach

The complete processing flow is:

```text
Document
   ↓
Detect
   ↓
Analyze
   ↓
Route
   ↓
Extract
   ↓
Assemble
   ↓
Verify
   ↓
Structured Output
```

Each stage has a specific purpose.

### 1. Detect

The system first checks the uploaded document and identifies basic information such as:

- File type
- Number of pages
- File size
- Whether the PDF contains a digital text layer
- Whether the document is scanned

Currently, the system accepts PDF, PNG, JPG and JPEG files.

---

### 2. Analyze

After detecting the document, each page is analyzed to identify different regions.

For example, a page can contain:

```text
Heading
Paragraph
Table
Figure
Caption
```

The system keeps these regions separately instead of treating the entire page as one block.

For digital PDFs, this is mainly handled using **PyMuPDF**.

---

### 3. Route

Once the regions are identified, ParseFlow decides which extraction method should be used.

| Content | Method |
|---|---|
| Digital text | PDF text extraction |
| Tables | Local table extraction |
| Scanned text | Tesseract OCR |
| Handwriting | Vision model |
| Handwritten code | Vision model |
| Equations | Vision model |
| Diagrams | Vision model |
| Charts | Vision model |
| Figures | Vision model |

This is one of the main ideas of the project.

We don't send the complete document to an AI model unnecessarily. We use local processing wherever possible and use vision models only for regions that require them.

---

# Extraction Methods

## Digital Text

For normal digital PDFs, we use **PyMuPDF** to extract the existing text layer.

The parser also uses the position of text blocks to reconstruct the reading order.

This is useful for documents with layouts such as:

```text
┌───────────────┬───────────────┐
│   Column 1    │   Column 2    │
│               │               │
│   Text        │   Text        │
│   Text        │   Text        │
└───────────────┴───────────────┘
```

The system tries to preserve the logical order instead of simply reading the PDF's raw text sequence.

---

## Tables

Tables present in digital PDFs are processed locally.

The system identifies table regions and extracts their rows and columns.

The extracted table is then stored as a structured block instead of plain text.

For example:

```text
Region    FY23    FY24
-----------------------
Americas  18.0    19.1
Europe    11.2    11.2
APAC      14.4    17.9
```

---

## OCR

For scanned documents, there may be no digital text layer.

In this case ParseFlow uses **Tesseract OCR**.

OCR provides:

- Extracted words
- Word coordinates
- OCR confidence
- Line information

The coordinates are important because they allow the extracted text to be connected to its original location on the page.

---

## Handwriting and Visual Content

Some content cannot be reliably extracted using normal PDF parsing or OCR.

Examples include:

- Handwritten notes
- Handwritten programs
- Equations
- Diagrams
- Charts
- Figures

For these cases, ParseFlow can use a vision model.

The project currently supports:

- Google Gemini
- Anthropic Claude

The vision model is given the relevant region rather than unnecessarily processing the complete document.

---

# Digital Twin

After extraction, ParseFlow converts the different regions into a common structured format.

We refer to this as the **Digital Twin** of the document.

Each block contains information such as:

```json
{
  "block_id": "txt_1_01",
  "type": "paragraph",
  "content": "Example text",
  "page": 1,
  "bbox": [40, 95, 560, 175],
  "reading_order": 2,
  "confidence": 0.99,
  "extractor": "digital_text_parser",
  "verification": "verified"
}
```

This means we don't just store the extracted text.

We also store:

- What the content is
- Where it is located
- Which page it belongs to
- Its position on the page
- Reading order
- Which extractor was used
- Confidence
- Verification status
- Warnings
- Relationships with other blocks

This makes it possible to go back from the extracted result to the original document.

---

# Verification

One of the important parts of ParseFlow is the verification step.

The system does not consider an AI model's confidence score to be enough by itself.

Depending on the type of content, the system tries to use additional evidence.

For example:

### Digital Text

The extracted content can be compared with the original PDF text layer.

### Tables

Extracted table values can be checked against text available in the source document.

### OCR

OCR confidence is retained with the extracted result.

### Vision

Vision-model results may remain in a review state when there is no independent evidence available.

---

## Confidence Levels

The current verification system uses the following general thresholds:

```text
Confidence >= 0.85
        ↓
    VERIFIED

0.60 - 0.84
        ↓
     REVIEW

Confidence < 0.60
        ↓
     FAILED
```

The exact verification result also depends on whether independent evidence is available.

---

# What happens when the system is not sure?

We decided that it is better to flag an uncertain result than to generate something that looks correct but was never actually present in the document.

For example:

```text
Content:
[Not confidently extracted]

Status:
Review

Warning:
Low confidence
```

The original page region is still preserved so that the user can manually check it.

This is especially useful for handwritten content and complicated diagrams.

---

# Frontend

The frontend is implemented in a single `index.html` file and communicates with the FastAPI backend.

The interface provides:

### Upload

Users can upload a document using the browser.

### Processing Status

The interface displays the current processing stage:

```text
DETECT
ANALYZE
ROUTE
EXTRACT
ASSEMBLE
VERIFY
OUTPUT
```

### Document Viewer

Users can view the original pages along with the detected regions.

### Block Inspector

Selecting a region shows information such as:

- Content
- Block type
- Confidence
- Extractor
- Page
- Bounding box
- Verification status
- Warnings

### JSON View

The complete Digital Twin can be viewed as JSON.

### Markdown View

The extracted document can also be viewed in Markdown form.

### Tables / Visuals / Handwritten

The interface provides separate views for different types of extracted content.

---

# System Architecture

```text
                     User
                      │
                      ▼
                Web Interface
                      │
                      ▼
                   FastAPI
                      │
                      ▼
                  Pipeline
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
      PDF Parser     OCR       Vision
      PyMuPDF     Tesseract   Gemini /
                               Claude
          │           │           │
          └───────────┼───────────┘
                      ▼
                   Assemble
                      │
                      ▼
                   Verify
                      │
                      ▼
                 Digital Twin
                      │
                      ▼
                  Frontend
```

---

# Project Structure

```text
PARSERFLOWS/
│
├── backend/
│   ├── app.py
│   │
│   └── processing/
│       ├── __init__.py
│       ├── pipeline.py
│       ├── pdf_parser.py
│       ├── ocr.py
│       ├── vision.py
│       ├── verifier.py
│       └── schema.py
│
├── frontend/
│   └── index.html
│
├── .env.example
├── requirements.txt
├── run.sh
├── run.bat
└── README.md
```

### Main files

| File | Purpose |
|---|---|
| `app.py` | FastAPI application and API endpoints |
| `pipeline.py` | Controls the complete document-processing flow |
| `pdf_parser.py` | Handles digital PDF extraction |
| `ocr.py` | Handles OCR using Tesseract |
| `vision.py` | Handles Gemini/Claude vision processing |
| `verifier.py` | Handles verification of extracted content |
| `schema.py` | Defines the structure of extracted blocks |
| `index.html` | Frontend interface |
| `requirements.txt` | Python dependencies |
| `.env.example` | Environment variable configuration |
| `run.sh` | Linux/macOS startup script |
| `run.bat` | Windows startup script |

---

# API

The backend is implemented using FastAPI.

### Health Check

```http
GET /api/health
```

Used to check whether the backend is running and whether OCR/vision components are available.

### Process Document

```http
POST /api/process
```

Uploads and starts processing a document.

### Processing Status

```http
GET /api/status/{document_id}
```

Returns the current processing status.

### Get Processed Document

```http
GET /api/document/{document_id}
```

Returns the Digital Twin JSON.

### Get Page

```http
GET /api/page/{document_id}/{page}.png
```

Returns a rendered page image for the document viewer.

---

# Technologies Used

### Backend

- Python
- FastAPI
- Uvicorn

### Document Processing

- PyMuPDF
- Pillow
- NumPy
- SciPy

### OCR

- Tesseract
- pytesseract

### AI / Vision

- Google Gemini
- Anthropic Claude

### Frontend

- HTML
- CSS
- JavaScript
- SVG

---

# Installation

Clone the repository:

```bash
git clone https://github.com/ADII6769/PARSERFLOWS.git
cd PARSERFLOWS
```

### Windows

```bat
run.bat
```

### Linux / macOS

```bash
bash run.sh
```

After starting the server, open:

```text
http://localhost:8000
```

---

# Environment Variables

Vision processing is optional.

Example `.env`:

```env
VISION_PROVIDER=gemini
VISION_API_KEY=YOUR_API_KEY
VISION_MODEL=
MAX_VISION_REGIONS=12
MAX_PAGES=60
```

For Anthropic:

```env
VISION_PROVIDER=anthropic
VISION_API_KEY=YOUR_API_KEY
VISION_MODEL=
MAX_VISION_REGIONS=12
MAX_PAGES=60
```

If no vision API key is provided, the system can still process digital PDFs and OCR-supported scanned documents. Visual regions that cannot be processed are preserved and flagged.

---

# Example

Suppose the uploaded document contains:

```text
Page 1
 ├── Digital paragraph
 ├── Table
 └── Chart

Page 2
 ├── Scanned text
 ├── Handwritten notes
 ├── Diagram
 └── Equation
```

ParseFlow handles it approximately like this:

```text
Digital paragraph
        ↓
   PDF Parser

Table
        ↓
 Table Extraction

Chart
        ↓
 Vision

Scanned text
        ↓
   Tesseract

Handwritten notes
        ↓
   Vision

Diagram
        ↓
   Vision

Equation
        ↓
   Vision
```

All of these are then combined into a single structured document.

---

# Why ParseFlow?

The main difference between ParseFlow and a basic document-to-text system is that ParseFlow tries to retain the **structure and evidence behind the extraction**.

Instead of only producing:

```text
Extracted text...
```

the system produces something closer to:

```text
Extracted text
│
├── Page: 2
├── Location: [x1, y1, x2, y2]
├── Type: paragraph
├── Extractor: OCR
├── Confidence: 0.91
└── Verification: verified
```

This makes the result easier to inspect and debug.

---

# Current Limitations

- Scanned documents require Tesseract for OCR.
- Handwriting and complex visual content require a configured vision model for full extraction.
- Vision-based results may require manual review.
- Very large documents are limited by configurable page and vision-region limits.
- Password-protected PDFs cannot be processed directly.

---

# Future Improvements

Some possible extensions are:

- Better handwriting recognition
- Better multilingual OCR
- Improved chart extraction
- More accurate table reconstruction
- More advanced document search
- Vector database support
- Batch document processing
- User authentication
- Persistent document storage
- More vision providers
- Better evaluation and benchmarking

---

# Team

**Team DEADLOCK**

**Project:** ParseFlow  
**Problem Statement:** DQCL ParseAnything  
**Event:** DataQuest 3.0

Repository:

https://github.com/ADII6769/PARSERFLOWS

---

## In Short

ParseFlow takes a complex document, identifies the different types of content inside it, chooses an appropriate extraction method for each region, combines the results into a structured Digital Twin, and keeps track of the source and verification status of the extracted information.

The main idea can be summarized as:

```text
Don't treat every part of a document the same.
Understand the content first,
use the right extractor,
and keep the evidence with the result.
```
