import React, { useState } from 'react';
import { BookOpen, Copy, Check, Send, Code2, Globe } from 'lucide-react';

interface EndpointDoc {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  authRequired: boolean;
  requestBody?: string;
  responseBody?: string;
}

const ENDPOINTS: EndpointDoc[] = [
  {
    method: 'POST',
    path: '/api/auth/signup',
    description: 'Register a new user account with hashed password.',
    authRequired: false,
    requestBody: `{\n  "email": "user@example.com",\n  "password": "secure_password",\n  "fullName": "Jane Doe"\n}`,
    responseBody: `{\n  "status": "SUCCESS",\n  "token": "jwt_token_string",\n  "user": { ... }\n}`,
  },
  {
    method: 'POST',
    path: '/api/auth/login',
    description: 'Authenticate user credentials and receive JWT access token.',
    authRequired: false,
    requestBody: `{\n  "email": "user@example.com",\n  "password": "secure_password"\n}`,
    responseBody: `{\n  "status": "SUCCESS",\n  "token": "jwt_token_string",\n  "user": { ... }\n}`,
  },
  {
    method: 'GET',
    path: '/api/auth/me',
    description: 'Retrieve current authenticated user profile and metrics.',
    authRequired: true,
    responseBody: `{\n  "status": "SUCCESS",\n  "user": { "id": "...", "email": "...", "stats": { ... } }\n}`,
  },
  {
    method: 'POST',
    path: '/api/documents/upload',
    description: 'Multipart upload of documents (PDF, Scanned Image, DOCX, XLSX, etc.).',
    authRequired: true,
    requestBody: `FormData: "files" = [File, File, ...]`,
    responseBody: `{\n  "status": "SUCCESS",\n  "documents": [{ "id": "...", "status": "QUEUED" }],\n  "jobs": [{ "job_id": "...", "current_stage": "UNDERSTAND" }]\n}`,
  },
  {
    method: 'GET',
    path: '/api/documents',
    description: 'List all documents belonging to the authenticated user.',
    authRequired: true,
    responseBody: `{\n  "status": "SUCCESS",\n  "documents": [...],\n  "total": 12\n}`,
  },
  {
    method: 'GET',
    path: '/api/documents/:id',
    description: 'Get document metadata, pages list, and processing job status.',
    authRequired: true,
    responseBody: `{\n  "status": "SUCCESS",\n  "document": { ... },\n  "pages": [ ... ]\n}`,
  },
  {
    method: 'GET',
    path: '/api/documents/:id/blocks',
    description: 'Retrieve all semantic blocks sorted in reading order with bounding box provenance.',
    authRequired: true,
    responseBody: `{\n  "status": "SUCCESS",\n  "blocks": [\n    {\n      "block_id": "blk_1",\n      "type": "heading",\n      "content": "...",\n      "page": 1,\n      "bbox": [60, 50, 920, 110],\n      "confidence": 0.98,\n      "verification": "VERIFIED"\n    }\n  ]\n}`,
  },
  {
    method: 'GET',
    path: '/api/documents/:id/json',
    description: 'Download or inspect the canonical Digital Twin document schema.',
    authRequired: true,
    responseBody: `{\n  "metadata": { ... },\n  "summary": "...",\n  "pages": [ ... ],\n  "blocks": [ ... ],\n  "warnings": [ ... ]\n}`,
  },
  {
    method: 'GET',
    path: '/api/documents/:id/markdown',
    description: 'Get clean reconstructed Markdown preserving tables and block hierarchy.',
    authRequired: true,
    responseBody: `{\n  "status": "SUCCESS",\n  "markdown": "# Document Title\\n\\n..."\n}`,
  },
  {
    method: 'POST',
    path: '/api/documents/:id/ask',
    description: 'Execute grounded question answering with strict bounding-box citations.',
    authRequired: true,
    requestBody: `{\n  "question": "What was the worst case complexity of AVL insertion?"\n}`,
    responseBody: `{\n  "status": "SUCCESS",\n  "answer": "Based on Page 1 Block blk_demo_table...",\n  "citations": [\n    { "page": 1, "block_id": "blk_demo_table", "snippet": "..." }\n  ]\n}`,
  },
  {
    method: 'POST',
    path: '/api/documents/demo',
    description: 'Instantiate multimodal scanned demo document with handwriting & equations.',
    authRequired: true,
    responseBody: `{\n  "status": "SUCCESS",\n  "document": { ... }\n}`,
  },
];

export const ApiDocsView: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDoc>(ENDPOINTS[3]);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyCurl = () => {
    const curl = `curl -X ${selectedEndpoint.method} "http://localhost:3000${selectedEndpoint.path}" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json"`;
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 text-xs font-semibold mb-2">
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>OpenAPI / REST Interface</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          ParseFlow Engine REST API Reference
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Integrate ParseFlow directly into your data pipelines, compliance systems, or LLM indexing workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Endpoint List */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2 max-h-[700px] overflow-y-auto">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
            Available Endpoints
          </div>
          {ENDPOINTS.map((ep, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedEndpoint(ep)}
              className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between group ${
                selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method
                  ? 'border-cyan-500 bg-cyan-950/40'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 font-mono">
                  <span
                    className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${
                      ep.method === 'GET'
                        ? 'bg-blue-950 text-blue-400'
                        : ep.method === 'POST'
                        ? 'bg-emerald-950 text-emerald-400'
                        : ep.method === 'PUT'
                        ? 'bg-amber-950 text-amber-400'
                        : 'bg-red-950 text-red-400'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-semibold text-white truncate">{ep.path}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-1">
                  {ep.description}
                </div>
              </div>

              {ep.authRequired && (
                <span className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded shrink-0">
                  JWT
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Endpoint Details */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono">
              <span
                className={`font-bold text-xs px-2 py-0.5 rounded ${
                  selectedEndpoint.method === 'GET'
                    ? 'bg-blue-950 text-blue-400'
                    : selectedEndpoint.method === 'POST'
                    ? 'bg-emerald-950 text-emerald-400'
                    : 'bg-amber-950 text-amber-400'
                }`}
              >
                {selectedEndpoint.method}
              </span>
              <span className="text-base font-bold text-white">{selectedEndpoint.path}</span>
            </div>

            <button
              type="button"
              onClick={handleCopyCurl}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy cURL'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {selectedEndpoint.description}
          </p>

          {/* Auth requirement */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
            <span className="text-slate-400">Authentication</span>
            <span className="font-mono text-cyan-400">
              {selectedEndpoint.authRequired ? 'Bearer <JWT_TOKEN>' : 'Public'}
            </span>
          </div>

          {/* Request payload */}
          {selectedEndpoint.requestBody && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300">Request Schema / Payload</span>
              <pre className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 font-mono text-xs overflow-x-auto">
                {selectedEndpoint.requestBody}
              </pre>
            </div>
          )}

          {/* Response payload */}
          {selectedEndpoint.responseBody && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300">Sample Response 200 OK</span>
              <pre className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-cyan-300 font-mono text-xs overflow-x-auto max-h-64">
                {selectedEndpoint.responseBody}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
