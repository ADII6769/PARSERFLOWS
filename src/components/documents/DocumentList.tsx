import React, { useState, useEffect } from 'react';
import { DocumentRecord } from '../../types';
import { api } from '../../services/api';
import {
  FileText,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Eye,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
} from 'lucide-react';

interface DocumentListProps {
  onOpenDocument: (doc: DocumentRecord) => void;
  onOpenUpload: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  onOpenDocument,
  onOpenUpload,
}) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchDocs = async () => {
    try {
      const res = await api.getDocuments({
        search: search.trim() || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setDocuments(res.documents);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [search, typeFilter, statusFilter]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this document?')) return;
    try {
      await api.deleteDocument(id);
      fetchDocs();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Document Repository
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Decoded digital assets, scanned image pages, and structured extractions.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenUpload}
          className="py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Ingest New Document</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by filename or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All File Types</option>
            <option value="PDF">PDF</option>
            <option value="SCANNED_MULTIMODAL">Scanned Multimodal</option>
            <option value="SPREADSHEET">Spreadsheets</option>
            <option value="CSV">CSV</option>
            <option value="DOCX">Word DOCX</option>
            <option value="TXT">Plain Text / Code</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="REVIEW">Needs Review</option>
            <option value="PROCESSING">Processing</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Document Grid / Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {documents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-3">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <p>No documents match the filter criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onOpenDocument(doc)}
                className="p-4 hover:bg-slate-800/40 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0 text-slate-300">
                    {doc.is_scanned ? (
                      <Layers className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <FileText className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white text-xs group-hover:text-cyan-300 transition-colors truncate max-w-lg">
                      {doc.original_name}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-cyan-400/90">{doc.document_type}</span>
                      <span>·</span>
                      <span>{doc.page_count} page(s)</span>
                      <span>·</span>
                      <span>{doc.blocks_count} blocks</span>
                      <span>·</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-xs">
                  <div>
                    <span className={`font-mono font-semibold ${
                      doc.confidence_score >= 0.85
                        ? 'text-emerald-400'
                        : doc.confidence_score >= 0.65
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}>
                      {(doc.confidence_score * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase ml-1">
                      {doc.confidence_rating}
                    </span>
                  </div>

                  <div>
                    {doc.status === 'COMPLETED' && (
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded text-[10px] font-semibold">
                        Verified
                      </span>
                    )}
                    {doc.status === 'REVIEW' && (
                      <span className="px-2 py-0.5 bg-amber-950 text-amber-300 rounded text-[10px] font-semibold">
                        Review ({doc.warnings_count})
                      </span>
                    )}
                    {doc.status === 'PROCESSING' && (
                      <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 rounded text-[10px] font-semibold animate-pulse">
                        Processing
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onOpenDocument(doc)}
                      className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800"
                      title="Inspect"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <a
                      href={`/api/documents/${doc.id}/json?download=true`}
                      download
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                      title="Download JSON"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(doc.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
