import React, { useState, useEffect } from 'react';
import { DocumentRecord, QARecord, Citation } from '../../types';
import { api } from '../../services/api';
import {
  Send,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
} from 'lucide-react';

interface AskParseFlowProps {
  document: DocumentRecord;
  onJumpToCitation: (page: number, blockId: string) => void;
}

export const AskParseFlow: React.FC<AskParseFlowProps> = ({
  document,
  onJumpToCitation,
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<QARecord[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Load historical Q&A for this document
    api.getQAHistory(document.id)
      .then(res => setQaHistory(res.history))
      .catch(err => console.error('Failed to load QA history:', err));
  }, [document.id]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const currentQ = question.trim();
    setQuestion('');
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.askQuestion(document.id, currentQ);
      const newRecord: QARecord = {
        id: 'qa_' + Math.random().toString(36).substring(2, 9),
        document_id: document.id,
        question: currentQ,
        answer: res.answer,
        citations: res.citations || [],
        created_at: new Date().toISOString(),
      };
      setQaHistory(prev => [...prev, newRecord]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate grounded answer.');
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = document.is_demo
    ? [
        'What is the rotation schema for AVL tree rebalancing?',
        'What equation represents the quantum state vector?',
        'What is the worst-case time complexity of an AVL insertion?',
        'What was written in the handwriting margin note?',
      ]
    : [
        'What are the key findings or summary of this document?',
        'Are there any tables or performance benchmarks recorded?',
        'What sections contain uncertain or low-confidence extractions?',
      ];

  return (
    <div className="flex flex-col h-[650px] bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Ask ParseFlow</span>
              <span className="text-[10px] font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                Zero-Hallucination Grounding
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Answers strictly backed by verified document bounding-box citations.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Strict Evidence Protocol</span>
        </div>
      </div>

      {/* Chat History View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {qaHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-cyan-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Ask anything about this document</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                ParseFlow scans all decoded semantic blocks and provides answers strictly citing source coordinates.
              </p>
            </div>

            <div className="w-full text-left space-y-2 pt-2">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Suggested questions:
              </span>
              {sampleQuestions.map((sq, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setQuestion(sq)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 text-xs text-slate-300 transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{sq}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          qaHistory.map((item) => (
            <div key={item.id} className="space-y-3">
              {/* User Question */}
              <div className="flex justify-end">
                <div className="max-w-xl bg-cyan-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-xs font-medium shadow-md">
                  {item.question}
                </div>
              </div>

              {/* Engine Answer */}
              <div className="flex justify-start">
                <div className="max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-sm p-4 text-xs text-slate-200 shadow-lg space-y-3">
                  <div className="leading-relaxed whitespace-pre-wrap font-sans">
                    {item.answer}
                  </div>

                  {/* Evidence Citations */}
                  {item.citations && item.citations.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Source Evidence Citations ({item.citations.length})</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {item.citations.map((c, cIdx) => (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => onJumpToCitation(c.page, c.block_id)}
                            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/70 text-left transition-all group"
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                              <span className="text-cyan-300 font-bold">
                                Page {c.page} · #{c.block_id}
                              </span>
                              <span className="text-slate-500 group-hover:text-cyan-400 flex items-center gap-0.5">
                                <span>Inspect</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-2 italic">
                              "{c.snippet}"
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span>Synthesizing answer from document bounding-box evidence...</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 shrink-0">
        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this document..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/80 transition-colors"
          />
          <button
            type="submit"
            disabled={!question.trim() || loading}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950/50 transition-all disabled:opacity-40"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
