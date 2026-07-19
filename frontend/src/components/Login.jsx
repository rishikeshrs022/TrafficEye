import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, Lock, User, Activity } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Incorrect credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to prefill login for judges
  const prefill = (uname) => {
    setUsername(uname);
    setPassword('admin123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0B0F19] to-[#0B0F19] px-4">
      
      {/* Login Card */}
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-blue-500/10 shadow-2xl relative overflow-hidden">
        
        {/* Glow Element */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl"></div>

        {/* Brand Header */}
        <div className="text-center mb-8 relative">
          <div className="mx-auto w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500 mb-4 shadow-inner">
            <Activity className="w-8 h-8 animate-pulse text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-white tracking-wide">TRAFFIC EYE</h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Smart Adaptive Traffic Control Room</p>
          <div className="mt-2 text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full inline-block border border-blue-500/20">
            Govt. of India Initiative
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username field */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="Enter username"
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-10 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-400 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-lg shadow-blue-500/10 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </form>

        {/* Demo Accounts Prefill for Evaluation Panel */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <div className="text-center text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Evaluation Quick-Fill Profiles
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => prefill('admin')}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/30 text-[10px] text-slate-300 font-medium py-1.5 px-1 rounded-md transition-colors cursor-pointer"
            >
              System Admin
            </button>
            <button
              onClick={() => prefill('police_officer')}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/30 text-[10px] text-slate-300 font-medium py-1.5 px-1 rounded-md transition-colors cursor-pointer"
            >
              Traffic Police
            </button>
            <button
              onClick={() => prefill('city_authority')}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/30 text-[10px] text-slate-300 font-medium py-1.5 px-1 rounded-md transition-colors cursor-pointer"
            >
              Authority
            </button>
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-3 italic">
            * Note: System Admin 'admin' is seeded by default. Other profiles will register on first click.
          </p>
        </div>

      </div>
    </div>
  );
}
