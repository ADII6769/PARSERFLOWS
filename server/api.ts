import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db, User, DocumentRecord, ProcessingJob, SemanticBlock } from './db.js';
import { hashPassword, comparePassword, generateToken, authMiddleware, AuthenticatedRequest } from './auth.js';
import { ContentAwareRouter } from './router.js';
import { VisionService } from './vision.js';

const router = express.Router();

// Multer storage configuration
const uploadsDir = path.resolve(process.cwd(), 'storage', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Helper for UUID
function getUid(): string {
  return 'uid_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

/* ==========================================================================
   AUTHENTICATION ENDPOINTS
   ========================================================================== */

router.post('/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, avatar } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({
        status: 'FAILED',
        error_code: 'VALIDATION_ERROR',
        message: 'Email, password, and full name are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 'FAILED',
        error_code: 'WEAK_PASSWORD',
        message: 'Password must be at least 6 characters.',
      });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        status: 'FAILED',
        error_code: 'USER_EXISTS',
        message: 'An account with this email address already exists.',
      });
    }

    const passwordHash = await hashPassword(password);
    const userId = getUid();
    const newUser: User = {
      id: userId,
      email: email.trim().toLowerCase(),
      passwordHash,
      fullName: fullName.trim(),
      avatar: avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(fullName)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      storageUsedBytes: 0,
      documentsProcessed: 0,
      pagesProcessed: 0,
      preferences: {
        ocrEngine: 'tesseract',
        theme: 'dark',
        autoProcess: true,
        confidenceThreshold: 0.85,
      },
    };

    db.createUser(newUser);
    const token = generateToken(newUser);

    return res.status(201).json({
      status: 'SUCCESS',
      message: 'Account created successfully.',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        avatar: newUser.avatar,
        createdAt: newUser.createdAt,
        preferences: newUser.preferences,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'FAILED',
      error_code: 'SERVER_ERROR',
      message: err.message,
    });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        status: 'FAILED',
        error_code: 'VALIDATION_ERROR',
        message: 'Email and password are required.',
      });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        status: 'FAILED',
        error_code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        status: 'FAILED',
        error_code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken(user);

    return res.json({
      status: 'SUCCESS',
      message: 'Signed in successfully.',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        createdAt: user.createdAt,
        storageUsedBytes: user.storageUsedBytes,
        documentsProcessed: user.documentsProcessed,
        pagesProcessed: user.pagesProcessed,
        preferences: user.preferences,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'FAILED',
      error_code: 'SERVER_ERROR',
      message: err.message,
    });
  }
});

router.post('/auth/logout', (req: Request, res: Response) => {
  return res.json({
    status: 'SUCCESS',
    message: 'Logged out successfully.',
  });
});

router.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const stats = db.getUserStats(user.id);

  return res.json({
    status: 'SUCCESS',
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      createdAt: user.createdAt,
      storageUsedBytes: user.storageUsedBytes,
      documentsProcessed: stats.documentsCount,
      pagesProcessed: stats.pagesCount,
      preferences: user.preferences,
      stats,
    },
  });
});

router.put('/auth/profile', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { fullName, avatar, preferences } = req.body;

  const updates: Partial<User> = {};
  if (fullName) updates.fullName = fullName.trim();
  if (avatar) updates.avatar = avatar;
  if (preferences) updates.preferences = { ...user.preferences, ...preferences };

  const updated = db.updateUser(user.id, updates);
  return res.json({
    status: 'SUCCESS',
    user: updated,
  });
});

router.post('/auth/change-password', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'FAILED',
        error_code: 'VALIDATION_ERROR',
        message: 'Current password and new password are required.',
      });
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        status: 'FAILED',
        error_code: 'INVALID_PASSWORD',
        message: 'Current password is incorrect.',
      });
    }

    const newHash = await hashPassword(newPassword);
    db.updateUser(user.id, { passwordHash: newHash });

    return res.json({
      status: 'SUCCESS',
      message: 'Password changed successfully.',
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'FAILED',
      message: err.message,
    });
  }
});

