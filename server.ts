import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import apiRouter from './server/api.js';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function createServer() {
  const app = express();

  // Basic middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Mount API router
  app.use('/api', apiRouter);

  // API Documentation endpoint
  app.get('/api-info', (req, res) => {
    res.json({
      name: 'ParseFlow API',
      tagline: 'Evidence-preserving document intelligence',
      version: '1.0.0',
      endpoints: [
        'POST /api/auth/signup',
        'POST /api/auth/login',
        'POST /api/auth/logout',
        'GET /api/auth/me',
        'PUT /api/auth/profile',
        'POST /api/documents/upload',
        'GET /api/documents',
        'GET /api/documents/:id',
        'DELETE /api/documents/:id',
        'POST /api/documents/:id/process',
        'GET /api/jobs/:job_id',
        'GET /api/documents/:id/blocks',
        'GET /api/documents/:id/json',
        'GET /api/documents/:id/markdown',
        'POST /api/documents/:id/ask',
        'POST /api/documents/demo',
        'GET /api/analytics',
      ],
    });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ParseFlow] Server running on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch(err => {
  console.error('[ParseFlow] Fatal server startup error:', err);
  process.exit(1);
});
