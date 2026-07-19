import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { alertAPI } from '../utils/api';
import { AlertCircle, Bell, Volume2, ShieldAlert, CheckCircle } from 'lucide-react';

export default function AlertsPanel() {
  const { subscribe } = useSocket();

  const [alerts, setAlerts] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Play synthesized notification sound using standard browser AudioContext
  const playSiren = () => {
    if (!audioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Tone 1: Alert Beep
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.warn("AudioContext failed:", e);
    }
  };

  useEffect(() => {
    // Fetch initial alerts
    alertAPI.getAlerts()
      .then(res => setAlerts(res.data))
      .catch(err => console.error("Error loading alerts:", err));

    // Listen to real-time alerts
    const unsubscribeAlerts = subscribe('alerts', (payload) => {
      // Add new alert to front of list
      setAlerts(prev => [payload, ...prev].slice(0, 10));
      
      // Play sound
      playSiren();
    });

    return () => {
      unsubscribeAlerts();
    };
  }, [subscribe, audioEnabled]);

  const handleResolveAlert = (id) => {
    // Optimistic state change
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-6">
      
      {/* Alert Header Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Emergency Alert Center</h2>
            <p className="text-xs text-slate-500">Live feed of active traffic incidents, wrong way events, and sensor overrides</p>
          </div>
        </div>

        {/* Audio Enable Toggle */}
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg border transition-all cursor-pointer ${
            audioEnabled 
              ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          {audioEnabled ? 'Audio Alerts: ENABLED' : 'Enable Audio Synthesizer'}
        </button>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Alerts List column */}
        <div className="md:col-span-2 space-y-4">
          {alerts.length === 0 ? (
            <div className="glass-panel p-8 text-center rounded-xl border border-white/5 space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white uppercase">System Secure</h4>
              <p className="text-xs text-slate-500">No active incidents logged on city camera feeds.</p>
            </div>
          ) : (
            alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 shadow-xl ${
                  alert.severity === 'Critical' 
                    ? 'bg-red-500/5 border-red-500/30 text-red-200 shadow-red-500/5' 
                    : 'bg-amber-500/5 border-amber-500/20 text-amber-200'
                }`}
              >
                <div className="flex gap-3">
                  <div className={`p-2 rounded-lg ${
                    alert.severity === 'Critical' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    <ShieldAlert className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs tracking-wider uppercase">{alert.event_type}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        alert.severity === 'Critical' ? 'bg-red-600/30 text-red-400' : 'bg-amber-600/30 text-amber-400'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{alert.description}</p>
                    <span className="text-[9px] text-slate-500 block">
                      Logged: {new Date(alert.timestamp || Date.now()).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleResolveAlert(alert.id)}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Dismiss / Resolve
                </button>
              </div>
            ))
          )}
        </div>

        {/* Incidents analytics box */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 shadow-xl space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-white/5 pb-2">
            Incident Response statistics
          </h3>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Total Incidents Today</span>
              <span className="text-white font-extrabold">12</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Average Resolve Time</span>
              <span className="text-cyan-400 font-extrabold">4m 12s</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Automatic AI Triggers</span>
              <span className="text-emerald-400 font-extrabold">8 / 12</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h4 className="text-[10px] uppercase font-bold text-slate-500">Auto-Dial Dispatch Triggers</h4>
            <div className="space-y-2 text-[10px]">
              <div className="bg-slate-950 p-2 rounded-lg border border-white/5 flex justify-between">
                <span className="text-slate-300">Delhi Police Control Room</span>
                <span className="text-emerald-400 font-semibold">Ready</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-white/5 flex justify-between">
                <span className="text-slate-300">Central Fire Station CP</span>
                <span className="text-emerald-400 font-semibold">Ready</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
