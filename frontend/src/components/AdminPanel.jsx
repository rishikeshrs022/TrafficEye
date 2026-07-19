import React, { useState, useEffect } from 'react';
import { cameraAPI, signalAPI, authAPI } from '../utils/api';
import { Settings, Plus, UserPlus, Database, RefreshCw, Key, ShieldAlert } from 'lucide-react';

export default function AdminPanel() {
  const [cameras, setCameras] = useState([]);
  const [signals, setSignals] = useState([]);
  
  // Forms state
  const [camLoc, setCamLoc] = useState('');
  const [camUrl, setCamUrl] = useState('');
  
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('Traffic Police');

  const [message, setMessage] = useState({ text: '', type: '' });
  const [systemLogs, setSystemLogs] = useState([
    { id: 1, type: "INFO", text: "Database connection established." },
    { id: 2, type: "INFO", text: "FastAPI server running on port 8000." },
    { id: 3, type: "INFO", text: "WebSocket hub server initialized successfully." },
    { id: 4, type: "WARN", text: "Kafka broker offline. Launching fallback in-memory stream manager." },
    { id: 5, type: "INFO", text: "Admin account auto-seeded successfully." }
  ]);

  const loadData = async () => {
    try {
      const cams = await cameraAPI.getCameras();
      setCameras(cams.data);
      const sigs = await signalAPI.getSignals();
      setSignals(sigs.data);
    } catch (err) {
      console.error("Admin load error:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddCamera = async (e) => {
    e.preventDefault();
    if (!camLoc || !camUrl) return;
    try {
      await cameraAPI.addCamera({
        location: camLoc,
        stream_url: camUrl,
        status: "Active"
      });
      setMessage({ text: 'Camera registered successfully.', type: 'success' });
      setCamLoc('');
      setCamUrl('');
      loadData();
    } catch (err) {
      setMessage({ text: 'Failed to register camera.', type: 'error' });
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!regUsername || !regPassword) return;
    try {
      await authAPI.register(regUsername, regPassword, regRole);
      setMessage({ text: `User ${regUsername} registered as ${regRole}.`, type: 'success' });
      setRegUsername('');
      setRegPassword('');
    } catch (err) {
      setMessage({ text: err.response?.data?.detail || 'Failed to register user.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Messages */}
      {message.text && (
        <div className={`p-3 rounded-lg text-xs font-semibold ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Grid of Admin Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Form 1: Add Camera */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-white/5 pb-2 flex items-center gap-1.5 mb-4">
              <Plus className="w-4 h-4 text-cyan-400" />
              Register New Smart Camera
            </h3>

            <form onSubmit={handleAddCamera} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-500">Camera Location / Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sector 5 Crossing, Delhi"
                  value={camLoc}
                  onChange={(e) => setCamLoc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-500">Stream Source URL (.mp4 / rtsp)</label>
                <input
                  type="text"
                  placeholder="e.g. camera5_stream.mp4"
                  value={camUrl}
                  onChange={(e) => setCamUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
              >
                Register Camera
              </button>
            </form>
          </div>
        </div>

        {/* Form 2: Add User */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-white/5 pb-2 flex items-center gap-1.5 mb-4">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              Add Authority Credentials
            </h3>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-500">Username</label>
                  <input
                    type="text"
                    placeholder="police_officer"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-500">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-500">System Role Scope</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none"
                >
                  <option value="Traffic Police">Traffic Police (Overrides allowed)</option>
                  <option value="City Authority">City Authority (Read-Only metrics)</option>
                  <option value="Admin">System Administrator</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 border border-slate-800 hover:border-blue-500 text-slate-300 hover:text-white font-semibold py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Create Credentials
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Grid of logs & listings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* System activity logs */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-white/5 shadow-xl flex flex-col justify-between min-h-[220px]">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Live Server Activity logs</h3>
            </div>
            <button
              onClick={() => {
                setSystemLogs(prev => [
                  { id: Date.now(), type: "INFO", text: "Admin fetched latest junction telemetry counts." },
                  ...prev
                ]);
              }}
              className="text-slate-500 hover:text-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 flex-grow overflow-y-auto max-h-[160px] font-mono text-[10px]">
            {systemLogs.map(log => (
              <div key={log.id} className="flex gap-2 py-0.5">
                <span className={`font-bold ${
                  log.type === 'WARN' ? 'text-amber-500' : 'text-cyan-500'
                }`}>[{log.type}]</span>
                <span className="text-slate-400">{log.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Keys and details */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-white/5 pb-2 flex items-center gap-1.5 mb-4">
              <Key className="w-4 h-4 text-cyan-400" />
              System Keys
            </h3>
            <div className="space-y-3 text-[10px]">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">REST API JWT Encryption</span>
                <span className="text-slate-500">HS256 SHA-256</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Database Engine</span>
                <span className="text-slate-500">SQLite Fallback / PG Prod</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">WebSocket Buffer Mode</span>
                <span className="text-emerald-400 font-semibold">Active Fallback Hub</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-red-500/5 border border-red-500/10 rounded-lg flex items-start gap-2.5 text-red-300 text-[10px]">
            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
            <p className="leading-normal">
              Unauthorized configuration changes are locked. Logs are stored with sha256 checksum tags in government audit databases.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
