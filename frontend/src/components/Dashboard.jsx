import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { trafficAPI, aqiAPI, alertAPI } from '../utils/api';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { 
  TrendingUp, 
  Car, 
  Activity, 
  Wind, 
  Clock, 
  AlertTriangle, 
  Camera, 
  ShieldAlert 
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const { subscribe } = useSocket();

  // Dashboard state metrics
  const [liveVehicles, setLiveVehicles] = useState(0);
  const [totalVehiclesToday, setTotalVehiclesToday] = useState(1284);
  const [congestionScore, setCongestionScore] = useState(42);
  const [aqi, setAqi] = useState(185);
  const [waitingTime, setWaitingTime] = useState(38);
  const [corridorActive, setCorridorActive] = useState(false);
  const [camerasCount, setCamerasCount] = useState({ active: 4, total: 4 });
  const [liveAlerts, setLiveAlerts] = useState([]);

  // Fetch initial telemetry logs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const trafficRes = await trafficAPI.getTraffic(10);
        if (trafficRes.data.length > 0) {
          setLiveVehicles(trafficRes.data[0].vehicle_count);
        }
        
        const aqiRes = await aqiAPI.getAQI(1);
        if (aqiRes.data.length > 0) {
          setAqi(aqiRes.data[0].aqi);
        }

        const alertsRes = await alertAPI.getAlerts();
        setLiveAlerts(alertsRes.data.slice(0, 5));
      } catch (err) {
        console.error("Dashboard initialization error:", err);
      }
    };

    fetchData();

    // Subscribe to WebSocket live streams
    const unsubscribeTraffic = subscribe('traffic', (payload) => {
      // Update counts based on live AI telemetry
      if (payload.vehicle_count !== undefined) {
        setLiveVehicles(prev => {
          // Add to daily aggregate counter
          setTotalVehiclesToday(t => t + Math.max(0, payload.vehicle_count - prev));
          return payload.vehicle_count;
        });
        if (payload.density !== undefined) {
          setCongestionScore(Math.round(payload.density));
          setWaitingTime(Math.round(15 + (payload.density * 0.4)));
        }
      }
    });

    const unsubscribeAQI = subscribe('aqi', (payload) => {
      if (payload.aqi !== undefined) {
        setAqi(payload.aqi);
      }
    });

    const unsubscribeAmbulance = subscribe('ambulance', (payload) => {
      setCorridorActive(true);
      // Clear emergency flag after 10 seconds
      setTimeout(() => setCorridorActive(false), 12000);
    });

    const unsubscribeAlerts = subscribe('alerts', (payload) => {
      setLiveAlerts(prev => [payload, ...prev].slice(0, 5));
    });

    return () => {
      unsubscribeTraffic();
      unsubscribeAQI();
      unsubscribeAmbulance();
      unsubscribeAlerts();
    };
  }, [subscribe]);

  // Chart 1: Traffic per Hour (Bar)
  const trafficHourData = {
    labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
    datasets: [
      {
        label: 'Vehicles/Hour',
        data: [150, 420, 310, 290, 380, 590, 480],
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  // Chart 2: Vehicle Distribution (Doughnut)
  const vehicleDistData = {
    labels: ['Cars', 'Bikes', 'Buses', 'Trucks', 'Autos'],
    datasets: [
      {
        data: [60, 25, 8, 4, 3],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)', // Emerald
          'rgba(6, 182, 212, 0.8)',  // Cyan
          'rgba(245, 158, 11, 0.8)',  // Orange/Amber
          'rgba(99, 102, 241, 0.8)',  // Indigo
          'rgba(239, 68, 68, 0.8)',   // Red
        ],
        borderWidth: 0,
      },
    ],
  };

  // Chart 3: AQI Trend (Line)
  const aqiTrendData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        fill: true,
        label: 'AQI Level',
        data: [160, 185, 210, 190, 240, 295, aqi],
        borderColor: 'rgba(6, 182, 212, 1)',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94A3B8', font: { size: 10 } }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94A3B8' } },
      y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94A3B8' } }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Active Corridor Announcement */}
      {corridorActive && (
        <div className="emergency-strobe glow-border-red border p-4 rounded-xl flex items-center justify-between text-white transition-all">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping"></div>
            <ShieldAlert className="w-6 h-6 text-red-500 animate-bounce" />
            <div>
              <h3 className="font-bold text-sm tracking-wide">EMERGENCY GREEN CORRIDOR IN PROGRESS</h3>
              <p className="text-xs text-slate-300">Ambulance detected at Junction 1. Signals adjusted automatically.</p>
            </div>
          </div>
          <span className="text-xs bg-red-600/30 border border-red-500 px-3 py-1 rounded-full uppercase tracking-wider font-semibold">
            Priority Redirection Active
          </span>
        </div>
      )}

      {/* Grid of Key Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Live Vehicles Count */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 flex items-center justify-between shadow-xl relative overflow-hidden">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Live Camera Load</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{liveVehicles}</span>
              <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> vehicles
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block">Total today: {totalVehiclesToday}</span>
          </div>
          <div className="w-12 h-12 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-500">
            <Car className="w-6 h-6 text-cyan-400" />
          </div>
        </div>

        {/* Card 2: Congestion Score */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 flex items-center justify-between shadow-xl">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Congestion Score</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{congestionScore}%</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                congestionScore > 75 ? 'bg-red-500/20 text-red-400' :
                congestionScore > 50 ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {congestionScore > 75 ? 'Critical' : congestionScore > 50 ? 'Heavy' : 'Normal'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block">Adaptive weight calculation</span>
          </div>
          <div className="w-12 h-12 bg-cyan-600/10 rounded-lg flex items-center justify-center text-cyan-500">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        {/* Card 3: Air Quality Index */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 flex items-center justify-between shadow-xl">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Current AQI</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{aqi}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                aqi > 200 ? 'bg-red-500/20 text-red-400' :
                aqi > 100 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {aqi > 200 ? 'Poor' : aqi > 100 ? 'Moderate' : 'Good'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block">PM2.5 correlates with vehicle count</span>
          </div>
          <div className="w-12 h-12 bg-emerald-600/10 rounded-lg flex items-center justify-center text-emerald-500">
            <Wind className="w-6 h-6 text-amber-400" />
          </div>
        </div>

        {/* Card 4: Avg Waiting Time */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 flex items-center justify-between shadow-xl">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Avg Waiting Time</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{waitingTime}s</span>
              <span className="text-xs text-cyan-400">-12% vs static</span>
            </div>
            <span className="text-[10px] text-slate-500 block">Reduced by adaptive signal AI</span>
          </div>
          <div className="w-12 h-12 bg-amber-600/10 rounded-lg flex items-center justify-center text-amber-500">
            <Clock className="w-6 h-6 text-blue-400" />
          </div>
        </div>

      </div>

      {/* Grid of Dynamic Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Column 1: Hourly Flow */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 h-80 flex flex-col justify-between shadow-xl">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Junction Traffic per Hour</h4>
          <div className="relative flex-grow">
            <Bar data={trafficHourData} options={chartOptions} />
          </div>
        </div>

        {/* Chart Column 2: Vehicle Distribution */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 h-80 flex flex-col justify-between shadow-xl">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Vehicle Distribution (%)</h4>
          <div className="relative flex-grow">
            <Doughnut data={vehicleDistData} options={{
              ...chartOptions,
              cutout: '60%',
            }} />
          </div>
        </div>

        {/* Chart Column 3: AQI Trends */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 h-80 flex flex-col justify-between shadow-xl">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Weekly AQI Levels</h4>
          <div className="relative flex-grow">
            <Line data={aqiTrendData} options={chartOptions} />
          </div>
        </div>

      </div>

      {/* Bottom Layout: Active System Alerts & Camera Status list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Alerts panel widget */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-white/5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Live Control Center Alerts</h4>
            </div>
            <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">
              WebSocket Connected
            </span>
          </div>
          <div className="space-y-3 flex-grow overflow-y-auto max-h-[160px]">
            {liveAlerts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No critical active alerts logged today.</p>
            ) : (
              liveAlerts.map((alert, idx) => (
                <div key={idx} className="p-3 bg-slate-950/80 rounded-lg border border-white/5 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        alert.severity === 'Critical' ? 'bg-red-500' : 'bg-amber-500'
                      }`}></span>
                      <span className="font-bold text-white uppercase">{alert.event_type}</span>
                    </div>
                    <p className="text-slate-300">{alert.description}</p>
                  </div>
                  <span className="text-[9px] text-slate-500 whitespace-nowrap">
                    {new Date(alert.timestamp || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cameras Status list widget */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
            <Camera className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Active Camera Feed Terminals</h4>
          </div>
          <div className="space-y-3">
            {[
              { id: 1, name: "CP Junction, Delhi", status: "Active" },
              { id: 2, name: "Gateway of India, Mumbai", status: "Active" },
              { id: 3, name: "Howrah Bridge, Kolkata", status: "Active" },
              { id: 4, name: "Electronic City, Bangalore", status: "Active" }
            ].map(cam => (
              <div key={cam.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                <span className="text-slate-300 font-medium">{cam.name}</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  {cam.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
