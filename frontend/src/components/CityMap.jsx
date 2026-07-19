import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Video, Activity, Info, Eye, Layers, EyeOff, Bus, Flame, Compass, Wind } from 'lucide-react';

// Custom SVG Pulsing Pins for Leaflet (Prevents missing asset failures and looks highly futuristic!)
const createPulsingIcon = (color) => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style="background-color: ${color}"></span>
        <span class="relative inline-flex rounded-full h-4 w-4 border border-white" style="background-color: ${color}"></span>
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Icon for Bus stops
const createIcon = (iconHtml) => {
  return L.divIcon({
    html: `<div class="bg-slate-900 border border-slate-700 p-1.5 rounded-full flex items-center justify-center text-cyan-400 shadow-xl">${iconHtml}</div>`,
    className: 'custom-div-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

export default function CityMap() {
  const { subscribe } = useSocket();

  // Coimbatore Center Coordinates
  const centerPos = [11.0168, 76.9558];

  // Map settings states
  const [mapType, setMapType] = useState('default'); // default, satellite, terrain
  const [overlays, setOverlays] = useState({
    publicTransport: false,
    traffic: true,
    bicycling: false,
    streetView: false,
    airQuality: false,
    wildfire: false,
    raisedBuildings: false
  });

  const [showStreetViewModal, setShowStreetViewModal] = useState(false);

  // Map markers state
  const [markers, setMarkers] = useState([
    {
      id: 1,
      type: 'camera',
      name: 'Gandhipuram Junction Camera',
      coords: [11.0182, 76.9615],
      congestion: 'Low',
      color: '#10B981', // green
      details: 'Active AI Feed, Lane counting enabled'
    },
    {
      id: 2,
      type: 'signal',
      name: 'Hope College Circle Signal #12',
      coords: [11.0245, 76.9968],
      congestion: 'Medium',
      color: '#F59E0B', // orange
      details: 'Signal Mode: Adaptive AI active'
    },
    {
      id: 3,
      type: 'crowd',
      name: 'Ukkadam Bus Stand Crowd Area',
      coords: [10.9925, 76.9610],
      congestion: 'Critical',
      color: '#EF4444', // red
      details: 'People Count: 35, Risk: High Alert'
    },
    {
      id: 4,
      type: 'camera',
      name: 'Avinashi Road Crossing Camera',
      coords: [11.0160, 76.9750],
      congestion: 'Low',
      color: '#10B981',
      details: 'Active Feed'
    }
  ]);

  useEffect(() => {
    // Listen to real-time events to move/update map pins
    const unsubscribeTraffic = subscribe('traffic', (payload) => {
      if (payload.camera_id === 1) {
        const densityVal = payload.density;
        const color = densityVal > 75 ? '#EF4444' : densityVal > 40 ? '#F59E0B' : '#10B981';
        setMarkers(prev => prev.map(m => m.id === 1 ? {
          ...m,
          congestion: densityVal > 75 ? 'Critical' : densityVal > 40 ? 'Medium' : 'Low',
          color: color,
          details: `Active AI Feed. Density: ${Math.round(densityVal)}%, Count: ${payload.vehicle_count}`
        } : m));
      }
    });

    const unsubscribeAmbulance = subscribe('ambulance', (payload) => {
      // Spawn a dynamic Ambulance Marker on the map!
      const ambulanceMarker = {
        id: 99,
        type: 'emergency',
        name: 'Ambulance Unit (AMB-408)',
        coords: [11.0200, 76.9630],
        congestion: 'Critical',
        color: '#3B82F6', // Blue flashing marker
        details: 'Active Emergency green corridor route activated'
      };
      setMarkers(prev => [ambulanceMarker, ...prev.filter(m => m.id !== 99)]);

      // Delete the ambulance marker after 12 seconds
      setTimeout(() => {
        setMarkers(prev => prev.filter(m => m.id !== 99));
      }, 12000);
    });

    return () => {
      unsubscribeTraffic();
      unsubscribeAmbulance();
    };
  }, [subscribe]);

  // Tile Layer options mapping
  const tileLayers = {
    default: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    },
    terrain: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: '&copy; OpenTopoMap contributors'
    }
  };

  const handleOverlayToggle = (key) => {
    setOverlays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      
      {/* Map Control Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-3">
          <Navigation className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Live City GIS Map Room</h2>
            <p className="text-xs text-slate-500">Centrally monitoring Coimbatore landmarks using multi-layer layers</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-400 text-[10px] uppercase">Camera Node</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-slate-400 text-[10px] uppercase">Signal Status</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="text-slate-400 text-[10px] uppercase">Crowd Alert</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-slate-400 text-[10px] uppercase">Emergency Priority</span>
          </div>
        </div>
      </div>

      {/* Workspace Split Layout: Map + Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* GIS Controls side panel */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            
            {/* Map Type selector */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Map Type Scope
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {['default', 'satellite', 'terrain'].map(type => (
                  <button
                    key={type}
                    onClick={() => setMapType(type)}
                    className={`text-[10px] font-extrabold uppercase py-2 px-1 rounded-lg border transition-all cursor-pointer text-center ${
                      mapType === type 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Map details checkmarks */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                Map Layers Overlay
              </h3>
              <div className="space-y-2">
                {Object.keys(overlays).map((key) => {
                  const label = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (str) => str.toUpperCase());
                  return (
                    <label key={key} className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer select-none py-1 hover:text-white transition-colors">
                      <input
                        type="checkbox"
                        checked={overlays[key]}
                        onChange={() => handleOverlayToggle(key)}
                        className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 cursor-pointer w-4 h-4"
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg text-[10px] text-blue-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <p className="leading-relaxed">
              GIS layers use city mesh maps. Public transport displays local bus routes and street views.
            </p>
          </div>
        </div>

        {/* Map Box */}
        <div className="xl:col-span-3 glass-panel p-2 rounded-xl border border-white/5 shadow-xl h-[520px] overflow-hidden relative">
          
          <MapContainer
            center={centerPos}
            zoom={14}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Dynamic Map Tile Selector */}
            <TileLayer
              attribution={tileLayers[mapType].attribution}
              url={tileLayers[mapType].url}
            />

            {/* Core Camera & Signal Markers */}
            {markers.map(marker => (
              <Marker
                key={marker.id}
                position={marker.coords}
                icon={createPulsingIcon(marker.color)}
              >
                <Popup className="custom-popup bg-slate-950 text-white rounded-lg border border-slate-800">
                  <div className="space-y-1.5 p-1 text-slate-300">
                    <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-bold text-xs text-white uppercase">{marker.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-300 font-medium leading-relaxed">{marker.details}</p>
                    <div className="flex justify-between items-center text-[9px] pt-1">
                      <span className="text-slate-500">Type: {marker.type.toUpperCase()}</span>
                      <span className="font-semibold" style={{ color: marker.color }}>Status: {marker.congestion}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Ukkadam Bus Stand Crowd radius circle overlay */}
            <Circle
              center={[10.9925, 76.9610]}
              pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.12 }}
              radius={100}
            />

            {/* GIS OVERLAYS CONDITIONAL RENDERINGS */}

            {/* 1. Public Transport: Show bus stop markers */}
            {overlays.publicTransport && (
              <>
                <Marker 
                  position={[11.0175, 76.9608]} 
                  icon={createIcon(`<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3C13 6.9 11.8 6 10.5 6H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h2m10-1h2c.6 0 1-.4 1-1v-3m-15 4h10m-3-11v4M6 10h4"/></svg>`)}
                >
                  <Popup><span className="text-xs font-bold text-slate-900">Gandhipuram Main Bus Stand</span></Popup>
                </Marker>
                <Marker 
                  position={[11.0242, 76.9960]} 
                  icon={createIcon(`<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3C13 6.9 11.8 6 10.5 6H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h2m10-1h2c.6 0 1-.4 1-1v-3m-15 4h10m-3-11v4M6 10h4"/></svg>`)}
                >
                  <Popup><span className="text-xs font-bold text-slate-900">Hope College Stop</span></Popup>
                </Marker>
              </>
            )}

            {/* 2. Traffic Overlay: Show colored lines on highway routes */}
            {overlays.traffic && (
              <>
                {/* Gandhipuram to Hope College (Red - Congested route) */}
                <Polyline 
                  positions={[[11.0182, 76.9615], [11.0205, 76.9800], [11.0245, 76.9968]]} 
                  pathOptions={{ color: '#EF4444', weight: 5, opacity: 0.7 }}
                />
                {/* Ukkadam to Gandhipuram (Green - Free route) */}
                <Polyline 
                  positions={[[10.9925, 76.9610], [11.0050, 76.9600], [11.0182, 76.9615]]} 
                  pathOptions={{ color: '#10B981', weight: 5, opacity: 0.7 }}
                />
              </>
            )}

            {/* 3. Bicycling: Cyan dashed trails around Race Course */}
            {overlays.bicycling && (
              <Polyline 
                positions={[[11.0020, 76.9740], [10.9980, 76.9720], [10.9960, 76.9760], [11.0010, 76.9790], [11.0020, 76.9740]]}
                pathOptions={{ color: '#06B6D4', weight: 3, dashArray: '6, 6', opacity: 0.8 }}
              />
            )}

            {/* 4. Street View Pegman Pin */}
            {overlays.streetView && (
              <Marker 
                position={[11.0170, 76.9610]} 
                icon={createIcon(`<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="6" r="3"/><path d="M12 9v12m-4-8h8m-8-4v3m8-3v3"/></svg>`)}
              >
                <Popup>
                  <div className="p-1 text-center space-y-2">
                    <span className="text-xs font-bold text-slate-900 block">Gandhipuram Street View</span>
                    <button 
                      onClick={() => setShowStreetViewModal(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-2.5 rounded text-[9px] cursor-pointer"
                    >
                      Enter Street View
                    </button>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* 5. Air Quality Heat Circles */}
            {overlays.airQuality && (
              <>
                <Circle 
                  center={[11.0182, 76.9615]} 
                  radius={280} 
                  pathOptions={{ color: '#F59E0B', fillColor: '#F59E0B', fillOpacity: 0.18 }}
                />
                <Circle 
                  center={[10.9925, 76.9610]} 
                  radius={220} 
                  pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.22 }}
                />
              </>
            )}

            {/* 6. Wildfire Periphery Warning */}
            {overlays.wildfire && (
              <Marker 
                position={[10.9500, 76.8800]} 
                icon={createIcon(`<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`)}
              >
                <Popup>
                  <div className="space-y-1 text-slate-800">
                    <span className="text-xs font-bold text-red-600 block uppercase flex items-center gap-1">
                      <Flame className="w-4 h-4 text-red-500" /> Brush Fire Alert
                    </span>
                    <p className="text-[10px] leading-relaxed">Minor grass fire detected near Madukkarai hills. Smoke vector monitored.</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* 7. Raised Buildings Footprints */}
            {overlays.raisedBuildings && (
              <>
                {/* Shaded polygon shapes representing building footprints */}
                <Polygon 
                  positions={[[11.0188, 76.9608], [11.0192, 76.9608], [11.0192, 76.9618], [11.0188, 76.9618]]}
                  pathOptions={{ color: '#475569', fillColor: '#475569', fillOpacity: 0.6, weight: 1 }}
                />
                <Polygon 
                  positions={[[11.0152, 76.9740], [11.0158, 76.9740], [11.0158, 76.9750], [11.0152, 76.9750]]}
                  pathOptions={{ color: '#475569', fillColor: '#475569', fillOpacity: 0.6, weight: 1 }}
                />
              </>
            )}

          </MapContainer>

          {/* Street view mock panorama modal */}
          {showStreetViewModal && (
            <div className="absolute inset-0 bg-slate-950/90 z-[2000] p-4 flex flex-col justify-between rounded-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Gandhipuram Street View Hub</span>
                <button 
                  onClick={() => setShowStreetViewModal(false)}
                  className="text-slate-400 hover:text-white font-extrabold text-sm"
                >
                  ✕ Close View
                </button>
              </div>
              <div className="flex-grow rounded-lg overflow-hidden relative bg-slate-900 border border-slate-800">
                <img 
                  src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80" 
                  alt="Street View"
                  className="w-full h-full object-cover filter brightness-75"
                />
                <div className="absolute bottom-4 left-4 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-white/5 text-[10px] text-slate-300">
                  Gandhipuram Junction Ring Road, Coimbatore
                </div>
              </div>
              <span className="text-[9px] text-slate-500 text-center mt-2 uppercase tracking-widest">Mock panoramic visual overlay</span>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
