import React, { useState } from 'react';
import { ShieldCheck, User, Lock, AlertCircle, ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen }) => {
  const { signIn, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }
    setError(null);
    try {
      await signIn(username.trim(), password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please verify credentials.');
      }
    }
  };

  const handleFillDemo = (demoUser: string, demoPass: string) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-[#17191C]/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white border border-[#E6E8EC] rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#E8F4F1] border border-[#157A70]/20 text-[#157A70] shadow-xs">
            <ShieldCheck className="w-6 h-6 text-[#157A70]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#17191C] tracking-tight">DrainGuard Access</h2>
            <p className="text-xs text-[#696F78]">Sign in to access urban flood risk triage & operations workspace</p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-[#FDF2F2] border border-[#D9383A]/20 flex items-start gap-2.5 text-xs text-[#D9383A]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#17191C] block uppercase tracking-wider">
              Username or Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9298A1]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user@drainguard.demo"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E6E8EC] bg-white text-xs text-[#17191C] placeholder-[#9298A1] focus:outline-none focus:border-[#157A70] focus:ring-2 focus:ring-[#157A70]/10 transition-all"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#17191C] block uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9298A1]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[#E6E8EC] bg-white text-xs text-[#17191C] placeholder-[#9298A1] focus:outline-none focus:border-[#157A70] focus:ring-2 focus:ring-[#157A70]/10 transition-all"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9298A1] hover:text-[#17191C] transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#157A70] hover:bg-[#11685F] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Quick-Fill Section */}
        <div className="pt-2 border-t border-[#E6E8EC] space-y-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#696F78] uppercase tracking-wider">
            <KeyRound className="w-3.5 h-3.5 text-[#157A70]" />
            <span>Public Demo Credentials</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleFillDemo('admin@drainguard.demo', 'admin12345')}
              className="p-2.5 rounded-xl border border-[#E6E8EC] hover:border-[#157A70] hover:bg-[#E8F4F1]/40 text-left transition-all cursor-pointer group"
            >
              <div className="text-[11px] font-bold text-[#17191C] group-hover:text-[#157A70]">Demo Admin</div>
              <div className="text-[10px] text-[#696F78]">Role: admin</div>
              <div className="text-[10px] font-mono text-[#9298A1] mt-0.5">admin12345</div>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('user@drainguard.demo', 'user12345')}
              className="p-2.5 rounded-xl border border-[#E6E8EC] hover:border-[#157A70] hover:bg-[#E8F4F1]/40 text-left transition-all cursor-pointer group"
            >
              <div className="text-[11px] font-bold text-[#17191C] group-hover:text-[#157A70]">Demo User</div>
              <div className="text-[10px] text-[#696F78]">Role: user</div>
              <div className="text-[10px] font-mono text-[#9298A1] mt-0.5">user12345</div>
            </button>
          </div>

          <p className="text-[10px] text-[#9298A1] text-center leading-relaxed">
            These credentials are intentionally public for shared hackathon demonstration.
          </p>
        </div>
      </div>
    </div>
  );
};