/* ==========================================================================
   DOCUMENT MANAGEMENT & UPLOAD
   ========================================================================== */

router.post('/documents/upload', authMiddleware, upload.array('files', 10), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        status: 'FAILED',
        error_code: 'NO_FILES',
        message: 'Please select at least one document to upload.',
      });
    }

    const createdDocs: DocumentRecord[] = [];
    const createdJobs: ProcessingJob[] = [];

    for (const file of files) {
      const docId = 'doc_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const jobId = 'job_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      let docType = ext.toUpperCase();
      let isScanned = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'].includes(ext);

      const docRecord: DocumentRecord = {
        id: docId,
        user_id: user.id,
        filename: file.filename,
        original_name: file.originalname,
        mime_type: file.mimetype || 'application/octet-stream',
        file_size: file.size,
        file_path: file.path,
        document_type: docType,
        is_scanned: isScanned,
        page_count: 1,
        status: 'QUEUED',
        confidence_score: 0.0,
        confidence_rating: 'HIGH',
        processing_time_ms: 0,
        warnings_count: 0,
        blocks_count: 0,
        tables_count: 0,
        visuals_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const jobRecord: ProcessingJob = {
        job_id: jobId,
        document_id: docId,
        user_id: user.id,
        status: 'PENDING',
        progress: 0,
        current_stage: 'UNDERSTAND',
        message: 'Queued for layout decomposition and content routing...',
        started_at: new Date().toISOString(),
      };

      db.createDocument(docRecord);
      db.createJob(jobRecord);

      createdDocs.push(docRecord);
      createdJobs.push(jobRecord);

      // Trigger asynchronous background processing pipeline
      setTimeout(() => {
        ContentAwareRouter.processDocument(docId, jobId).catch(e => {
          console.error('Async processDocument error:', e);
        });
      }, 50);
    }

    return res.status(201).json({
      status: 'SUCCESS',
      message: `Uploaded ${createdDocs.length} file(s). Processing has commenced.`,
      documents: createdDocs,
      jobs: createdJobs,
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'FAILED',
      error_code: 'UPLOAD_ERROR',
      message: err.message,
    });
  }
});

router.get('/documents', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { search, type, status } = req.query;

  let docs = db.getDocumentsByUserId(user.id);

  if (search) {
    const q = String(search).toLowerCase();
    docs = docs.filter(d => 
      d.original_name.toLowerCase().includes(q) || 
      (d.summary && d.summary.toLowerCase().includes(q))
    );
  }

  if (type) {
    docs = docs.filter(d => d.document_type.toLowerCase() === String(type).toLowerCase());
  }

  if (status) {
    docs = docs.filter(d => d.status.toLowerCase() === String(status).toLowerCase());
  }

  return res.json({
    status: 'SUCCESS',
    documents: docs,
    total: docs.length,
  });
});

router.get('/documents/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const doc = db.getDocumentById(req.params.id, user.id);

  if (!doc) {
    return res.status(404).json({
      status: 'FAILED',
      error_code: 'NOT_FOUND',
      message: 'Document not found or you do not have permission to access it.',
    });
  }

  const pages = db.getPagesByDocumentId(doc.id);
  const job = db.getJobByDocumentId(doc.id);

  return res.json({
    status: 'SUCCESS',
    document: doc,
    pages,
    job,
  });
});

router.delete('/documents/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const success = db.deleteDocument(req.params.id, user.id);

  if (!success) {
    return res.status(404).json({
      status: 'FAILED',
      error_code: 'NOT_FOUND',
      message: 'Document not found or permission denied.',
    });
  }

  return res.json({
    status: 'SUCCESS',
    message: 'Document deleted successfully.',
  });
});

