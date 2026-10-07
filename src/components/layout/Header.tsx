import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell, Sparkles, User, Settings, Shield, LogOut } from 'lucide-react';

interface HeaderProps {
  onSearch: (query: string) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onTriggerDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSearch,
  onOpenProfile,
  onOpenSettings,
  onTriggerDemo,
}) => {
  const { user, logout } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Time of day greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'Engineer';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput);
  };

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between z-20 shrink-0">
      {/* Left: Greeting */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">
            {greeting}, {firstName}
          </h2>
          <p className="text-[11px] text-slate-400">
            Document extraction & evidence verification active
          </p>
        </div>
      </div>

      {/* Center: Search input */}
      <form onSubmit={handleSearchSubmit} className="max-w-md w-full mx-6 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents, extracted entities, or tables..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              onSearch(e.target.value);
            }}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/80 transition-colors"
          />
        </div>
      </form>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 relative">
        <button
          type="button"
          onClick={onTriggerDemo}
          className="hidden sm:inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-cyan-950/40 border border-cyan-800/50 hover:border-cyan-500/80 text-cyan-300 text-xs font-medium transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Demo Document</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl border border-slate-800/80 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-cyan-500 absolute top-1.5 right-1.5 ring-2 ring-slate-950" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-xs text-slate-300">
              <div className="font-semibold text-white mb-2 flex items-center justify-between">
                <span>Recent System Events</span>
                <span className="text-[10px] text-cyan-400">Live</span>
              </div>
              <div className="space-y-2">
                <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                  <div className="font-medium text-white">OCR Engine Ready</div>
                  <div className="text-[11px] text-slate-400">Tesseract.js & Multimodal router online.</div>
                </div>
                <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                  <div className="font-medium text-white">Provenance Engine Initialized</div>
                  <div className="text-[11px] text-slate-400">Target bounding box mapping active.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User avatar and dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAvatarMenu(!showAvatarMenu)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
          >
            <img
              src={user?.avatar || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'}
              alt="Avatar"
              className="w-8 h-8 rounded-lg bg-slate-800 object-cover border border-cyan-500/30"
            />
          </button>

          {showAvatarMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-xs">
              <div className="px-4 py-2 border-b border-slate-800">
                <div className="font-semibold text-white truncate">{user?.fullName}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
              </div>

              <div className="p-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => { setShowAvatarMenu(false); onOpenProfile(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Profile Overview</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAvatarMenu(false); onOpenSettings(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Settings & Preferences</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAvatarMenu(false); onOpenProfile(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Security & Passwords</span>
                </button>
              </div>

              <div className="pt-1 mt-1 border-t border-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => { setShowAvatarMenu(false); logout(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
