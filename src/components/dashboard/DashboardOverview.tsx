import React, { useState, useEffect } from 'react';
import { DocumentRecord, ProcessingJob, UserStats } from '../../types';
import { api } from '../../services/api';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  Layers,
  Sparkles,
  RefreshCw,
  Trash2,
  Download,
  Eye,
  FileCode,
} from 'lucide-react';

interface DashboardOverviewProps {
  onOpenUpload: () => void;
  onOpenDocument: (doc: DocumentRecord) => void;
  onTriggerDemo: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onOpenUpload,
  onOpenDocument,
  onTriggerDemo,
}) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeJobs, setActiveJobs] = useState<ProcessingJob[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [docsRes, analyticsRes] = await Promise.all([
        api.getDocuments(),
        api.getAnalytics().catch(() => ({ stats: null })),
      ]);
      setDocuments(docsRes.documents);
      if (analyticsRes.stats) setStats(analyticsRes.stats);

      // Check for active processing jobs
      const runningDocs = docsRes.documents.filter(d => d.status === 'PROCESSING' || d.status === 'QUEUED');
      if (runningDocs.length > 0) {
        const jobs = await Promise.all(
          runningDocs.map(d => api.getDocument(d.id).then(r => r.job).catch(() => null))
        );
        setActiveJobs(jobs.filter(Boolean) as ProcessingJob[]);
      } else {
        setActiveJobs([]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll active jobs if any running
    const interval = setInterval(() => {
      if (activeJobs.length > 0 || documents.some(d => d.status === 'PROCESSING' || d.status === 'QUEUED')) {
        fetchData();
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeJobs.length]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.deleteDocument(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const handleReprocess = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.reprocessDocument(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Reprocess failed');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Stat calculations
  const totalDocs = stats?.documentsCount ?? documents.length;
  const totalPages = stats?.pagesCount ?? documents.reduce((acc, d) => acc + (d.page_count || 1), 0);
  const verifiedCount = stats?.verifiedCount ?? documents.filter(d => d.status === 'COMPLETED' && d.confidence_score >= 0.85).length;
  const reviewCount = stats?.reviewCount ?? documents.filter(d => d.status === 'REVIEW' || (d.warnings_count > 0 && d.status === 'COMPLETED')).length;
  const failedCount = stats?.failedCount ?? documents.filter(d => d.status === 'FAILED').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-cyan-950/30 border border-slate-800/90 p-6 sm:p-8 overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-cyan-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Universal Document Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Turn complex documents into verified evidence.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Extract digital & scanned PDFs, handwriting, diagrams, equations, and tables while strictly preserving bounding-box coordinates for zero-hallucination audits.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenUpload}
              className="py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950/50 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
            <button
              type="button"
              onClick={onTriggerDemo}
              className="py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-cyan-300 border border-cyan-800/40 hover:border-cyan-600/70 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Load Scanned Demo Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Documents Processed</span>
            <FileText className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{totalDocs}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Total across library</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Pages Decoded</span>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-cyan-400">{totalPages}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">High-res parsed</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Verified Extractions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400">{verifiedCount}</div>
            <div className="text-[11px] text-emerald-500/80 mt-0.5">High confidence &ge; 85%</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Needs Review</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-400">{reviewCount}</div>
            <div className="text-[11px] text-amber-500/80 mt-0.5">Ambiguities flagged</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Failed Documents</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-red-400">{failedCount}</div>
            <div className="text-[11px] text-red-500/80 mt-0.5">Clean error boundaries</div>
          </div>
        </div>
      </div>

      {/* Active Processing Jobs (if any) */}
      {activeJobs.length > 0 && (
        <div className="bg-slate-900/90 border border-cyan-800/40 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>Active Processing Jobs ({activeJobs.length})</span>
            </div>
            <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
              Live Pipeline
            </span>
          </div>

          <div className="space-y-2">
            {activeJobs.map((job) => (
              <div
                key={job.job_id}
                className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{job.message}</span>
                  <span className="font-mono text-cyan-400 font-semibold">{job.progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                  <span>Stage: {job.current_stage}</span>
                  <span>·</span>
                  <span>Status: {job.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Documents Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Recent Documents</h2>
            <p className="text-xs text-slate-400">
              {documents.length} document(s) in your private encrypted workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Refresh list"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onOpenUpload}
              className="py-1.5 px-3 bg-cyan-600/90 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Process New</span>
            </button>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-medium text-white">No documents uploaded yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Upload a scanned PDF, document, or spreadsheet to begin semantic extraction with provenance tracking.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={onOpenUpload}
                className="py-2 px-4 rounded-xl bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-500 transition-colors"
              >
                Upload First File
              </button>
              <button
                type="button"
                onClick={onTriggerDemo}
                className="py-2 px-4 rounded-xl bg-slate-800 text-cyan-300 border border-cyan-800/40 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Load Demo File
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-medium">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Pages</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Confidence</th>
                  <th className="py-3 px-3">Blocks</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {documents.map((doc) => {
                  const isVerified = doc.status === 'COMPLETED' && doc.confidence_score >= 0.85;
                  const isReview = doc.status === 'REVIEW' || (doc.warnings_count > 0 && doc.status === 'COMPLETED');
                  const isFailed = doc.status === 'FAILED';
                  const isProcessing = doc.status === 'PROCESSING' || doc.status === 'QUEUED';

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => onOpenDocument(doc)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/70 flex items-center justify-center shrink-0 text-slate-300">
                            {doc.is_scanned ? (
                              <Layers className="w-3.5 h-3.5 text-cyan-400" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-white group-hover:text-cyan-300 transition-colors">
                              {doc.original_name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>·</span>
                              <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                              {doc.is_demo && (
                                <span className="text-[10px] bg-cyan-950 text-cyan-400 px-1.5 rounded">DEMO</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-[11px] text-slate-300">
                          {doc.document_type}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-300 font-medium">
                        {doc.page_count}
                      </td>

                      <td className="py-3 px-3">
                        {isProcessing && (
                          <span className="inline-flex items-center gap-1.5 text-cyan-400 font-medium text-[11px]">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Processing</span>
                          </span>
                        )}
                        {isVerified && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        )}
                        {isReview && !isProcessing && (
                          <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Review ({doc.warnings_count})</span>
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1.5 text-red-400 font-medium text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Failed</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {doc.confidence_score > 0 ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono font-semibold ${
                                doc.confidence_score >= 0.85
                                  ? 'text-emerald-400'
                                  : doc.confidence_score >= 0.65
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {(doc.confidence_score * 100).toFixed(0)}%
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase">
                              {doc.confidence_rating}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-300 font-mono">
                        {doc.blocks_count || 0}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onOpenDocument(doc)}
                            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Inspect in Viewer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleReprocess(doc.id, e)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            title="Reprocess Document"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <a
                            href={`/api/documents/${doc.id}/json?download=true`}
                            download
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            title="Download JSON Digital Twin"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(doc.id, e)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