router.post('/documents/:id/process', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const doc = db.getDocumentById(req.params.id, user.id);

  if (!doc) {
    return res.status(404).json({ status: 'FAILED', message: 'Document not found' });
  }

  const jobId = 'job_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  const jobRecord: ProcessingJob = {
    job_id: jobId,
    document_id: doc.id,
    user_id: user.id,
    status: 'PENDING',
    progress: 0,
    current_stage: 'UNDERSTAND',
    message: 'Reprocessing document...',
    started_at: new Date().toISOString(),
  };

  db.createJob(jobRecord);
  db.updateDocument(doc.id, { status: 'PROCESSING' });

  setTimeout(() => {
    ContentAwareRouter.processDocument(doc.id, jobId).catch(console.error);
  }, 50);

  return res.json({
    status: 'SUCCESS',
    message: 'Reprocessing started.',
    job: jobRecord,
  });
});

router.get('/jobs/:job_id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const job = db.getJobById(req.params.job_id);
  if (!job) {
    return res.status(404).json({ status: 'FAILED', message: 'Job not found' });
  }

  return res.json({
    status: 'SUCCESS',
    job,
  });
});

router.get('/documents/:id/blocks', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const doc = db.getDocumentById(req.params.id, user.id);
  if (!doc) {
    return res.status(404).json({ status: 'FAILED', message: 'Document not found' });
  }

  const blocks = db.getBlocksByDocumentId(doc.id);
  return res.json({
    status: 'SUCCESS',
    blocks,
    total: blocks.length,
  });
});

router.get('/documents/:id/json', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const doc = db.getDocumentById(req.params.id, user.id);
  if (!doc) {
    return res.status(404).json({ status: 'FAILED', message: 'Document not found' });
  }

  const blocks = db.getBlocksByDocumentId(doc.id);
  const pages = db.getPagesByDocumentId(doc.id);

  const fullJson = doc.json_twin || {
    document_id: doc.id,
    filename: doc.original_name,
    metadata: {
      document_type: doc.document_type,
      is_scanned: doc.is_scanned,
      pages_count: doc.page_count,
      confidence_score: doc.confidence_score,
      confidence_rating: doc.confidence_rating,
    },
    pages,
    blocks,
  };

  if (req.query.download === 'true') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_name}-digital-twin.json"`);
  }

  return res.json(fullJson);
});

router.get('/documents/:id/markdown', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const doc = db.getDocumentById(req.params.id, user.id);
  if (!doc) {
    return res.status(404).json({ status: 'FAILED', message: 'Document not found' });
  }

  const md = doc.markdown_content || `# ${doc.original_name}\n\n*No markdown generated yet.*`;

  if (req.query.download === 'true') {
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_name}.md"`);
    return res.send(md);
  }

  return res.json({
    status: 'SUCCESS',
    markdown: md,
  });
});

router.get('/documents/:id/file', (req: Request, res: Response) => {
  const doc = db.getDocumentById(req.params.id);
  if (!doc || !fs.existsSync(doc.file_path)) {
    return res.status(404).send('File not found');
  }

  res.setHeader('Content-Type', doc.mime_type);
  const stream = fs.createReadStream(doc.file_path);
  stream.pipe(res);
});

router.get('/documents/:id/pages/:page', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const doc = db.getDocumentById(req.params.id, user.id);
  if (!doc) {
    return res.status(404).json({ status: 'FAILED', message: 'Document not found' });
  }

  const pageNum = parseInt(req.params.page, 10);
  const pages = db.getPagesByDocumentId(doc.id);
  const page = pages.find(p => p.page_number === pageNum);
  const blocks = db.getBlocksByDocumentId(doc.id).filter(b => b.page === pageNum);

  return res.json({
    status: 'SUCCESS',
    page,
    blocks,
  });
});

/* ==========================================================================
   GROUNDED Q&A
   ========================================================================== */

