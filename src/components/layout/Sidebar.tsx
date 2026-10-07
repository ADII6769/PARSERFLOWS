import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  Layers,
  Search,
  BarChart3,
  BookOpen,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react';

export type NavItem = 
  | 'dashboard' 
  | 'documents' 
  | 'upload' 
  | 'results' 
  | 'search' 
  | 'analytics' 
  | 'docs' 
  | 'settings';

interface SidebarProps {
  currentNav: NavItem;
  onSelectNav: (item: NavItem) => void;
  onOpenProfile: () => void;
  onTriggerDemo: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentNav,
  onSelectNav,
  onOpenProfile,
  onTriggerDemo,
}) => {
  const { user, logout } = useAuth();

  const navItems: Array<{ id: NavItem; label: string; icon: React.ElementType }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'upload', label: 'Upload & Process', icon: UploadCloud },
    { id: 'results', label: 'Results & Viewer', icon: Layers },
    { id: 'search', label: 'Search Engine', icon: Search },
    { id: 'analytics', label: 'Analytics & Costs', icon: BarChart3 },
    { id: 'docs', label: 'REST API & Docs', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-950/50">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold tracking-wider text-base text-white flex items-center gap-1.5">
              <span>PARSEFLOW</span>
            </div>
            <p className="text-[10px] text-cyan-400 font-medium tracking-wide uppercase">
              Provenance Engine
            </p>
          </div>
        </div>
      </div>

      {/* Demo Action Banner */}
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={onTriggerDemo}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-950/60 to-blue-950/40 border border-cyan-800/40 hover:border-cyan-600/70 text-cyan-300 text-xs font-semibold flex items-center justify-between transition-all group shadow-sm"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
            <span>Load Demo Document</span>
          </span>
          <span className="text-[10px] bg-cyan-900/60 text-cyan-200 px-1.5 py-0.5 rounded">1-Click</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          WORKSPACE
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-slate-900 text-cyan-400 border border-cyan-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom User Profile Section */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/70">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/70 border border-slate-800/80">
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 min-w-0 text-left group"
          >
            <img
              src={user?.avatar || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'}
              alt="Avatar"
              className="w-8 h-8 rounded-lg bg-slate-800 object-cover border border-slate-700/60 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                {user?.fullName || 'User'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {user?.email || ''}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => logout()}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-lg transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
