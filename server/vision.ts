import { GoogleGenAI } from '@google/genai';
import { SemanticBlock } from './db.js';

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface VisionAnalysisResult {
  type: 'handwriting' | 'diagram' | 'chart' | 'equation' | 'table' | 'paragraph';
  content: string;
  confidence: number;
  verification: 'VERIFIED' | 'REVIEW' | 'FAILED';
  warning?: string;
  metadata?: Record<string, any>;
  tableData?: {
    headers: string[];
    rows: string[][];
  };
}

export class VisionService {
  /**
   * Analyzes handwritten text, math equations, diagrams, or complex visual regions
   */
  static async analyzeComplexRegion(
    imageBuffer: Buffer,
    mimeType: string,
    regionHint?: string
  ): Promise<VisionAnalysisResult> {
    const ai = getAIClient();

    if (!ai) {
      // Local fallback when GEMINI_API_KEY is not configured
      return {
        type: 'handwriting',
        content: '[Handwritten notes or visual notation detected - Vision API key not configured]',
        confidence: 0.60,
        verification: 'REVIEW',
        warning: 'Multimodal vision model unavailable; flagged for manual review',
      };
    }

    try {
      const prompt = `Analyze this cropped document region.
Task:
1. Determine what this region represents: handwritten text, mathematical equation, diagram, chart, table, or mixed.
2. Transcribe the exact text or LaTeX notation if equation.
3. If handwriting is ambiguous or uncertain, do NOT guess or invent words. Return confidence lower than 0.70 and specify warning.
4. If diagram/chart, explain the structure, nodes, arrows, and labels concisely.

Respond strictly in valid JSON format:
{
  "type": "handwriting" | "equation" | "diagram" | "chart" | "table" | "paragraph",
  "content": "transcribed text or LaTeX or diagram description",
  "confidence": 0.0 to 1.0,
  "verification": "VERIFIED" | "REVIEW" | "FAILED",
  "warning": "optional warning if characters or structure are ambiguous"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'image/png',
                  data: imageBuffer.toString('base64'),
                },
              },
              {
                text: `${prompt}\nRegion context hint: ${regionHint || 'Scanned document page crop'}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText);

      return {
        type: parsed.type || 'handwriting',
        content: parsed.content || 'Unrecognized region',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.75,
        verification: parsed.verification || (parsed.confidence >= 0.8 ? 'VERIFIED' : 'REVIEW'),
        warning: parsed.warning,
      };
    } catch (err: any) {
      console.error('VisionService analyzeComplexRegion error:', err.message);
      return {
        type: 'handwriting',
        content: 'Unable to decode complex region reliably.',
        confidence: 0.50,
        verification: 'REVIEW',
        warning: `Vision decoding failure: ${err.message}`,
      };
    }
  }

  /**
   * Grounded Question & Answering based STRICTLY on document evidence
   */
  static async answerDocumentQuestion(
    question: string,
    documentTitle: string,
    evidenceBlocks: SemanticBlock[]
  ): Promise<{
    answer: string;
    citations: Array<{ page: number; block_id: string; snippet: string; bbox: [number, number, number, number] }>;
  }> {
    const ai = getAIClient();

    // Prepare evidence context
    const evidenceContext = evidenceBlocks.map(b => ({
      block_id: b.block_id,
      page: b.page,
      type: b.type,
      bbox: b.bbox,
      content: b.content,
      confidence: b.confidence,
    }));

    const runLocalGroundedQA = () => {
      const stopWords = new Set(['what', 'is', 'the', 'are', 'was', 'were', 'of', 'in', 'for', 'and', 'to', 'a', 'an', 'how', 'does', 'do', 'can', 'about']);
      const lowerQ = question.toLowerCase();
      const keywords = lowerQ
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

      const scoredBlocks = evidenceBlocks.map(b => {
        const text = (b.content || '').toLowerCase();
        let matches = 0;
        for (const kw of keywords) {
          if (text.includes(kw)) matches += 2;
        }
        if (keywords.some(kw => (b.type || '').toLowerCase().includes(kw))) {
          matches += 1;
        }
        return { block: b, score: matches };
      }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

      if (scoredBlocks.length === 0) {
        return {
          answer: "I couldn't find sufficient evidence in this document.",
          citations: [],
        };
      }

      const top = scoredBlocks.slice(0, 3);
      const citations = top.map(t => ({
        page: t.block.page,
        block_id: t.block.block_id,
        snippet: t.block.content.slice(0, 140),
        bbox: t.block.bbox,
      }));

      const evidenceBulletPoints = top.map(t => 
        `According to [Page ${t.block.page}, Block ${t.block.block_id}] (${t.block.type}):\n"${t.block.content}"`
      ).join('\n\n');

      return {
        answer: `Direct evidence retrieved from "${documentTitle}":\n\n${evidenceBulletPoints}`,
        citations,
      };
    };

    if (!ai) {
      return runLocalGroundedQA();
    }

    try {
      const systemInstruction = `You are ParseFlow Evidence Q&A, an evidence-preserving document intelligence system.
CRITICAL RULES:
1. Answer the question using ONLY the provided document evidence blocks.
2. Every major claim or factual assertion MUST be directly backed by a cited block.
3. Include explicit bracket citations in your answer prose like [Page X, Block block_id].
4. If the document DOES NOT contain sufficient evidence to answer the question, respond EXACTLY with:
"I couldn't find sufficient evidence in this document."
5. Never extrapolate, hallucinate, or use external knowledge not present in the evidence.`;

      const prompt = `Document: "${documentTitle}"
Question: "${question}"

EVIDENCE BLOCKS:
${JSON.stringify(evidenceContext, null, 2)}

Provide your response in JSON format:
{
  "answer": "string containing grounded answer with [Page X, Block ID] citations",
  "cited_block_ids": ["array of block_id strings referenced in answer"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText);

      const citedIds = new Set<string>(parsed.cited_block_ids || []);
      const citations: Array<{ page: number; block_id: string; snippet: string; bbox: [number, number, number, number] }> = [];

      for (const b of evidenceBlocks) {
        if (citedIds.has(b.block_id)) {
          citations.push({
            page: b.page,
            block_id: b.block_id,
            snippet: b.content.slice(0, 160),
            bbox: b.bbox,
          });
        }
      }

      // If no explicit citations parsed but answer has text, pick highest relevant
      if (citations.length === 0 && parsed.answer && !parsed.answer.includes("couldn't find sufficient evidence")) {
        const firstTwo = evidenceBlocks.slice(0, 2);
        for (const b of firstTwo) {
          citations.push({
            page: b.page,
            block_id: b.block_id,
            snippet: b.content.slice(0, 160),
            bbox: b.bbox,
          });
        }
      }

      return {
        answer: parsed.answer || "I couldn't find sufficient evidence in this document.",
        citations,
      };
    } catch (err: any) {
      console.error('VisionService answerDocumentQuestion error, falling back to local grounded engine:', err.message);
      return runLocalGroundedQA();
    }
  }
}
