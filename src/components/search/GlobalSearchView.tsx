import React, { useState } from 'react';
import { api } from '../../services/api';
import { DocumentRecord, SemanticBlock } from '../../types';
import { Search, FileText, Layers, ExternalLink, Filter } from 'lucide-react';

interface GlobalSearchViewProps {
  onOpenDocumentWithBlock: (doc: DocumentRecord, blockId: string) => void;
}

export const GlobalSearchView: React.FC<GlobalSearchViewProps> = ({
  onOpenDocumentWithBlock,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ doc: DocumentRecord; matchingBlocks: SemanticBlock[] }>>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const docsRes = await api.getDocuments({ search: query.trim() });
      const docs = docsRes.documents;

      const detailedMatches: Array<{ doc: DocumentRecord; matchingBlocks: SemanticBlock[] }> = [];

      for (const d of docs) {
        try {
          const blocksRes = await api.getBlocks(d.id);
          const q = query.toLowerCase();
          const matched = blocksRes.blocks.filter(b => b.content.toLowerCase().includes(q));
          if (matched.length > 0 || d.original_name.toLowerCase().includes(q)) {
            detailedMatches.push({
              doc: d,
              matchingBlocks: matched.length > 0 ? matched : blocksRes.blocks.slice(0, 2),
            });
          }
        } catch (e) {}
      }

      setResults(detailedMatches);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Universal Document Search
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Perform content-level retrieval across headings, handwritten remarks, tables, and code blocks.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords, formulas, algorithms, or table headers..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-950 transition-all disabled:opacity-40"
        >
          {loading ? 'Searching...' : 'Search Engine'}
        </button>
      </form>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400 font-medium">
            Found {results.length} document(s) matching "{query}"
          </div>

          {results.length === 0 ? (
            <div className="p-12 bg-slate-900/60 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
              No matching document contents found.
            </div>
          ) : (
            results.map(({ doc, matchingBlocks }) => (
              <div
                key={doc.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span className="font-semibold text-sm text-white">{doc.original_name}</span>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {doc.document_type}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Confidence: {(doc.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="space-y-2">
                  {matchingBlocks.map((b) => (
                    <button
                      key={b.block_id}
                      type="button"
                      onClick={() => onOpenDocumentWithBlock(doc, b.block_id)}
                      className="w-full text-left p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/60 transition-all group"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className="text-cyan-400 font-bold">
                          Page {b.page} · #{b.block_id} ({b.type})
                        </span>
                        <span className="text-slate-500 group-hover:text-cyan-400 flex items-center gap-1">
                          <span>Jump to source</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-3">
                        {b.content}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
