import React, { useState, useEffect, useRef } from 'react';
import { DocumentRecord, DocumentPage, SemanticBlock } from '../../types';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  ShieldCheck,
} from 'lucide-react';

interface DocumentViewerProps {
  document: DocumentRecord;
  pages: DocumentPage[];
  blocks: SemanticBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  pages,
  blocks,
  selectedBlockId,
  onSelectBlock,
}) => {
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // If a block is selected from another tab or inspector, ensure viewer navigates to its page
  useEffect(() => {
    if (selectedBlockId) {
      const targetBlock = blocks.find(b => b.block_id === selectedBlockId);
      if (targetBlock && targetBlock.page !== currentPageNum) {
        setCurrentPageNum(targetBlock.page);
      }
    }
  }, [selectedBlockId]);

  const activePage = pages.find(p => p.page_number === currentPageNum) || {
    id: `p_${currentPageNum}`,
    document_id: document.id,
    page_number: currentPageNum,
    width: 1000,
    height: 1000,
    has_handwriting: false,
    has_tables: false,
    has_images: false,
    is_scanned: document.is_scanned,
    text_density: 'medium',
    block_count: blocks.filter(b => b.page === currentPageNum).length,
  };

  const pageBlocks = blocks.filter(b => b.page === currentPageNum);
  const selectedBlock = blocks.find(b => b.block_id === selectedBlockId);

  const handleCopyContent = () => {
    if (selectedBlock?.content) {
      navigator.clipboard.writeText(selectedBlock.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* 1. Left Thumbnail Sidebar */}
      <div className="w-48 bg-slate-950/90 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Pages ({Math.max(1, pages.length)})
          </span>
          <span className="text-[10px] text-cyan-400 font-mono">
            P.{currentPageNum}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {Array.from({ length: Math.max(1, pages.length) }, (_, i) => i + 1).map((pNum) => {
            const isCurrent = pNum === currentPageNum;
            const pBlockCount = blocks.filter(b => b.page === pNum).length;

            return (
              <button
                key={pNum}
                type="button"
                onClick={() => setCurrentPageNum(pNum)}
                className={`w-full text-left rounded-xl p-2.5 border transition-all ${
                  isCurrent
                    ? 'border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-500/50'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                {/* Simulated page preview thumbnail */}
                <div className="aspect-[3/4] bg-slate-950 rounded-lg border border-slate-800/80 p-2 relative overflow-hidden flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="h-1.5 w-3/4 bg-slate-700 rounded-full" />
                    <div className="h-1 w-full bg-slate-800 rounded-full" />
                    <div className="h-1 w-5/6 bg-slate-800 rounded-full" />
                    <div className="h-1 w-4/6 bg-slate-800 rounded-full" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-1 w-full bg-slate-800 rounded-full" />
                    <div className="h-1 w-3/4 bg-slate-850 rounded-full" />
                  </div>
                  <div className="absolute top-1.5 right-1.5 text-[9px] font-mono text-slate-400 bg-slate-900/80 px-1 rounded">
                    {pNum}
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className={`font-semibold ${isCurrent ? 'text-cyan-400' : 'text-slate-300'}`}>
                    Page {pNum}
                  </span>
                  <span className="text-slate-500 text-[10px]">{pBlockCount} blk</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Center Document Canvas & Bounding Box Overlay */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950/70 relative">
        {/* Top Canvas Controls */}
        <div className="h-12 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
            <span className="font-semibold text-white truncate max-w-xs">{document.original_name}</span>
            <span>·</span>
            <span className="text-slate-400">Page {currentPageNum} of {Math.max(1, pages.length)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPageNum(Math.max(1, currentPageNum - 1))}
              disabled={currentPageNum <= 1}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-30"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPageNum(Math.min(pages.length || 1, currentPageNum + 1))}
              disabled={currentPageNum >= (pages.length || 1)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-30"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.15))}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(2.0, prev + 0.15))}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Center Canvas */}
        <div
          ref={canvasContainerRef}
          className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-950/40 relative"
        >
          {/* Document Sheet Simulation */}
          <div
            className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl relative transition-transform duration-150 origin-top overflow-hidden"
            style={{
              width: '800px',
              minHeight: '1050px',
              transform: `scale(${zoomLevel})`,
            }}
          >
            {/* Visual sheet background / scan texture */}
            <div className="absolute inset-0 bg-slate-900/90 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

            {/* Document Header representation */}
            <div className="p-8 border-b border-slate-800/80 relative z-0 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-mono tracking-wider text-cyan-400">
                  {document.document_type} · SOURCE RASTER PROVENANCE
                </div>
                <div className="text-base font-bold text-white mt-1">
                  {document.original_name}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-500">
                  PAGE 0{currentPageNum}
                </span>
              </div>
            </div>

            {/* Interactive Bounding Box Overlays */}
            <div className="relative w-full h-[950px] p-6 z-10">
              {pageBlocks.map((b) => {
                const [x1, y1, x2, y2] = b.bbox;
                // Normalize coordinates (0 to 1000) to relative percentages
                const left = `${Math.max(2, Math.min(95, x1 / 10))}%`;
                const top = `${Math.max(2, Math.min(90, y1 / 10))}%`;
                const width = `${Math.max(10, Math.min(96, (x2 - x1) / 10))}%`;
                const height = `${Math.max(5, Math.min(80, (y2 - y1) / 10))}%`;

                const isSelected = selectedBlockId === b.block_id;
                const isReview = b.verification === 'REVIEW';
                const isFailed = b.verification === 'FAILED';

                return (
                  <div
                    key={b.block_id}
                    onClick={() => onSelectBlock(b.block_id)}
                    className={`absolute rounded-lg p-2.5 cursor-pointer transition-all border group ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/60 ring-2 ring-cyan-400/40 z-30 shadow-lg shadow-cyan-950'
                        : isFailed
                        ? 'border-red-600/60 bg-red-950/20 hover:border-red-500 z-10'
                        : isReview
                        ? 'border-amber-500/60 bg-amber-950/20 hover:border-amber-400 z-10'
                        : 'border-slate-700/60 bg-slate-950/30 hover:border-cyan-500/60 hover:bg-slate-900/60 z-10'
                    }`}
                    style={{ left, top, width, height }}
                  >
                    {/* Bounding Box Label Badge */}
                    <div className="flex items-center justify-between text-[10px] font-mono leading-none mb-1 select-none">
                      <span className={`font-semibold uppercase tracking-wider ${
                        isSelected ? 'text-cyan-300' : isReview ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                        {b.type} · {b.extractor}
                      </span>
                      <span className={`px-1 py-0.5 rounded text-[9px] ${
                        b.confidence >= 0.85
                          ? 'bg-emerald-950/80 text-emerald-300'
                          : b.confidence >= 0.65
                          ? 'bg-amber-950/80 text-amber-300'
                          : 'bg-red-950/80 text-red-300'
                      }`}>
                        {(b.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    {/* Content snippet within region */}
                    <div className="text-xs text-slate-200 line-clamp-3 font-sans leading-relaxed select-none">
                      {b.content}
                    </div>

                    {/* Active highlight corner pin */}
                    {isSelected && (
                      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-cyan-400 rounded-full ring-2 ring-slate-950" />
                    )}
                  </div>
                );
              })}

              {pageBlocks.length === 0 && (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No semantic blocks registered on Page {currentPageNum}.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Right Inspector Panel */}
      <div className="w-80 bg-slate-950/95 border-l border-slate-800 flex flex-col shrink-0">
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Provenance Inspector
            </span>
          </div>
          {selectedBlock && (
            <span className="text-[10px] font-mono text-cyan-400">
              #{selectedBlock.block_id}
            </span>
          )}
        </div>

        {selectedBlock ? (
          <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
            {/* Verification Status Banner */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              selectedBlock.verification === 'VERIFIED'
                ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                : selectedBlock.verification === 'REVIEW'
                ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                : 'bg-red-950/30 border-red-800/60 text-red-300'
            }`}>
              <div className="flex items-center gap-2 font-semibold">
                {selectedBlock.verification === 'VERIFIED' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {selectedBlock.verification === 'REVIEW' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                {selectedBlock.verification === 'FAILED' && <XCircle className="w-4 h-4 text-red-400" />}
                <span>{selectedBlock.verification}</span>
              </div>
              <span className="font-mono text-[11px] font-bold">
                {(selectedBlock.confidence * 100).toFixed(0)}% {selectedBlock.confidence_level}
              </span>
            </div>

            {/* Content Display */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
                <span>Extracted Content</span>
                <button
                  type="button"
                  onClick={handleCopyContent}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[10px]"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-100 font-mono text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
                {selectedBlock.content}
              </div>
            </div>

            {/* Metadata Properties */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <div className="flex justify-between py-1 text-slate-400">
                <span>Block Type</span>
                <span className="text-white font-mono font-medium">{selectedBlock.type}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>Routing Extractor</span>
                <span className="text-cyan-400 font-mono font-medium">{selectedBlock.extractor}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>Source Page</span>
                <span className="text-white font-mono font-medium">Page {selectedBlock.page}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>Reading Order Sequence</span>
                <span className="text-white font-mono font-medium">#{selectedBlock.reading_order}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>Source Bounding Box</span>
                <span className="text-cyan-300 font-mono font-medium text-[10px]">
                  [{selectedBlock.bbox.join(', ')}]
                </span>
              </div>
            </div>

            {/* Warnings list */}
            {selectedBlock.warnings && selectedBlock.warnings.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Verification Warnings ({selectedBlock.warnings.length})</span>
                </span>
                <div className="space-y-1">
                  {selectedBlock.warnings.map((w, idx) => (
                    <div key={idx} className="p-2 bg-amber-950/20 border border-amber-900/50 rounded-lg text-amber-300 text-[11px]">
                      {w}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
            <Info className="w-8 h-8 text-slate-700" />
            <div className="text-xs font-medium text-slate-400">No Block Selected</div>
            <p className="text-[11px] text-slate-600 max-w-xs">
              Click on any bounding box on the page or citation in Q&A to inspect its provenance coordinates and verification audit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
