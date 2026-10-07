import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { X, User, Lock, Settings, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

const AVATARS = [
  'https://api.dicebear.com/7.x/shapes/svg?seed=Archimedes',
  'https://api.dicebear.com/7.x/shapes/svg?seed=AdaLovelace',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Turing',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Hypatia',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Euler',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Gauss',
];

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'security' | 'preferences';
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'profile',
}) => {
  const { user, updateUser, refreshUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>(initialTab);

  // Profile form state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [avatar, setAvatar] = useState(user?.avatar || AVATARS[0]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Preferences form state
  const [ocrEngine, setOcrEngine] = useState(user?.preferences?.ocrEngine || 'tesseract');
  const [autoProcess, setAutoProcess] = useState(user?.preferences?.autoProcess ?? true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(user?.preferences?.confidenceThreshold || 0.85);
  const [prefSuccess, setPrefSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await api.updateProfile({ fullName, avatar });
      updateUser(res.user);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Password update failed');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      const preferences = {
        ocrEngine,
        autoProcess,
        confidenceThreshold,
        theme: 'dark' as const,
      };
      const res = await api.updateProfile({ preferences });
      updateUser(res.user);
      setPrefSuccess(true);
      setTimeout(() => setPrefSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save preferences');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Oct 2026';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar || AVATARS[0]}
              alt="Avatar"
              className="w-10 h-10 rounded-xl bg-slate-800 border border-cyan-500/40 object-cover"
            />
            <div>
              <h3 className="text-base font-semibold text-white">{user?.fullName || 'User Profile'}</h3>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile & Metrics</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'security'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Security</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'preferences'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Processing Preferences</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Metric stats card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">Documents</div>
                  <div className="text-lg font-bold text-white mt-1">{user?.documentsProcessed || 0}</div>
                </div>
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">Pages Processed</div>
                  <div className="text-lg font-bold text-white mt-1">{user?.pagesProcessed || 0}</div>
                </div>
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">Storage Used</div>
                  <div className="text-lg font-bold text-cyan-400 mt-1">
                    {formatBytes(user?.storageUsedBytes || 0)}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">Member Since</div>
                  <div className="text-xs font-semibold text-white mt-2">{formattedDate}</div>
                </div>
              </div>

              {/* Edit form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full bg-slate-950/50 border border-slate-800/60 rounded-xl px-3.5 py-2 text-sm text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Email is verified for authentication ownership.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Select Avatar Style</label>
                  <div className="flex items-center gap-2.5">
                    {AVATARS.map((av, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAvatar(av)}
                        className={`w-10 h-10 rounded-xl border overflow-hidden p-0.5 transition-all ${
                          avatar === av
                            ? 'border-cyan-400 ring-2 ring-cyan-500/30 scale-105'
                            : 'border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={av} alt="Avatar" className="w-full h-full rounded-lg" />
                      </button>
                    ))}
                  </div>
                </div>

                {profileSuccess && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Profile updated successfully.</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="py-2 px-5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-5">
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                <span>
                  Passwords are cryptographic hashes using salt rounds. Plaintext is never stored or transmitted.
                </span>
              </div>

              {passwordError && (
                <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Password changed successfully.</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="py-2 px-5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Primary OCR Engine</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setOcrEngine('tesseract')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        ocrEngine === 'tesseract'
                          ? 'border-cyan-400 bg-cyan-950/20 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-semibold">Tesseract OCR (Local)</div>
                      <div className="text-[11px] text-slate-500 mt-1">High-speed local processing. Zero data leaves environment.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOcrEngine('hybrid')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        ocrEngine === 'hybrid'
                          ? 'border-cyan-400 bg-cyan-950/20 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-semibold">Hybrid OCR + Multimodal Vision</div>
                      <div className="text-[11px] text-slate-500 mt-1">Auto-routes handwriting and visual diagrams to Vision.</div>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">Confidence Verification Threshold</label>
                    <span className="text-xs font-semibold text-cyan-400">{(confidenceThreshold * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="0.95"
                    step="0.05"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 bg-slate-800"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Blocks with confidence below this threshold are automatically flagged for REVIEW.
                  </p>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={autoProcess}
                      onChange={(e) => setAutoProcess(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0"
                    />
                    <span>Automatically trigger parsing pipeline upon upload</span>
                  </label>
                </div>

                {prefSuccess && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Preferences saved.</span>
                  </div>
                )}

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    className="py-2 px-5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <span className="text-slate-500">Authenticated as {user?.email}</span>
          <button
            type="button"
            onClick={() => { onClose(); logout(); }}
            className="text-red-400 hover:text-red-300 font-medium"
          >
            Log Out of ParseFlow
          </button>
        </div>
      </div>
    </div>
  );
};