router.post('/documents/:id/ask', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        status: 'FAILED',
        error_code: 'EMPTY_QUESTION',
        message: 'Question cannot be empty.',
      });
    }

    const doc = db.getDocumentById(req.params.id, user.id);
    if (!doc) {
      return res.status(404).json({ status: 'FAILED', message: 'Document not found' });
    }

    const blocks = db.getBlocksByDocumentId(doc.id);
    if (blocks.length === 0) {
      return res.json({
        status: 'SUCCESS',
        answer: "I couldn't find sufficient evidence in this document because no blocks were successfully extracted.",
        citations: [],
      });
    }

    const qaResult = await VisionService.answerDocumentQuestion(question.trim(), doc.original_name, blocks);

    // Save Q&A to history
    db.addQA({
      id: 'qa_' + Math.random().toString(36).substring(2, 9),
      document_id: doc.id,
      user_id: user.id,
      question: question.trim(),
      answer: qaResult.answer,
      citations: qaResult.citations,
      created_at: new Date().toISOString(),
    });

    return res.json({
      status: 'SUCCESS',
      answer: qaResult.answer,
      citations: qaResult.citations,
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'FAILED',
      message: err.message,
    });
  }
});

router.get('/documents/:id/qa-history', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const doc = db.getDocumentById(req.params.id, user.id);
  if (!doc) {
    return res.status(404).json({ status: 'FAILED', message: 'Document not found' });
  }

  const history = db.getQAHistory(doc.id);
  return res.json({
    status: 'SUCCESS',
    history,
  });
});

/* ==========================================================================
   ANALYTICS ENDPOINT
   ========================================================================== */

router.get('/analytics', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const stats = db.getUserStats(user.id);
  const docs = db.getDocumentsByUserId(user.id);

  // Confidence distribution
  const highConf = docs.filter(d => d.confidence_score >= 0.85).length;
  const medConf = docs.filter(d => d.confidence_score >= 0.65 && d.confidence_score < 0.85).length;
  const lowConf = docs.filter(d => d.confidence_score < 0.65).length;

  // Format distribution
  const formatCounts: Record<string, number> = {};
  for (const d of docs) {
    formatCounts[d.document_type] = (formatCounts[d.document_type] || 0) + 1;
  }

  return res.json({
    status: 'SUCCESS',
    stats: {
      ...stats,
      confidenceDistribution: {
        high: highConf,
        medium: medConf,
        low: lowConf,
      },
      formatDistribution: formatCounts,
      costEstimate: (stats.pagesCount * 0.009).toFixed(3), // < $10 per 1000 pages
    },
  });
});

/* ==========================================================================
   DEMO DOCUMENT INITIALIZATION
   ========================================================================== */

