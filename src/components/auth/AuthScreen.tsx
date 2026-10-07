import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FileText, Lock, Mail, User as UserIcon, Eye, EyeOff, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

const AVATARS = [
  'https://api.dicebear.com/7.x/shapes/svg?seed=Archimedes',
  'https://api.dicebear.com/7.x/shapes/svg?seed=AdaLovelace',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Turing',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Hypatia',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Euler',
];

export const AuthScreen: React.FC = () => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        return;
      }
      if (!agreeTerms) {
        setErrorMsg('You must agree to the Terms of Service to create an account');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await signup({ email, password, fullName, avatar });
        setSuccessMsg('Account created successfully! Welcome to ParseFlow.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoFill = () => {
    setEmail('researcher@parseflow.ai');
    setPassword('parseflow2026');
    setFullName('Dr. Elena Rostova');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Background radial atmosphere */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-cyan-900/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[350px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md z-10">
        {/* Header branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <span className="font-semibold tracking-wider text-base text-white">PARSEFLOW</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Evidence-Preserving Document Intelligence
          </h1>
          <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            Deconstruct complex scanned documents, handwriting, and tables with rigorous bounding-box provenance.
          </p>
        </div>

        {/* Auth form box */}
        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/20">
          {/* Segmented Switcher */}
          <div className="flex p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 mb-6">
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SIGN UP
            </button>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Dr. Elena Rostova"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/80 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Avatar Style</label>
                  <div className="flex items-center gap-2">
                    {AVATARS.map((avUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAvatar(avUrl)}
                        className={`w-9 h-9 rounded-lg border overflow-hidden p-0.5 transition-transform ${
                          avatar === avUrl ? 'border-cyan-400 ring-2 ring-cyan-500/30 scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={avUrl} alt="avatar option" className="w-full h-full rounded" />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="analyst@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/80 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/80 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/80 transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              {mode === 'signin' ? (
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0"
                  />
                  <span>Stay logged in</span>
                </label>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0"
                  />
                  <span>I agree to Terms of Service & Privacy Policy</span>
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'signin' ? 'CONTINUE SECURELY' : 'CREATE ACCOUNT'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo fill helper */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Exploring the hackathon demo?</span>
            <button
              type="button"
              onClick={handleQuickDemoFill}
              className="text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-4"
            >
              Auto-fill Demo Account
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
            <span>End-to-end provenance</span>
          </span>
          <span>·</span>
          <span>Local-First OCR</span>
          <span>·</span>
          <span>Zero Hallucination Policy</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Reset Password</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Enter your verified email. In this prototype, a secure reset token is generated immediately.
            </p>
            {resetSuccess ? (
              <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-xl text-xs space-y-2">
                <p>A recovery instructions token has been dispatched to {resetEmail}.</p>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(false); setResetSuccess(false); }}
                  className="w-full mt-2 py-1.5 bg-slate-800 rounded-lg text-white font-medium"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (resetEmail) setResetSuccess(true);
                }}
                className="space-y-3"
              >
                <input
                  type="email"
                  required
                  placeholder="user@organization.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2 text-xs rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs rounded-xl bg-cyan-600 text-white font-semibold hover:bg-cyan-500"
                  >
                    Send Token
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
