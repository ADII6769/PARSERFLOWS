import fs from 'fs';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { SemanticBlock, BlockType } from './db.js';

export interface ParsedDocumentData {
  document_type: string;
  is_scanned: boolean;
  page_count: number;
  blocks: Omit<SemanticBlock, 'document_id'>[];
  has_tables: boolean;
  has_handwriting: boolean;
  has_images: boolean;
  summary?: string;
}

export class DocumentParsers {
  /**
   * Parse Spreadsheet files: XLSX, XLS, CSV, TSV, ODS
   */
  static async parseSpreadsheet(filePath: string, originalName: string): Promise<ParsedDocumentData> {
    const workbook = XLSX.readFile(filePath);
    const blocks: Omit<SemanticBlock, 'document_id'>[] = [];
    let order = 1;
    let pageNum = 1;

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      // Add Title / Sheet header block
      blocks.push({
        block_id: `sheet_title_${pageNum}`,
        page: pageNum,
        type: 'heading',
        content: `Sheet: ${sheetName}`,
        bbox: [50, 40, 600, 70],
        reading_order: order++,
        confidence: 0.99,
        confidence_type: 'parser',
        confidence_level: 'HIGH',
        extractor: 'spreadsheet_engine',
        verification: 'VERIFIED',
        source: { page: pageNum, bbox: [50, 40, 600, 70] },
        warnings: [],
      });

      if (jsonData.length > 0) {
        const headers = (jsonData[0] || []).map(h => String(h || '').trim());
        const rawRows = jsonData.slice(1);
        const rows = rawRows.map(r => (r || []).map(cell => String(cell || '').trim()));

        // Filter out completely empty rows
        const cleanRows = rows.filter(r => r.some(cell => cell.length > 0));

        // Format as Markdown table
        const mdHeader = `| ${headers.join(' | ')} |`;
        const mdDivider = `| ${headers.map(() => '---').join(' | ')} |`;
        const mdRows = cleanRows.slice(0, 100).map(r => `| ${r.join(' | ')} |`).join('\n');
        const tableContent = `${mdHeader}\n${mdDivider}\n${mdRows}`;

        blocks.push({
          block_id: `table_${pageNum}_1`,
          page: pageNum,
          type: 'table',
          content: tableContent,
          bbox: [50, 80, 950, Math.min(900, 80 + cleanRows.length * 30)],
          reading_order: order++,
          confidence: 0.98,
          confidence_type: 'parser',
          confidence_level: 'HIGH',
          extractor: 'spreadsheet_engine',
          verification: 'VERIFIED',
          source: { page: pageNum, bbox: [50, 80, 950, Math.min(900, 80 + cleanRows.length * 30)] },
          warnings: cleanRows.length > 100 ? ['Table rows truncated in preview to 100 items'] : [],
          table_data: {
            headers,
            rows: cleanRows,
          },
          metadata: {
            sheet_name: sheetName,
            total_rows: cleanRows.length,
            total_columns: headers.length,
          },
        });
      }

      pageNum++;
    }

