import React, { useState } from 'react';
import { DocumentRecord, DocumentPage, SemanticBlock } from '../../types';
import { DocumentViewer } from '../viewer/DocumentViewer';
import { AskParseFlow } from '../qa/AskParseFlow';
import {
  FileText,
  Layers,
  Table as TableIcon,
  Sparkles,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  Download,
  Copy,
  Clock,
  ExternalLink,
  MessageSquare,
  Eye,
  ShieldCheck,
  Share2,
} from 'lucide-react';

interface DocumentResultsProps {
  document: DocumentRecord;
  pages: DocumentPage[];
  blocks: SemanticBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  onReprocess: () => void;
}

export type ResultTab =
  | 'viewer'
  | 'overview'
  | 'blocks'
  | 'tables'
  | 'visuals'
  | 'json'
  | 'markdown'
  | 'warnings'
  | 'qa';

export const DocumentResults: React.FC<DocumentResultsProps> = ({
  document,
  pages,
  blocks,
  selectedBlockId,
  onSelectBlock,
  onReprocess,
}) => {
  const [activeTab, setActiveTab] = useState<ResultTab>('viewer');
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const tables = blocks.filter(b => b.type === 'table');
  const visuals = blocks.filter(b => ['diagram', 'chart', 'figure', 'image', 'equation', 'handwriting'].includes(b.type));
  const warningsList = blocks.filter(b => b.warnings && b.warnings.length > 0);

  const handleCopyMarkdown = () => {
    if (document.markdown_content) {
      navigator.clipboard.writeText(document.markdown_content);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    }
  };

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(document.json_twin || { blocks }, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleJumpToCitation = (page: number, blockId: string) => {
    onSelectBlock(blockId);
    setActiveTab('viewer');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Document Title Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-cyan-400 font-semibold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
              {document.document_type}
            </span>
            {document.is_scanned && (
              <span className="font-mono text-[10px] text-amber-400 font-semibold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/40">
                SCANNED RASTER
              </span>
            )}
            {document.is_demo && (
              <span className="font-mono text-[10px] text-purple-400 font-semibold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/40">
                DEMO DATA
              </span>
            )}
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white truncate">
            {document.original_name}
          </h1>
          <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
            <span>{document.page_count} page(s)</span>
            <span>·</span>
            <span>{blocks.length} blocks extracted</span>
            <span>·</span>
            <span>Processed in {(document.processing_time_ms / 1000).toFixed(2)}s</span>
            <span>·</span>
            <span className={`font-semibold ${
              document.confidence_score >= 0.85
                ? 'text-emerald-400'
                : document.confidence_score >= 0.65
                ? 'text-amber-400'
                : 'text-red-400'
            }`}>
              {(document.confidence_score * 100).toFixed(0)}% {document.confidence_rating} Confidence
            </span>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/api/documents/${document.id}/json?download=true`}
            download
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </a>
          <a
            href={`/api/documents/${document.id}/markdown?download=true`}
            download
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download MD</span>
          </a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('viewer')}
          className={`flex items-center gap-2 py-2.5 px-3.5 rounded-xl font-semibold transition-all shrink-0 ${
            activeTab === 'viewer'
              ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Interactive Viewer & Provenance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 py-2.5 px-3.5 rounded-xl font-semibold transition-all shrink-0 ${
            activeTab === 'overview'
              ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('blocks')}
          className={`flex items-center gap-2 py-2.5 px-3.5 rounded-xl font-semibold transition-all shrink-0 ${
            activeTab === 'blocks'
              ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Semantic Blocks ({blocks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tables')}
          className={`flex items-center gap-2 py-2.5 px-3.5 rounded-xl font-semibold transition-all shrink-0 ${
            activeTab === 'tables'
              ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <TableIcon className="w-4 h-4" />
          <span>Tables ({tables.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('visuals')}
          className={`flex items-center gap-2 py-2.5 px-3.5 rounded-xl font-semibold transition-all shrink-0 ${
            activeTab === 'visuals'
              ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Visuals & Math ({visuals.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qa')}
          className={`flex items-center gap-2 py-2.5 px-3.5 rounded-xl font-semibold transition-all shrink-0 ${
            activeTab === 'qa'
              ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Ask ParseFlow</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('markdown')}
          className={`flex items-center gap-2 py-2.5 px-3.5 rounded-xl font-semibold transition-all shrink-0 ${
            activeTab === 'markdown'
              ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Markdown Reconstructed</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('json')}
          className={`flex items-center gap-2 py-2.5 px-3.5 rounded-xl font-semibold transition-all shrink-0 ${
            activeTab === 'json'
              ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Digital Twin JSON</span>
        </button>

        {warningsList.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('warnings')}
            className={`flex items-center gap-2 py-2.5 px-3.5 rounded-xl font-semibold transition-all shrink-0 ${
              activeTab === 'warnings'
                ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60 shadow-sm'
                : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-950/30'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Review Flags ({warningsList.length})</span>
          </button>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === 'viewer' && (
        <DocumentViewer
          document={document}
          pages={pages}
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          onSelectBlock={onSelectBlock}
        />
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs text-slate-400 font-medium">Pipeline Verification</span>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                {document.status === 'COMPLETED' ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <span>Verified</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                    <span>Review Advised</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Confidence: {(document.confidence_score * 100).toFixed(0)}% ({document.confidence_rating})
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs text-slate-400 font-medium">Decomposition Metrics</span>
              <div className="text-2xl font-bold text-cyan-400">
                {blocks.length} Blocks
              </div>
              <p className="text-xs text-slate-400">
                {tables.length} tables · {visuals.length} visual/handwriting regions
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs text-slate-400 font-medium">Processing Time</span>
              <div className="text-2xl font-bold text-white">
                {(document.processing_time_ms / 1000).toFixed(2)}s
              </div>
              <p className="text-xs text-slate-400">
                Local-first routing & Tesseract OCR pipeline
              </p>
            </div>
          </div>

          {/* Executive Summary */}
          {document.summary && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-2">
              <h3 className="text-sm font-semibold text-white">Executive Document Summary</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {document.summary}
              </p>
            </div>
          )}

          {/* Pipeline Stages Breakdown */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Extraction Pipeline Trace</h3>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-cyan-400 font-mono">01</span>
                <div className="font-semibold text-white mt-1">UNDERSTAND</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Format & Layout</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-cyan-400 font-mono">02</span>
                <div className="font-semibold text-white mt-1">ROUTE</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Content-Aware</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-cyan-400 font-mono">03</span>
                <div className="font-semibold text-white mt-1">EXTRACT</div>
                <div className="text-[10px] text-slate-500 mt-0.5">OCR / Vision</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-cyan-400 font-mono">04</span>
                <div className="font-semibold text-white mt-1">ASSEMBLE</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Reading Order</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-cyan-400 font-mono">05</span>
                <div className="font-semibold text-white mt-1">VERIFY</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Confidence Audit</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-cyan-400 font-mono">06</span>
                <div className="font-semibold text-white mt-1">TRACE</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Provenance Linked</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'blocks' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Extracted Semantic Blocks ({blocks.length})
            </h3>
            <span className="text-xs text-slate-400">Click any block to highlight its source region</span>
          </div>

          <div className="space-y-3">
            {blocks.map((b) => (
              <div
                key={b.block_id}
                onClick={() => {
                  onSelectBlock(b.block_id);
                  setActiveTab('viewer');
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                  selectedBlockId === b.block_id
                    ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-500/50'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-cyan-400 text-[11px]">
                      #{b.block_id}
                    </span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono uppercase">
                      {b.type}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Page {b.page} · Seq #{b.reading_order}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">
                      {(b.confidence * 100).toFixed(0)}%
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      b.verification === 'VERIFIED'
                        ? 'bg-emerald-950 text-emerald-300'
                        : 'bg-amber-950 text-amber-300'
                    }`}>
                      {b.verification}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap">
                  {b.content}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono text-[10px]">
                    Extractor: {b.extractor} · BBox: [{b.bbox.join(', ')}]
                  </span>
                  <span className="text-cyan-400 group-hover:underline flex items-center gap-1 text-[10px]">
                    <span>Inspect in Viewer</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'tables' && (
        <div className="space-y-6">
          {tables.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs bg-slate-900/80 border border-slate-800 rounded-xl">
              No structured tables detected in this document.
            </div>
          ) : (
            tables.map((tbl, i) => (
              <div key={tbl.block_id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Table {i + 1} (Page {tbl.page})</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Confidence: {(tbl.confidence * 100).toFixed(0)}% · Extracted via {tbl.extractor}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectBlock(tbl.block_id);
                      setActiveTab('viewer');
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <span>View Provenance</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {tbl.table_data ? (
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-300 font-semibold">
                          {tbl.table_data.headers.map((h, hIdx) => (
                            <th key={hIdx} className="py-2.5 px-3.5 border-r border-slate-800/80 last:border-r-0">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {tbl.table_data.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-800/50">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="py-2 px-3.5 border-r border-slate-800/80 last:border-r-0 text-slate-200">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950 rounded-xl font-mono text-xs text-slate-300 whitespace-pre-wrap">
                    {tbl.content}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'visuals' && (
        <div className="space-y-6">
          {visuals.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs bg-slate-900/80 border border-slate-800 rounded-xl">
              No visual diagrams, equations, or handwriting detected.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visuals.map((vis) => (
                <div key={vis.block_id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-mono font-semibold uppercase text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded">
                        {vis.type}
                      </span>
                      <span className="text-slate-500">Page {vis.page}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap">
                      {vis.content}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Confidence: {(vis.confidence * 100).toFixed(0)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectBlock(vis.block_id);
                        setActiveTab('viewer');
                      }}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <span>Highlight Region</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'qa' && (
        <AskParseFlow
          document={document}
          onJumpToCitation={handleJumpToCitation}
        />
      )}

      {activeTab === 'markdown' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Reconstructed Markdown</h3>
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedMd ? 'Copied' : 'Copy Markdown'}</span>
            </button>
          </div>
          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[600px]">
            {document.markdown_content || '# No markdown generated yet.'}
          </pre>
        </div>
      )}

      {activeTab === 'json' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Digital Twin Canonical JSON</h3>
            <button
              type="button"
              onClick={handleCopyJson}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>
          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-cyan-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[600px]">
            {JSON.stringify(document.json_twin || { blocks }, null, 2)}
          </pre>
        </div>
      )}

      {activeTab === 'warnings' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Ambiguous Regions Flagged for Human Review</span>
            </h3>
            <span className="text-xs text-slate-400">Zero-hallucination guardrail active</span>
          </div>

          <div className="space-y-3">
            {warningsList.map((wb) => (
              <div
                key={wb.block_id}
                onClick={() => {
                  onSelectBlock(wb.block_id);
                  setActiveTab('viewer');
                }}
                className="p-4 bg-slate-950 rounded-xl border border-amber-900/50 hover:border-amber-600 transition-colors cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-amber-300 font-bold">
                    Block #{wb.block_id} · Page {wb.page}
                  </span>
                  <span className="font-mono text-amber-400">
                    Confidence: {(wb.confidence * 100).toFixed(0)}% ({wb.verification})
                  </span>
                </div>
                <div className="text-xs text-slate-300 italic">
                  "{wb.content}"
                </div>
                <div className="pt-2 border-t border-slate-900 space-y-1">
                  {wb.warnings?.map((warn, wIdx) => (
                    <div key={wIdx} className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
                      <span>•</span>
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
