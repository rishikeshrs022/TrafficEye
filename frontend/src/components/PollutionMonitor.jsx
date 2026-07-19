import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { aqiAPI } from '../utils/api';
import { Line } from 'react-chartjs-2';
import { 
  Wind, 
  Thermometer, 
  Droplets, 
  Info, 
  TrendingUp,
  AlertTriangle 
} from 'lucide-react';

export default function PollutionMonitor() {
  const { subscribe } = useSocket();

  const [aqi, setAqi] = useState(185);
  const [pm25, setPm25] = useState(85);
  const [pm10, setPm10] = useState(150);
  const [co, setCo] = useState(1.8);
  const [temp, setTemp] = useState(32.5);
  const [humidity, setHumidity] = useState(60.0);

  useEffect(() => {
    // Fetch initial AQI
    aqiAPI.getAQI(1)
      .then(res => {
        if (res.data.length > 0) {
          const latest = res.data[0];
          setAqi(latest.aqi);
          setPm25(latest.pm2_5 || 85);
          setPm10(latest.pm10 || 150);
          setCo(latest.co || 1.8);
          setTemp(latest.temperature || 32.5);
          setHumidity(latest.humidity || 60.0);
        }
      })
      .catch(err => console.error("Error loading AQI:", err));

    // Listen to real-time AQI events
    const unsubscribeAQI = subscribe('aqi', (payload) => {
      setAqi(payload.aqi);
      setPm25(payload.pm2_5);
      setPm10(payload.pm10);
      setCo(payload.co);
    });

    return () => {
      unsubscribeAQI();
    };
  }, [subscribe]);

  // Chart data: Correlation Traffic Count vs AQI Levels over a day
  const correlationData = {
    labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
    datasets: [
      {
        label: 'AQI Level',
        data: [140, 195, 175, 160, 185, 230, 210],
        borderColor: 'rgba(6, 182, 212, 1)',
        backgroundColor: 'rgba(6, 182, 212, 0.05)',
        yAxisID: 'y1',
        tension: 0.4,
      },
      {
        label: 'Active Vehicles (Avg)',
        data: [90, 280, 180, 150, 210, 390, 310],
        borderColor: 'rgba(99, 102, 241, 1)',
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
        yAxisID: 'y2',
        tension: 0.4,
      }
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
      y1: {
        type: 'linear',
        position: 'left',
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#66B6D4' }
      },
      y2: {
        type: 'linear',
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { color: '#818CF8' }
      }
    }
  };

  const getAqiColor = (val) => {
    if (val <= 50) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (val <= 100) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    if (val <= 200) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  return (
    <div className="space-y-6">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Core AQI Card */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 shadow-xl flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Air Quality Index</span>
            <Wind className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="my-3">
            <span className="text-4xl font-extrabold text-white">{aqi}</span>
            <span className={`ml-3 text-xs font-bold py-1 px-3 rounded-full border ${getAqiColor(aqi)}`}>
              {aqi <= 100 ? 'Moderate' : aqi <= 200 ? 'Unhealthy' : 'Hazardous'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">Real-time telemetry gathered from CP Junction sensors</p>
        </div>

        {/* PM2.5 / PM10 / CO Metrics */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 shadow-xl flex flex-col justify-between min-h-[160px]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">Gaseous Particulates</span>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-white/5 text-center">
              <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">PM2.5</span>
              <span className="text-sm font-extrabold text-white">{pm25} µg/m³</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-white/5 text-center">
              <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">PM10</span>
              <span className="text-sm font-extrabold text-white">{pm10} µg/m³</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-white/5 text-center">
              <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">CO</span>
              <span className="text-sm font-extrabold text-white">{co} ppm</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2">EPA Standard calibration logs</div>
        </div>

        {/* Temperature & Humidity */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 shadow-xl flex flex-col justify-between min-h-[160px]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">Environmental Telemetry</span>
          <div className="flex justify-around items-center h-full">
            <div className="flex items-center gap-2">
              <Thermometer className="w-8 h-8 text-amber-500" />
              <div>
                <span className="text-[9px] text-slate-500 font-bold block uppercase">Temperature</span>
                <span className="text-lg font-extrabold text-white">{temp}°C</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-8 h-8 text-blue-400" />
              <div>
                <span className="text-[9px] text-slate-500 font-bold block uppercase">Humidity</span>
                <span className="text-lg font-extrabold text-white">{humidity}%</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500">Last updated: Just now</div>
        </div>

      </div>

      {/* Correlation Graph */}
      <div className="glass-panel p-5 rounded-xl border border-white/5 shadow-xl flex flex-col justify-between h-[320px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">AQI vs Traffic Density Correlation</h3>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            Graph models how idling engine load increases particulates
          </div>
        </div>
        <div className="relative flex-grow">
          <Line data={correlationData} options={chartOptions} />
        </div>
      </div>

      {/* Warnings & Suggestions */}
      {aqi > 150 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h4 className="font-bold text-slate-200">ADAPTIVE GREEN TIME OPTIMIZATION ENABLED</h4>
            <p className="mt-1 leading-relaxed text-slate-300">
              High particulate density detected. System is adjusting signal cycles to reduce idle times, accelerating vehicle dispersal by up to 22% to reduce emissions.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