    return {
      document_type: originalName.endsWith('.csv') ? 'CSV' : 'SPREADSHEET',
      is_scanned: false,
      page_count: Math.max(1, workbook.SheetNames.length),
      blocks,
      has_tables: true,
      has_handwriting: false,
      has_images: false,
      summary: `Parsed spreadsheet containing ${workbook.SheetNames.length} sheet(s) with structured tabular data.`,
    };
  }

  /**
   * Parse DOCX files via mammoth
   */
  static async parseDOCX(filePath: string, originalName: string): Promise<ParsedDocumentData> {
    const fileBuffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const rawText = result.value || '';
    const paragraphs = rawText.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);

    const blocks: Omit<SemanticBlock, 'document_id'>[] = [];
    let order = 1;
    let page = 1;
    let currentY = 50;

    for (const para of paragraphs) {
      if (currentY > 900) {
        page++;
        currentY = 50;
      }

      let type: BlockType = 'paragraph';
      if (para.length < 80 && (para.endsWith(':') || /^[0-9]\.|^[A-Z\s]{4,}$/.test(para))) {
        type = 'heading';
      } else if (para.startsWith('- ') || para.startsWith('* ') || /^[0-9]+\)/.test(para)) {
        type = 'list';
      }

      const height = Math.min(150, Math.max(30, Math.ceil(para.length / 70) * 20));
      blocks.push({
        block_id: `docx_blk_${order}`,
        page,
        type,
        content: para,
        bbox: [50, currentY, 900, currentY + height],
        reading_order: order,
        confidence: 0.97,
        confidence_type: 'parser',
        confidence_level: 'HIGH',
        extractor: 'docx_parser',
        verification: 'VERIFIED',
        source: { page, bbox: [50, currentY, 900, currentY + height] },
        warnings: [],
      });

      currentY += height + 15;
      order++;
    }

    return {
      document_type: 'DOCX',
      is_scanned: false,
      page_count: page,
      blocks,
      has_tables: false,
      has_handwriting: false,
      has_images: false,
      summary: `Word document with ${blocks.length} semantic blocks parsed across ${page} page(s).`,
    };
  }

  /**
   * Parse Plain Text, Markdown, JSON, Code, LaTeX, XML, HTML files
   */
  static async parseTextBased(filePath: string, ext: string): Promise<ParsedDocumentData> {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const blocks: Omit<SemanticBlock, 'document_id'>[] = [];
    let order = 1;
    let page = 1;
    let currentY = 50;

    if (ext === 'json') {
      try {
        const parsed = JSON.parse(raw);
        blocks.push({
          block_id: 'json_root',
          page: 1,
          type: 'code',
          content: '```json\n' + JSON.stringify(parsed, null, 2).slice(0, 4000) + '\n```',
          bbox: [50, 50, 950, 850],
          reading_order: 1,
          confidence: 0.99,
          confidence_type: 'parser',
          confidence_level: 'HIGH',
          extractor: 'text_parser',
          verification: 'VERIFIED',
          source: { page: 1, bbox: [50, 50, 950, 850] },
          warnings: raw.length > 4000 ? ['Truncated preview for large JSON'] : [],
        });
        return {
          document_type: 'JSON',
          is_scanned: false,
          page_count: 1,
          blocks,
          has_tables: false,
          has_handwriting: false,
          has_images: false,
          summary: 'Structured JSON data document.',
        };
      } catch (e) {}
    }

    // Split text into paragraphs
    const paragraphs = raw.split(/\r?\n\r?\n/).map(p => p.trim()).filter(p => p.length > 0);

    for (const para of paragraphs) {
      if (currentY > 880) {
        page++;
        currentY = 50;
      }

      let type: BlockType = 'paragraph';
      if (para.startsWith('#')) {
        type = 'heading';
      } else if (para.startsWith('```') || /^(const |let |function |import |class |def |public )/.test(para)) {
        type = 'code';
      } else if (para.startsWith('- ') || para.startsWith('* ') || /^[0-9]+\./.test(para)) {
        type = 'list';
      } else if (para.includes('|') && para.split('\n').every(l => l.includes('|'))) {
        type = 'table';
      }

      const height = Math.min(200, Math.max(30, Math.ceil(para.length / 80) * 22));
      blocks.push({
        block_id: `txt_blk_${order}`,
        page,
        type,
        content: para,
        bbox: [50, currentY, 920, currentY + height],
        reading_order: order,
        confidence: 0.98,
        confidence_type: 'parser',
        confidence_level: 'HIGH',
        extractor: 'text_parser',
        verification: 'VERIFIED',
        source: { page, bbox: [50, currentY, 920, currentY + height] },
        warnings: [],
      });

      currentY += height + 15;
      order++;
    }

    return {
      document_type: ext.toUpperCase(),
      is_scanned: false,
      page_count: Math.max(1, page),
      blocks,
      has_tables: blocks.some(b => b.type === 'table'),
      has_handwriting: false,
      has_images: false,
      summary: `${ext.toUpperCase()} document containing ${blocks.length} blocks.`,
    };
  }

  /**
   * Parse PDF files (Digital text extraction or Scanned detection)
   */
  static async parsePDF(filePath: string): Promise<ParsedDocumentData> {
    const dataBuffer = fs.readFileSync(filePath);
    let pdfText = '';
    let numPages = 1;

    try {
      // Dynamic import of pdf-parse to be safe with commonjs/esm
      const pdfModule: any = await import('pdf-parse');
      const pdfParse = pdfModule.default || pdfModule;
      const parsed = await pdfParse(dataBuffer);
      pdfText = parsed.text || '';
      numPages = parsed.numpages || 1;
    } catch (e: any) {
      console.warn('pdf-parse fallback warning:', e.message);
    }

    const cleanText = pdfText.trim();
    // If text density is virtually zero or empty, it's a scanned PDF!
    const isScanned = cleanText.length < 50;

    const blocks: Omit<SemanticBlock, 'document_id'>[] = [];

    if (!isScanned) {
      // Split by page or double newlines
      const sections = cleanText.split('\n\n').map(s => s.trim()).filter(s => s.length > 0);
      let page = 1;
      let order = 1;
      let currentY = 50;

      for (const sec of sections) {
        if (currentY > 880) {
          if (page < numPages) page++;
          currentY = 50;
        }

        let type: BlockType = 'paragraph';
        if (sec.length < 60 && (sec === sec.toUpperCase() || /^[0-9]\.|^Chapter|^Section/.test(sec))) {
          type = 'heading';
        } else if (sec.startsWith('•') || sec.startsWith('-') || /^[0-9]+\./.test(sec)) {
          type = 'list';
        }

        const height = Math.min(180, Math.max(30, Math.ceil(sec.length / 75) * 20));
        blocks.push({
          block_id: `pdf_blk_${order}`,
          page,
          type,
          content: sec,
          bbox: [50, currentY, 920, currentY + height],
          reading_order: order,
          confidence: 0.95,
          confidence_type: 'parser',
          confidence_level: 'HIGH',
          extractor: 'pdf_text',
          verification: 'VERIFIED',
          source: { page, bbox: [50, currentY, 920, currentY + height] },
          warnings: [],
        });

        currentY += height + 16;
        order++;
      }
    }

    return {
      document_type: 'PDF',
      is_scanned: isScanned,
      page_count: Math.max(1, numPages),
      blocks,
      has_tables: false,
      has_handwriting: false,
      has_images: isScanned,
      summary: isScanned 
        ? `Scanned PDF (${numPages} page(s)) requiring high-resolution OCR & multimodal vision routing.` 
        : `Digital PDF (${numPages} page(s)) with ${blocks.length} structured text blocks.`,
    };
  }
}
