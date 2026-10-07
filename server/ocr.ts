import { createWorker } from 'tesseract.js';
import fs from 'fs';

export interface OCRWord {
  text: string;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  confidence: number; // 0 to 1
}

export interface OCRLine {
  text: string;
  bbox: [number, number, number, number];
  confidence: number;
  words: OCRWord[];
}

export interface OCRBlock {
  block_id: string;
  text: string;
  bbox: [number, number, number, number];
  confidence: number;
  lines: OCRLine[];
}

export interface OCRResult {
  full_text: string;
  blocks: OCRBlock[];
  average_confidence: number;
  engine: 'tesseract';
}

export class OCRService {
  /**
   * Performs OCR on an image buffer or file path
   */
  static async recognizeImage(imageInput: Buffer | string): Promise<OCRResult> {
    try {
      const worker = await createWorker('eng');
      
      const ret = await worker.recognize(imageInput);
      await worker.terminate();

      const ocrBlocks: OCRBlock[] = [];
      let totalConf = 0;
      let count = 0;

      // Extract lines/blocks if available in ret.data
      const lines = (ret.data as any).lines || [];

      if (lines.length > 0) {
        let blockIndex = 1;
        let currentLines: OCRLine[] = [];
        let currentBlockBbox: [number, number, number, number] = [0, 0, 0, 0];

        for (const line of lines) {
          const lText = line.text?.trim() || '';
          if (!lText) continue;

          const lBbox: [number, number, number, number] = [
            line.bbox?.x0 || 0,
            line.bbox?.y0 || 0,
            line.bbox?.x1 || 100,
            line.bbox?.y1 || 30,
          ];
          const lConf = Math.max(0.1, (line.confidence || 75) / 100);
          totalConf += lConf;
          count++;

          const words: OCRWord[] = (line.words || []).map((w: any) => ({
            text: w.text || '',
            bbox: [w.bbox?.x0 || 0, w.bbox?.y0 || 0, w.bbox?.x1 || 0, w.bbox?.y1 || 0],
            confidence: Math.max(0.1, (w.confidence || 75) / 100),
          }));

          currentLines.push({
            text: lText,
            bbox: lBbox,
            confidence: lConf,
            words,
          });

          // Group lines into paragraphs/blocks (e.g., every 3-5 lines or empty line separation)
          if (currentLines.length >= 4 || lText.endsWith('.') || lText.endsWith(':')) {
            const minX = Math.min(...currentLines.map(l => l.bbox[0]));
            const minY = Math.min(...currentLines.map(l => l.bbox[1]));
            const maxX = Math.max(...currentLines.map(l => l.bbox[2]));
            const maxY = Math.max(...currentLines.map(l => l.bbox[3]));
            const avgBlockConf = currentLines.reduce((acc, l) => acc + l.confidence, 0) / currentLines.length;

            ocrBlocks.push({
              block_id: `ocr_blk_${blockIndex++}`,
              text: currentLines.map(l => l.text).join(' '),
              bbox: [minX, minY, maxX, maxY],
              confidence: Number(avgBlockConf.toFixed(2)),
              lines: [...currentLines],
            });
            currentLines = [];
          }
        }

        if (currentLines.length > 0) {
          const minX = Math.min(...currentLines.map(l => l.bbox[0]));
          const minY = Math.min(...currentLines.map(l => l.bbox[1]));
          const maxX = Math.max(...currentLines.map(l => l.bbox[2]));
          const maxY = Math.max(...currentLines.map(l => l.bbox[3]));
          const avgBlockConf = currentLines.reduce((acc, l) => acc + l.confidence, 0) / currentLines.length;

          ocrBlocks.push({
            block_id: `ocr_blk_${blockIndex++}`,
            text: currentLines.map(l => l.text).join(' '),
            bbox: [minX, minY, maxX, maxY],
            confidence: Number(avgBlockConf.toFixed(2)),
            lines: [...currentLines],
          });
        }
      }

      // If no structured lines were obtained but text exists
      if (ocrBlocks.length === 0 && ret.data.text.trim()) {
        const paragraphs = ret.data.text.split('\n\n').filter(p => p.trim());
        let bIdx = 1;
        for (const p of paragraphs) {
          ocrBlocks.push({
            block_id: `ocr_blk_${bIdx}`,
            text: p.trim(),
            bbox: [50, 100 * bIdx, 900, 100 * bIdx + 80],
            confidence: Number(((ret.data.confidence || 80) / 100).toFixed(2)),
            lines: [],
          });
          bIdx++;
        }
      }

      const avgConfidence = count > 0 ? totalConf / count : (ret.data.confidence || 80) / 100;

      return {
        full_text: ret.data.text,
        blocks: ocrBlocks,
        average_confidence: Number(avgConfidence.toFixed(2)),
        engine: 'tesseract',
      };
    } catch (err: any) {
      console.error('OCR processing error:', err.message);
      return {
        full_text: '',
        blocks: [],
        average_confidence: 0.0,
        engine: 'tesseract',
      };
    }
  }
}
