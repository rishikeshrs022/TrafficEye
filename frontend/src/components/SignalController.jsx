import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { signalAPI } from '../utils/api';
import { Cpu, AlertTriangle, AlertOctagon, RotateCcw, Power, CheckCircle } from 'lucide-react';

export default function SignalController() {
  const { subscribe } = useSocket();

  const [signals, setSignals] = useState([]);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [adaptiveTiming, setAdaptiveTiming] = useState({
    baseTime: 15,
    densityWeight: 0,
    priorityWeight: 0,
    recommendedGreen: 30
  });

  useEffect(() => {
    // Fetch signals list
    const fetchSignals = async () => {
      try {
        const res = await signalAPI.getSignals();
        setSignals(res.data);
        if (res.data.length > 0) {
          setSelectedSignal(res.data[0]);
        }
      } catch (err) {
        console.error("Error loading signals:", err);
        const fallback = [
          { id: 1, location: 'Gandhipuram Junction', current_state: 'RED', green_time: 30, red_time: 30, is_adaptive: true },
          { id: 2, location: 'Hope College Circle', current_state: 'GREEN', green_time: 40, red_time: 20, is_adaptive: true },
          { id: 3, location: 'Avinashi Road Crossing', current_state: 'RED', green_time: 30, red_time: 35, is_adaptive: true },
          { id: 4, location: 'Ukkadam Bus Stand', current_state: 'RED', green_time: 25, red_time: 30, is_adaptive: true }
        ];
        setSignals(fallback);
        setSelectedSignal(fallback[0]);
      }
    };

    fetchSignals();

    // Subscribe to WebSocket updates
    const unsubscribeTraffic = subscribe('traffic', (payload) => {
      // If signal status is changed, update
      if (payload.event === 'signal_override' && selectedSignal && payload.signal_id === selectedSignal.id) {
        setSelectedSignal(prev => ({
          ...prev,
          current_state: payload.current_state,
          override_state: payload.override_state,
          is_adaptive: payload.is_adaptive
        }));
      }

      // If live density comes in, simulate adaptive calculation
      if (payload.density !== undefined && selectedSignal && payload.camera_id === selectedSignal.id) {
        const densityVal = Math.round(payload.density);
        const densityWt = Math.min(45, Math.round((densityVal / 100) * 30));
        const totalGreen = 15 + densityWt + (adaptiveTiming.priorityWeight);
        
        setAdaptiveTiming(prev => ({
          ...prev,
          densityWeight: densityWt,
          recommendedGreen: totalGreen
        }));
      }
    });

    const unsubscribeAmbulance = subscribe('ambulance', (payload) => {
      // Trigger Green corridor priority weight
      setAdaptiveTiming(prev => ({
        ...prev,
        priorityWeight: 60,
        recommendedGreen: prev.baseTime + prev.densityWeight + 60
      }));
      setCountdown(90);
      
      // Flash signals list green
      setSignals(prevList => prevList.map(sig => ({
        ...sig,
        current_state: "GREEN",
        is_adaptive: false,
        override_state: "GREEN"
      })));
    });

    return () => {
      unsubscribeTraffic();
      unsubscribeAmbulance();
    };
  }, [selectedSignal, subscribe, adaptiveTiming.priorityWeight]);

  // Countdown timer countdown interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Cycle signal states automatically for mock demonstration
          if (selectedSignal && selectedSignal.is_adaptive) {
            const nextState = selectedSignal.current_state === 'RED' ? 'GREEN' : 
                              selectedSignal.current_state === 'GREEN' ? 'YELLOW' : 'RED';
            setSelectedSignal(prevSig => ({ ...prevSig, current_state: nextState }));
            return nextState === 'GREEN' ? adaptiveTiming.recommendedGreen : 
                   nextState === 'YELLOW' ? 5 : 30;
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedSignal, adaptiveTiming.recommendedGreen]);

  const handleOverride = async (state) => {
    if (!selectedSignal) return;
    try {
      const res = await signalAPI.overrideSignal(selectedSignal.id, {
        override_state: state
      });
      setSelectedSignal(res.data);
      if (state) {
        setCountdown(90); // default long override
      } else {
        setCountdown(30); // reset
      }
      
      // Update local signals list status
      setSignals(prev => prev.map(s => s.id === selectedSignal.id ? res.data : s));
    } catch (err) {
      console.error("Override failed:", err);
    }
  };

  const getLightState = (color) => {
    if (!selectedSignal) return 'opacity-20';
    return selectedSignal.current_state === color ? 'shadow-[0_0_20px_rgba(255,255,255,0.8)] opacity-100' : 'opacity-20';
  };

  return (
    <div className="space-y-6">
      
      {/* Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {signals.map(sig => (
          <button
            key={sig.id}
            onClick={() => {
              setSelectedSignal(sig);
              setCountdown(sig.current_state === 'GREEN' ? sig.green_time : sig.red_time);
            }}
            className={`glass-panel p-4 rounded-xl border text-left cursor-pointer transition-all ${
              selectedSignal?.id === sig.id ? 'border-blue-500 bg-blue-500/5' : 'border-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 truncate">{sig.location}</span>
              <span className={`w-3 h-3 rounded-full ${
                sig.current_state === 'GREEN' ? 'bg-emerald-500' :
                sig.current_state === 'YELLOW' ? 'bg-amber-500' : 'bg-red-500'
              }`}></span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500">
              <span>{sig.is_adaptive ? 'Adaptive AI' : 'Manual Override'}</span>
              <span>ID: #{sig.id}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Main Signal Display Control Cabin */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Traffic Light Display */}
        <div className="glass-panel p-6 rounded-xl border border-white/5 shadow-xl flex flex-col items-center justify-center min-h-[350px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 text-center">
            Junction Signal Monitor
          </h3>

          {/* Traffic Light Container */}
          <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800 shadow-2xl flex flex-col gap-4 w-28 items-center">
            
            {/* Red Light */}
            <div className={`w-14 h-14 rounded-full bg-red-600 border border-red-500/50 flex items-center justify-center transition-all duration-300 ${getLightState('RED')}`}>
              <span className="text-[10px] font-bold text-red-100">STOP</span>
            </div>
            
            {/* Yellow Light */}
            <div className={`w-14 h-14 rounded-full bg-amber-500 border border-amber-400/50 flex items-center justify-center transition-all duration-300 ${getLightState('YELLOW')}`}>
              <span className="text-[10px] font-bold text-amber-950">WAIT</span>
            </div>

            {/* Green Light */}
            <div className={`w-14 h-14 rounded-full bg-emerald-500 border border-emerald-400/50 flex items-center justify-center transition-all duration-300 ${getLightState('GREEN')}`}>
              <span className="text-[10px] font-bold text-emerald-950">GO</span>
            </div>

          </div>

          <div className="mt-6 text-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Timer Countdown</span>
            <span className="text-3xl font-extrabold text-white">{countdown}s</span>
          </div>

        </div>

        {/* Adaptive Timing calculations display */}
        <div className="glass-panel p-6 rounded-xl border border-white/5 shadow-xl flex flex-col justify-between">
          <div className="space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-white/5 pb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              AI Recommendation engine
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                <span className="text-slate-400">Base Time</span>
                <span className="text-white font-medium">{adaptiveTiming.baseTime}s</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                <span className="text-slate-400">Density Weight</span>
                <span className="text-emerald-400 font-semibold">+{adaptiveTiming.densityWeight}s</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                <span className="text-slate-400">Priority Weight (Emergency)</span>
                <span className="text-red-400 font-bold">+{adaptiveTiming.priorityWeight}s</span>
              </div>
              
              <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-white/5">
                <span className="text-xs font-bold text-white uppercase">Green Recommended</span>
                <span className="text-xl font-extrabold text-cyan-400">{adaptiveTiming.recommendedGreen}s</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg flex items-start gap-2.5 text-xs text-blue-300">
            <CheckCircle className="w-5 h-5 text-cyan-400 shrink-0" />
            <p className="leading-relaxed">
              AI calculates lane density from camera logs every 2 seconds. Timers expand dynamically up to 60s when congestion triggers.
            </p>
          </div>
        </div>

        {/* Manual Override controls */}
        <div className="glass-panel p-6 rounded-xl border border-white/5 shadow-xl flex flex-col justify-between">
          <div className="space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-white/5 pb-2 flex items-center gap-1.5">
              <Power className="w-4 h-4 text-red-500" />
              Manual Override Room
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleOverride('RED')}
                className="bg-red-950/80 border border-red-500/30 hover:bg-red-600 text-red-400 hover:text-white font-bold py-3 rounded-lg text-xs transition-colors cursor-pointer text-center"
              >
                Force Red
              </button>
              <button
                onClick={() => handleOverride('YELLOW')}
                className="bg-amber-950/80 border border-amber-500/30 hover:bg-amber-600 text-amber-400 hover:text-white font-bold py-3 rounded-lg text-xs transition-colors cursor-pointer text-center"
              >
                Force Yellow
              </button>
              <button
                onClick={() => handleOverride('GREEN')}
                className="bg-emerald-950/80 border border-emerald-500/30 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold py-3 rounded-lg text-xs transition-colors cursor-pointer text-center"
              >
                Force Green
              </button>
            </div>

            <button
              onClick={() => handleOverride(null)}
              className="w-full bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              Restore Adaptive AI Mode
            </button>
          </div>

          <div className="mt-6 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-start gap-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <p className="leading-relaxed">
              Manual Override overrides the adaptive AI routing decisions. The signal status becomes fixed until adaptive mode is restored.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
