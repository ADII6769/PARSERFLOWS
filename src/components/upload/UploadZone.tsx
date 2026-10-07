import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import { DocumentRecord, ProcessingJob } from '../../types';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Layers,
  Sparkles,
  FileCode,
  Table as TableIcon,
} from 'lucide-react';

interface UploadZoneProps {
  onUploadSuccess: (createdDocs: DocumentRecord[]) => void;
  onTriggerDemo: () => void;
}

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error?: string;
}

const SUPPORTED_FORMATS = [
  'PDF', 'Scanned PDF', 'PNG', 'JPG', 'JPEG', 'WEBP', 'BMP', 'TIFF',
  'DOC', 'DOCX', 'XLS', 'XLSX', 'CSV', 'TSV', 'PPT', 'PPTX',
  'TXT', 'MD', 'JSON', 'XML', 'HTML', 'RTF', 'ODT', 'ODS',
  'YAML', 'TEX', 'IPYNB'
];

export const UploadZone: React.FC<UploadZoneProps> = ({
  onUploadSuccess,
  onTriggerDemo,
}) => {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFilesToQueue = (files: FileList | File[]) => {
    setErrorBanner(null);
    const newItems: QueuedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file: f,
        name: f.name,
        size: f.size,
        type: f.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
        status: 'PENDING',
      });
    }
    setQueue(prev => [...prev, ...newItems]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
  };

  const removeQueueItem = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleStartUpload = async () => {
    if (queue.length === 0) return;
    setIsUploading(true);
    setErrorBanner(null);

    try {
      const filesToUpload = queue.map(q => q.file);
      setQueue(prev => prev.map(q => ({ ...q, status: 'UPLOADING' })));

      const res = await api.uploadFiles(filesToUpload);

      setQueue(prev => prev.map(q => ({ ...q, status: 'COMPLETED' })));
      onUploadSuccess(res.documents);
    } catch (err: any) {
      setErrorBanner(err.message || 'Upload processing failed.');
      setQueue(prev => prev.map(q => ({ ...q, status: 'FAILED', error: err.message })));
    } finally {
      setIsUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title & Introduction */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Document Ingestion & Analysis
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Upload any file format. ParseFlow detects digital layout, scans for OCR, isolates handwriting, and extracts structured tables.
        </p>
      </div>

      {errorBanner && (
        <div className="p-3.5 bg-red-950/40 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Main Drag & Drop Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/20 scale-[0.99]'
            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center mx-auto text-cyan-400 shadow-md">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-white">
              Drop documents here or click to browse
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports single or batch processing up to 50MB per file.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-slate-400 max-w-lg mx-auto">
            {SUPPORTED_FORMATS.slice(0, 16).map(fmt => (
              <span key={fmt} className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {fmt}
              </span>
            ))}
            <span className="text-slate-500">+11 more</span>
          </div>
        </div>
      </div>

      {/* Action Strip: Demo shortcut */}
      <div className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Need a test file right now?</span>
        </div>
        <button
          type="button"
          onClick={onTriggerDemo}
          className="py-1.5 px-3 rounded-lg bg-cyan-950 border border-cyan-800/60 text-cyan-300 hover:bg-cyan-900/50 text-xs font-medium transition-colors"
        >
          Load Scanned Lecture Demo
        </button>
      </div>

      {/* Upload Queue */}
      {queue.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Upload Staging Queue ({queue.length} file{queue.length > 1 ? 's' : ''})
            </h3>
            <button
              type="button"
              onClick={() => setQueue([])}
              disabled={isUploading}
              className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50"
            >
              Clear Queue
            </button>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto">
            {queue.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-300">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate max-w-md">{item.name}</div>
                    <div className="text-[11px] text-slate-500">
                      <span>{formatSize(item.size)}</span>
                      <span className="mx-1">·</span>
                      <span className="font-mono">{item.type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {item.status === 'PENDING' && (
                    <span className="text-slate-400">Ready</span>
                  )}
                  {item.status === 'UPLOADING' && (
                    <span className="text-cyan-400 font-medium animate-pulse">Uploading & Routing...</span>
                  )}
                  {item.status === 'COMPLETED' && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ingested</span>
                    </span>
                  )}
                  {item.status === 'FAILED' && (
                    <span className="text-red-400 font-medium">Failed</span>
                  )}

                  {!isUploading && item.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => removeQueueItem(item.id)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleStartUpload}
              disabled={isUploading || queue.length === 0}
              className="py-2.5 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Processing Extraction Pipeline...</span>
                </>
              ) : (
                <>
                  <span>COMMENCE INGESTION</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
