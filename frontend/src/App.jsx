import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LiveCCTV from './components/LiveCCTV';
import CityMap from './components/CityMap';
import SignalController from './components/SignalController';
import PollutionMonitor from './components/PollutionMonitor';
import AlertsPanel from './components/AlertsPanel';
import Analytics from './components/Analytics';
import AdminPanel from './components/AdminPanel';

import { 
  LayoutDashboard, 
  Video, 
  Map, 
  Cpu, 
  Wind, 
  Bell, 
  BarChart, 
  Settings, 
  LogOut, 
  User,
  Shield,
  Eye
} from 'lucide-react';

function DashboardLayout() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['Admin', 'Traffic Police', 'City Authority'] },
    { id: 'cctv', label: 'CCTV Monitor', icon: Video, roles: ['Admin', 'Traffic Police', 'City Authority'] },
    { id: 'map', label: 'Live City Map', icon: Map, roles: ['Admin', 'Traffic Police', 'City Authority'] },
    { id: 'signals', label: 'Adaptive Signals', icon: Cpu, roles: ['Admin', 'Traffic Police'] },
    { id: 'pollution', label: 'Eco Monitor', icon: Wind, roles: ['Admin', 'Traffic Police', 'City Authority'] },
    { id: 'alerts', label: 'Alert Center', icon: Bell, roles: ['Admin', 'Traffic Police', 'City Authority'] },
    { id: 'analytics', label: 'Analytics Reports', icon: BarChart, roles: ['Admin', 'Traffic Police', 'City Authority'] },
    { id: 'admin', label: 'Admin Panel', icon: Settings, roles: ['Admin'] }
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'cctv': return <LiveCCTV />;
      case 'map': return <CityMap />;
      case 'signals': return <SignalController />;
      case 'pollution': return <PollutionMonitor />;
      case 'alerts': return <AlertsPanel />;
      case 'analytics': return <Analytics />;
      case 'admin': return <AdminPanel />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#070A13]">
      
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-white/5 flex flex-col justify-between shrink-0 h-full">
        <div className="flex flex-col h-full">
          
          {/* Logo Brand area */}
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 shadow-inner">
              <Eye className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-widest font-heading">TRAFFIC EYE</h2>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Control Room v1.0</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto">
            {filteredNavItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === item.id 
                      ? 'bg-blue-600/10 border border-blue-500/20 text-cyan-400 glow-border-cyan' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/2'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>

        </div>

        {/* User Card & Logout Footer */}
        <div className="p-4 border-t border-white/5 space-y-3">
          <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-lg border border-white/5">
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
              <User className="w-4 h-4" />
            </div>
            <div className="truncate text-xs">
              <h4 className="font-bold text-white leading-none mb-1">{user.username}</h4>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-cyan-500" />
                {user.role}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full bg-slate-950 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout Session
          </button>
        </div>

      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-grow flex flex-col h-full overflow-hidden">
        
        {/* Header Bar */}
        <header className="h-16 glass-panel border-b border-white/5 flex items-center justify-between px-8 shrink-0">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              {navItems.find(item => item.id === activeTab)?.label} Dashboard
            </h1>
            <p className="text-[10px] text-slate-500">Government Smart City Adaptive Congestion Control Room</p>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Live telemetry connected
            </div>
          </div>
        </header>

        {/* Dynamic Workspace Area */}
        <main className="flex-grow p-8 overflow-y-auto">
          {renderContent()}
        </main>

      </div>

    </div>
  );
}

function AuthWrapper() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-xs text-slate-500 uppercase tracking-widest">
        Loading System Console...
      </div>
    );
  }

  return user ? (
    <SocketProvider>
      <DashboardLayout />
    </SocketProvider>
  ) : (
    <Login />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
}
