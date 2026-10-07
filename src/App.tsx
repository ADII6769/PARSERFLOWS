import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { Sidebar, NavItem } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ProfileModal } from './components/layout/ProfileModal';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { DocumentList } from './components/documents/DocumentList';
import { UploadZone } from './components/upload/UploadZone';
import { DocumentResults } from './components/results/DocumentResults';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { ApiDocsView } from './components/docs/ApiDocsView';
import { GlobalSearchView } from './components/search/GlobalSearchView';
import { DocumentRecord, DocumentPage, SemanticBlock } from './types';
import { api } from './services/api';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentNav, setCurrentNav] = useState<NavItem>('dashboard');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'security' | 'preferences'>('profile');

  // Selected document state
  const [activeDocument, setActiveDocument] = useState<DocumentRecord | null>(null);
  const [activePages, setActivePages] = useState<DocumentPage[]>([]);
  const [activeBlocks, setActiveBlocks] = useState<SemanticBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  // Load document details
  const loadDocumentDetails = async (doc: DocumentRecord, targetBlockId?: string) => {
    setActiveDocument(doc);
    setLoadingDoc(true);
    if (targetBlockId) setSelectedBlockId(targetBlockId);

    try {
      const [docData, blocksData] = await Promise.all([
        api.getDocument(doc.id),
        api.getBlocks(doc.id),
      ]);
      setActiveDocument(docData.document);
      setActivePages(docData.pages);
      setActiveBlocks(blocksData.blocks);
      setCurrentNav('results');
    } catch (err) {
      console.error('Error loading document details:', err);
    } finally {
      setLoadingDoc(false);
    }
  };

  // Demo Document Instant Trigger
  const handleTriggerDemo = async () => {
    try {
      const res = await api.createDemoDocument();
      await loadDocumentDetails(res.document);
    } catch (err: any) {
      alert(err.message || 'Failed to initialize demo document.');
    }
  };

  const handleUploadSuccess = async (createdDocs: DocumentRecord[]) => {
    if (createdDocs.length > 0) {
      await loadDocumentDetails(createdDocs[0]);
    } else {
      setCurrentNav('documents');
    }
  };

  // First screen rule: If loading or unauthenticated, show spinner or AuthScreen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-wider uppercase text-cyan-400">
            ParseFlow Engine Initializing...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        currentNav={currentNav}
        onSelectNav={(nav) => {
          setCurrentNav(nav);
          if (nav === 'settings') {
            setProfileModalTab('preferences');
            setProfileModalOpen(true);
          }
        }}
        onOpenProfile={() => {
          setProfileModalTab('profile');
          setProfileModalOpen(true);
        }}
        onTriggerDemo={handleTriggerDemo}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          onSearch={(q) => {
            if (q.trim()) setCurrentNav('search');
          }}
          onOpenProfile={() => {
            setProfileModalTab('profile');
            setProfileModalOpen(true);
          }}
          onOpenSettings={() => {
            setProfileModalTab('preferences');
            setProfileModalOpen(true);
          }}
          onTriggerDemo={handleTriggerDemo}
        />

        {/* View Router */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {currentNav === 'dashboard' && (
            <DashboardOverview
              onOpenUpload={() => setCurrentNav('upload')}
              onOpenDocument={(doc) => loadDocumentDetails(doc)}
              onTriggerDemo={handleTriggerDemo}
            />
          )}

          {currentNav === 'documents' && (
            <DocumentList
              onOpenDocument={(doc) => loadDocumentDetails(doc)}
              onOpenUpload={() => setCurrentNav('upload')}
            />
          )}

          {currentNav === 'upload' && (
            <UploadZone
              onUploadSuccess={handleUploadSuccess}
              onTriggerDemo={handleTriggerDemo}
            />
          )}

          {currentNav === 'results' && (
            activeDocument ? (
              <DocumentResults
                document={activeDocument}
                pages={activePages}
                blocks={activeBlocks}
                selectedBlockId={selectedBlockId}
                onSelectBlock={(id) => setSelectedBlockId(id)}
                onReprocess={() => loadDocumentDetails(activeDocument)}
              />
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">
                <p>No document selected. Select a document from library or launch the demo.</p>
                <button
                  type="button"
                  onClick={handleTriggerDemo}
                  className="mt-3 py-2 px-4 bg-cyan-600 text-white rounded-xl font-semibold"
                >
                  Load Demo Document
                </button>
              </div>
            )
          )}

          {currentNav === 'search' && (
            <GlobalSearchView
              onOpenDocumentWithBlock={(doc, blockId) => loadDocumentDetails(doc, blockId)}
            />
          )}

          {currentNav === 'analytics' && <AnalyticsView />}

          {currentNav === 'docs' && <ApiDocsView />}

          {currentNav === 'settings' && (
            <div className="p-6 max-w-2xl mx-auto">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
                <h2 className="text-base font-semibold text-white">System & Workspace Settings</h2>
                <p className="text-xs text-slate-400">
                  Configure extraction heuristics, OCR engines, and security credentials.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setProfileModalTab('preferences');
                    setProfileModalOpen(true);
                  }}
                  className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl"
                >
                  Open Preferences Window
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* User Profile & Settings Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        initialTab={profileModalTab}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
