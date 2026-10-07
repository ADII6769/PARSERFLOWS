import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
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

export interface BoundingBox {
  // [x1, y1, x2, y2] normalized 0 to 1000 or relative percentage
  x1: number;
  y1: number;
  x2: number;
  y2: number;
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
  file_path: string;
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

export interface QARecord {
  id: string;
  document_id: string;
  user_id: string;
  question: string;
  answer: string;
  citations: Array<{
    page: number;
    block_id: string;
    snippet: string;
    bbox: [number, number, number, number];
  }>;
  created_at: string;
}

interface DatabaseSchema {
  users: User[];
  documents: DocumentRecord[];
  pages: DocumentPage[];
  blocks: SemanticBlock[];
  jobs: ProcessingJob[];
  qa_history: QARecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'parseflow_db.json');

class Database {
  private data: DatabaseSchema = {
    users: [],
    documents: [],
    pages: [],
    blocks: [],
    jobs: [],
    qa_history: []
  };
  private isLoaded = false;

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const uploadsDir = path.resolve(process.cwd(), 'storage', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.isLoaded = true;
      } catch (err) {
        console.error('Error loading database file, initializing fresh:', err);
        this.save();
      }
    } else {
      this.save();
    }
  }

  private save() {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  // Users
  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.data.users.find(u => u.id === id);
    if (!user) return undefined;
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return user;
  }

  // Documents
  getDocumentsByUserId(userId: string): DocumentRecord[] {
    return this.data.documents.filter(d => d.user_id === userId);
  }

  getDocumentById(id: string, userId?: string): DocumentRecord | undefined {
    return this.data.documents.find(d => d.id === id && (!userId || d.user_id === userId));
  }

  createDocument(doc: DocumentRecord): DocumentRecord {
    this.data.documents.unshift(doc);
    this.save();
    return doc;
  }

  updateDocument(id: string, updates: Partial<DocumentRecord>): DocumentRecord | undefined {
    const doc = this.data.documents.find(d => d.id === id);
    if (!doc) return undefined;
    Object.assign(doc, updates, { updated_at: new Date().toISOString() });
    this.save();
    return doc;
  }

  deleteDocument(id: string, userId: string): boolean {
    const index = this.data.documents.findIndex(d => d.id === id && d.user_id === userId);
    if (index === -1) return false;
    
    // Remove associated file if exists
    const doc = this.data.documents[index];
    if (doc.file_path && fs.existsSync(doc.file_path)) {
      try { fs.unlinkSync(doc.file_path); } catch (e) {}
    }

    this.data.documents.splice(index, 1);
    this.data.pages = this.data.pages.filter(p => p.document_id !== id);
    this.data.blocks = this.data.blocks.filter(b => b.document_id !== id);
    this.data.jobs = this.data.jobs.filter(j => j.document_id !== id);
    this.data.qa_history = this.data.qa_history.filter(q => q.document_id !== id);
    this.save();
    return true;
  }

  // Pages
  getPagesByDocumentId(documentId: string): DocumentPage[] {
    return this.data.pages.filter(p => p.document_id === documentId).sort((a, b) => a.page_number - b.page_number);
  }

  setPages(documentId: string, pages: DocumentPage[]): void {
    this.data.pages = this.data.pages.filter(p => p.document_id !== documentId).concat(pages);
    this.save();
  }

  // Blocks
  getBlocksByDocumentId(documentId: string): SemanticBlock[] {
    return this.data.blocks
      .filter(b => b.document_id === documentId)
      .sort((a, b) => a.page !== b.page ? a.page - b.page : a.reading_order - b.reading_order);
  }

  setBlocks(documentId: string, blocks: SemanticBlock[]): void {
    this.data.blocks = this.data.blocks.filter(b => b.document_id !== documentId).concat(blocks);
    this.save();
  }

  // Jobs
  getJobById(jobId: string): ProcessingJob | undefined {
    return this.data.jobs.find(j => j.job_id === jobId);
  }

  getJobByDocumentId(documentId: string): ProcessingJob | undefined {
    return this.data.jobs.find(j => j.document_id === documentId);
  }

  createJob(job: ProcessingJob): ProcessingJob {
    this.data.jobs.unshift(job);
    this.save();
    return job;
  }

  updateJob(jobId: string, updates: Partial<ProcessingJob>): ProcessingJob | undefined {
    const job = this.data.jobs.find(j => j.job_id === jobId);
    if (!job) return undefined;
    Object.assign(job, updates);
    this.save();
    return job;
  }

  // Q&A History
  getQAHistory(documentId: string): QARecord[] {
    return this.data.qa_history.filter(q => q.document_id === documentId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  addQA(qa: QARecord): QARecord {
    this.data.qa_history.push(qa);
    this.save();
    return qa;
  }

  // Stats for user
  getUserStats(userId: string) {
    const docs = this.data.documents.filter(d => d.user_id === userId);
    const pagesTotal = docs.reduce((acc, d) => acc + (d.page_count || 0), 0);
    const storageTotal = docs.reduce((acc, d) => acc + (d.file_size || 0), 0);
    const verifiedDocs = docs.filter(d => d.status === 'COMPLETED' && d.confidence_score >= 0.85).length;
    const reviewDocs = docs.filter(d => d.status === 'REVIEW' || (d.warnings_count > 0 && d.status === 'COMPLETED')).length;
    const failedDocs = docs.filter(d => d.status === 'FAILED').length;

    return {
      documentsCount: docs.length,
      pagesCount: pagesTotal,
      storageUsedBytes: storageTotal,
      verifiedCount: verifiedDocs,
      reviewCount: reviewDocs,
      failedCount: failedDocs,
      averageConfidence: docs.length > 0 
        ? Number((docs.reduce((acc, d) => acc + (d.confidence_score || 0), 0) / docs.length).toFixed(2)) 
        : 0
    };
  }
}

export const db = new Database();
