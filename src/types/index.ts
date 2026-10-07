export interface User {
  id: string;
  email: string;
  fullName: string;
  avatar: string;
  createdAt: string;
  storageUsedBytes: number;
  documentsProcessed: number;
  pagesProcessed: number;
  preferences?: {
    ocrEngine: 'tesseract' | 'hybrid';
    theme: 'dark' | 'light';
    autoProcess: boolean;
    confidenceThreshold: number;
  };
}

export type BlockType =
  | 'title'
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'table'
  | 'image'
  | 'figure'
  | 'chart'
  | 'equation'
  | 'handwriting'
  | 'code'
  | 'diagram'
  | 'caption'
  | 'header'
  | 'footer'
  | 'unknown';

export type VerificationStatus = 'VERIFIED' | 'REVIEW' | 'FAILED';

export interface SemanticBlock {
  block_id: string;
  document_id: string;
  page: number;
  type: BlockType;
  content: string;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  reading_order: number;
  confidence: number;
  confidence_type: 'ocr' | 'parser' | 'vision' | 'hybrid';
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  extractor: 'pdf_text' | 'tesseract_ocr' | 'gemini_vision' | 'table_engine' | 'docx_parser' | 'spreadsheet_engine' | 'text_parser';
  verification: VerificationStatus;
  source: {
    page: number;
    bbox: [number, number, number, number];
  };
  warnings: string[];
  table_data?: {
    headers: string[];
    rows: string[][];
  };
  metadata?: Record<string, any>;
}

export interface DocumentPage {
  id: string;
  document_id: string;
  page_number: number;
  width: number;
  height: number;
  image_url?: string;
  has_handwriting: boolean;
  has_tables: boolean;
  has_images: boolean;
  is_scanned: boolean;
  text_density: 'low' | 'medium' | 'high';
  block_count: number;
}

export interface DocumentRecord {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  document_type: string;
  is_scanned: boolean;
  page_count: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVIEW';
  confidence_score: number;
  confidence_rating: 'HIGH' | 'MEDIUM' | 'LOW';
  processing_time_ms: number;
  warnings_count: number;
  blocks_count: number;
  tables_count: number;
  visuals_count: number;
  summary?: string;
  markdown_content?: string;
  json_twin?: any;
  created_at: string;
  updated_at: string;
  is_demo?: boolean;
}

export interface ProcessingJob {
  job_id: string;
  document_id: string;
  user_id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  current_stage: 'UNDERSTAND' | 'ROUTE' | 'EXTRACT' | 'ASSEMBLE' | 'VERIFY' | 'TRACE' | 'COMPLETED' | 'FAILED';
  message: string;
  started_at: string;
  completed_at?: string;
  error?: string;
}

export interface Citation {
  page: number;
  block_id: string;
  snippet: string;
  bbox: [number, number, number, number];
}

export interface QARecord {
  id: string;
  document_id: string;
  question: string;
  answer: string;
  citations: Citation[];
  created_at: string;
}

export interface UserStats {
  documentsCount: number;
  pagesCount: number;
  storageUsedBytes: number;
  verifiedCount: number;
  reviewCount: number;
  failedCount: number;
  averageConfidence: number;
  confidenceDistribution?: {
    high: number;
    medium: number;
    low: number;
  };
  formatDistribution?: Record<string, number>;
  costEstimate?: string;
}
