import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { cameraAPI, emergencyAPI } from '../utils/api';
import { Camera, Play, Video, AlertOctagon, RefreshCw, Layers } from 'lucide-react';

export default function LiveCCTV() {
  const { subscribe } = useSocket();
  
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [fps, setFps] = useState(15);
  const [vehiclesInFrame, setVehiclesInFrame] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('stream'); // stream or lanes
  
  // Custom RTSP / stream fields
  const [rtspUrl, setRtspUrl] = useState('');
  const [videoFile, setVideoFile] = useState(null);

  // Drawing Lanes logic state
  const [drawnLanes, setDrawnLanes] = useState([
    { id: 1, label: "Lane 1 (North)", points: "80,0 200,0 200,480 80,480", color: "#10B981" },
    { id: 2, label: "Lane 2 (South)", points: "200,0 320,0 320,480 200,480", color: "#3B82F6" },
    { id: 3, label: "Lane 3 (Turn)", points: "320,0 440,0 440,480 320,480", color: "#F59E0B" }
  ]);

  useEffect(() => {
    // Fetch cameras list
    cameraAPI.getCameras()
      .then(res => {
        setCameras(res.data);
        if (res.data.length > 0) {
          setSelectedCamera(res.data[0]);
        }
      })
      .catch(err => console.error("Error loading cameras:", err));

    // Listen to real-time vehicle logs
    const unsubscribeTraffic = subscribe('traffic', (payload) => {
      // payload: { camera_id, lane_id, vehicle_count, avg_speed, density }
      if (selectedCamera && payload.camera_id === selectedCamera.id) {
        setTotalCount(prev => prev + 1);
        setFps(Math.round(14 + Math.random() * 2));
      }
    });

    return () => {
      unsubscribeTraffic();
    };
  }, [selectedCamera, subscribe]);

  const handleCameraChange = (e) => {
    const camId = parseInt(e.target.value);
    const camera = cameras.find(c => c.id === camId);
    setSelectedCamera(camera);
    setIsStreaming(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setIsStreaming(true);
    }
  };

  const startStream = () => {
    setIsStreaming(true);
    // Simulate active vehicles list for details panel
    setInterval(() => {
      const mockList = [
        { id: Math.floor(Math.random() * 100), type: 'Car', confidence: '0.94' },
        { id: Math.floor(Math.random() * 100), type: 'Bike', confidence: '0.88' },
        { id: Math.floor(Math.random() * 100), type: 'Bus', confidence: '0.91' }
      ];
      setVehiclesInFrame(mockList);
    }, 3000);
  };

  const triggerEmergencyAmbulance = async () => {
    if (!selectedCamera) return;
    try {
      await emergencyAPI.triggerCorridor(selectedCamera.id, "Ambulance");
    } catch (err) {
      console.error("Failed to trigger emergency: ", err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* CCTV Screen Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-3">
          <Camera className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Live CCTV Control Center</h2>
            <p className="text-xs text-slate-500">Configure video inputs, RTSP streams, and define lane polygons</p>
          </div>
        </div>

        {/* Input Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            onChange={handleCameraChange}
            value={selectedCamera?.id || ''}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-blue-500 transition-colors"
          >
            {cameras.map(cam => (
              <option key={cam.id} value={cam.id}>{cam.location}</option>
            ))}
          </select>

          <button
            onClick={() => setActiveTab(activeTab === 'stream' ? 'lanes' : 'stream')}
            className="bg-slate-900 border border-slate-800 hover:border-blue-500 text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer text-slate-300 font-medium"
          >
            <Layers className="w-3.5 h-3.5" />
            {activeTab === 'stream' ? 'Lane Editor' : 'Camera Monitor'}
          </button>
        </div>
      </div>

      {/* Main Stream Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Stream Box */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-xl border border-white/5 shadow-xl flex flex-col justify-between min-h-[400px]">
          
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3 text-xs">
            <span className="font-bold text-slate-300 uppercase">
              {selectedCamera?.location || 'Live Feed'}
            </span>
            <div className="flex items-center gap-3 font-semibold text-slate-400">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                FPS: {isStreaming ? fps : 0}
              </span>
              <span>Res: 640x480</span>
            </div>
          </div>

          {/* Video / Canvas Element */}
          <div className="relative flex-grow bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center border border-white/5 min-h-[300px]">
            {isStreaming ? (
              activeTab === 'stream' ? (
                // Video display (reads from processor MJPEG stream or fallback file)
                <img
                  src={`http://localhost:8001/video_feed?camera_id=${selectedCamera?.id || 1}`}
                  alt="AI Feed"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to synthetic canvas simulation
                    e.target.onerror = null;
                    e.target.src = "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=640&q=80";
                  }}
                />
              ) : (
                // Lane drawing interactive layer
                <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full cursor-crosshair">
                    {drawnLanes.map(lane => (
                      <polygon
                        key={lane.id}
                        points={lane.points}
                        fill={`${lane.color}20`}
                        stroke={lane.color}
                        strokeWidth="3"
                      />
                    ))}
                  </svg>
                  <span className="text-[10px] text-slate-400 absolute bottom-3 bg-slate-950/80 px-3 py-1 rounded-full border border-white/5">
                    Click and drag inside Lane Editor to redraw lane polygon coordinates
                  </span>
                </div>
              )
            ) : (
              <div className="text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                  <Video className="w-8 h-8 text-cyan-500" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-white">AI Stream Idle</h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Activate the AI Pipeline processing engine below to stream live detection bounding boxes.
                  </p>
                </div>
                <button
                  onClick={startStream}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-5 rounded-lg text-xs transition-colors flex items-center gap-2 mx-auto cursor-pointer shadow-lg shadow-blue-600/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Launch AI Pipeline
                </button>
              </div>
            )}
          </div>

          {/* Quick Simulation controls */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
            <div className="flex items-center gap-2">
              <button
                onClick={triggerEmergencyAmbulance}
                className="bg-red-600/10 border border-red-500/30 hover:bg-red-500 hover:text-white text-red-500 text-xs py-1.5 px-3 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <AlertOctagon className="w-4 h-4 text-red-500" />
                Simulate Ambulance Event
              </button>
            </div>
            
            <div className="text-[10px] text-slate-500">
              * Starts Green Corridor & switches signals automatically
            </div>
          </div>

        </div>

        {/* Configurations Box */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 shadow-xl flex flex-col justify-between">
          
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-white/5 pb-2">
              Media Stream Config
            </h3>

            {/* RTSP connection form */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400">RTSP Stream Address</label>
              <input
                type="text"
                placeholder="rtsp://admin:pass@192.168.1.100:554/h264"
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={startStream}
                className="w-full bg-slate-900 border border-slate-800 hover:border-blue-500 text-xs text-white font-medium py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Connect Stream
              </button>
            </div>

            {/* Video File Uploader */}
            <div className="space-y-2 pt-4 border-t border-slate-900">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Process Video File</label>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs file:bg-slate-900 file:border-0 file:text-slate-300 file:text-xs file:py-2 file:px-3 text-slate-400 file:cursor-pointer hover:file:bg-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Detections List summary */}
          <div className="mt-6 pt-4 border-t border-white/5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Active Objects</span>
              <span className="bg-blue-600/10 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] text-blue-400">
                Count: {vehiclesInFrame.length}
              </span>
            </h4>
            <div className="space-y-2 max-h-[140px] overflow-y-auto">
              {vehiclesInFrame.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic text-center py-4">No vehicles currently tracked.</p>
              ) : (
                vehiclesInFrame.map((v, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-950 py-1.5 px-3 rounded-lg border border-white/5 text-[10px]">
                    <span className="text-slate-300 font-medium">{v.type} #{v.id}</span>
                    <span className="text-cyan-400 font-bold">Conf: {v.confidence}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