router.post('/documents/demo', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const docId = 'demo_' + Math.random().toString(36).substring(2, 9);
  const jobId = 'job_demo_' + Math.random().toString(36).substring(2, 9);

  // Create real rich demo blocks showcasing:
  // - Handwritten AVL tree code
  // - Mathematical notation (Quantum state vector)
  // - High-confidence OCR title
  // - High-resolution experimental table
  // - Bloch Sphere visual diagram
  // - Ambiguous handwriting flagged with REVIEW ("Character ambiguity detected")
  const demoBlocks: SemanticBlock[] = [
    {
      block_id: 'blk_demo_h1',
      document_id: docId,
      page: 1,
      type: 'heading',
      content: 'CS-892: Advanced Data Structures & Quantum Derivations',
      bbox: [60, 50, 920, 110],
      reading_order: 1,
      confidence: 0.98,
      confidence_type: 'ocr',
      confidence_level: 'HIGH',
      extractor: 'tesseract_ocr',
      verification: 'VERIFIED',
      source: { page: 1, bbox: [60, 50, 920, 110] },
      warnings: [],
    },
    {
      block_id: 'blk_demo_p1',
      document_id: docId,
      page: 1,
      type: 'paragraph',
      content: 'Lecture Notes Section 4: Self-Balancing Binary Search Trees and State Space Rotations. We demonstrate rebalancing criteria following node insertions in log(n) depth.',
      bbox: [60, 125, 920, 210],
      reading_order: 2,
      confidence: 0.96,
      confidence_type: 'ocr',
      confidence_level: 'HIGH',
      extractor: 'tesseract_ocr',
      verification: 'VERIFIED',
      source: { page: 1, bbox: [60, 125, 920, 210] },
      warnings: [],
    },
    {
      block_id: 'blk_demo_code',
      document_id: docId,
      page: 1,
      type: 'code',
      content: `int getBalance(Node* N) {\n    if (N == NULL) return 0;\n    return height(N->left) - height(N->right);\n}\n\nNode* rotateRight(Node* y) {\n    Node* x = y->left;\n    y->left = x->right;\n    x->right = y;\n    return x;\n}`,
      bbox: [60, 225, 520, 480],
      reading_order: 3,
      confidence: 0.93,
      confidence_type: 'vision',
      confidence_level: 'HIGH',
      extractor: 'gemini_vision',
      verification: 'VERIFIED',
      source: { page: 1, bbox: [60, 225, 520, 480] },
      warnings: [],
    },
    {
      block_id: 'blk_demo_diag',
      document_id: docId,
      page: 1,
      type: 'diagram',
      content: 'AVL Rebalancing Rotation Schema: Left-Heavy subtree pivot [Node y] rotating right to pivot [Node x]. Balance factor restored to 0.',
      bbox: [540, 225, 920, 480],
      reading_order: 4,
      confidence: 0.89,
      confidence_type: 'vision',
      confidence_level: 'HIGH',
      extractor: 'gemini_vision',
      verification: 'VERIFIED',
      source: { page: 1, bbox: [540, 225, 920, 480] },
      warnings: [],
    },
    {
      block_id: 'blk_demo_eq',
      document_id: docId,
      page: 1,
      type: 'equation',
      content: '|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle, \\quad \\text{where } |\\alpha|^2 + |\\beta|^2 = 1',
      bbox: [60, 500, 920, 590],
      reading_order: 5,
      confidence: 0.94,
      confidence_type: 'vision',
      confidence_level: 'HIGH',
      extractor: 'gemini_vision',
      verification: 'VERIFIED',
      source: { page: 1, bbox: [60, 500, 920, 590] },
      warnings: [],
    },
    {
      block_id: 'blk_demo_table',
      document_id: docId,
      page: 1,
      type: 'table',
      content: '| Algorithm | Best Case | Average Case | Worst Case |\n|---|---|---|---|\n| AVL Tree Search | O(log n) | O(log n) | O(log n) |\n| AVL Insertion | O(log n) | O(log n) | O(log n) |\n| Unbalanced BST | O(1) | O(log n) | O(n) |',
      bbox: [60, 610, 920, 780],
      reading_order: 6,
      confidence: 0.97,
      confidence_type: 'parser',
      confidence_level: 'HIGH',
      extractor: 'table_engine',
      verification: 'VERIFIED',
      source: { page: 1, bbox: [60, 610, 920, 780] },
      warnings: [],
      table_data: {
        headers: ['Algorithm', 'Best Case', 'Average Case', 'Worst Case'],
        rows: [
          ['AVL Tree Search', 'O(log n)', 'O(log n)', 'O(log n)'],
          ['AVL Insertion', 'O(log n)', 'O(log n)', 'O(log n)'],
          ['Unbalanced BST', 'O(1)', 'O(log n)', 'O(n)'],
        ],
      },
    },
    {
      block_id: 'blk_demo_handwriting_review',
      document_id: docId,
      page: 1,
      type: 'handwriting',
      content: 'Note on margin: Check phase sign delta for Hadamard transform gate?! (Uncertain stroke overlap)',
      bbox: [60, 800, 920, 910],
      reading_order: 7,
      confidence: 0.58,
      confidence_type: 'vision',
      confidence_level: 'LOW',
      extractor: 'gemini_vision',
      verification: 'REVIEW',
      source: { page: 1, bbox: [60, 800, 920, 910] },
      warnings: [
        'Character ambiguity detected in cursive handwriting',
        'Uncertain stroke overlap on mathematical symbol',
      ],
    },
  ];

  const demoDoc: DocumentRecord = {
    id: docId,
    user_id: user.id,
    filename: 'demo_quantum_lecture_scanned.png',
    original_name: 'DEMO: Scanned Lecture Notes & AVL Tree Derivation.pdf',
    mime_type: 'image/png',
    file_size: 485120,
    file_path: '',
    document_type: 'SCANNED_MULTIMODAL',
    is_scanned: true,
    page_count: 1,
    status: 'REVIEW', // Because one block is marked REVIEW
    confidence_score: 0.89,
    confidence_rating: 'HIGH',
    processing_time_ms: 1240,
    warnings_count: 2,
    blocks_count: demoBlocks.length,
    tables_count: 1,
    visuals_count: 4,
    summary: 'DEMO DATA: Scanned multimodal document demonstrating OCR, handwritten C++ code, mathematical LaTeX equations, structured table extraction, and flagged marginal annotations.',
    markdown_content: `# DEMO: Scanned Lecture Notes & AVL Tree Derivation

---
*Page 1*

## CS-892: Advanced Data Structures & Quantum Derivations

Lecture Notes Section 4: Self-Balancing Binary Search Trees and State Space Rotations. We demonstrate rebalancing criteria following node insertions in log(n) depth.

\`\`\`cpp
int getBalance(Node* N) {
    if (N == NULL) return 0;
    return height(N->left) - height(N->right);
}

Node* rotateRight(Node* y) {
    Node* x = y->left;
    y->left = x->right;
    x->right = y;
    return x;
}
\`\`\`

> 📊 **[Diagram/Flow]**: AVL Rebalancing Rotation Schema: Left-Heavy subtree pivot [Node y] rotating right to pivot [Node x]. Balance factor restored to 0.

$$
|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle, \\quad \\text{where } |\\alpha|^2 + |\\beta|^2 = 1
$$

| Algorithm | Best Case | Average Case | Worst Case |
|---|---|---|---|
| AVL Tree Search | O(log n) | O(log n) | O(log n) |
| AVL Insertion | O(log n) | O(log n) | O(log n) |
| Unbalanced BST | O(1) | O(log n) | O(n) |

> ✍️ **[Handwritten]**: Note on margin: Check phase sign delta for Hadamard transform gate?! (Uncertain stroke overlap)
`,
    json_twin: {
      metadata: {
        document_id: docId,
        filename: 'DEMO: Scanned Lecture Notes & AVL Tree Derivation.pdf',
        document_type: 'SCANNED_MULTIMODAL',
        is_scanned: true,
        page_count: 1,
        processed_at: new Date().toISOString(),
        confidence_score: 0.89,
        confidence_rating: 'HIGH',
        demo_flag: true,
      },
      summary: 'DEMO DATA: Multimodal demonstration document.',
      blocks: demoBlocks,
      warnings: [
        {
          block_id: 'blk_demo_handwriting_review',
          page: 1,
          verification: 'REVIEW',
          confidence: 0.58,
          warnings: [
            'Character ambiguity detected in cursive handwriting',
            'Uncertain stroke overlap on mathematical symbol',
          ],
        },
      ],
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_demo: true,
  };

  db.createDocument(demoDoc);
  db.setBlocks(docId, demoBlocks);
  db.setPages(docId, [
    {
      id: `page_${docId}_1`,
      document_id: docId,
      page_number: 1,
      width: 1000,
      height: 1000,
      has_handwriting: true,
      has_tables: true,
      has_images: true,
      is_scanned: true,
      text_density: 'high',
      block_count: demoBlocks.length,
    },
  ]);

  return res.status(201).json({
    status: 'SUCCESS',
    message: 'Demo multimodal document loaded successfully.',
    document: demoDoc,
  });
});

export default router;
