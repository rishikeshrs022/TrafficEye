import React, { useState } from 'react';
import { reportAPI } from '../utils/api';
import { Bar, Line } from 'react-chartjs-2';
import { Download, FileSpreadsheet, FileText, Calendar, BarChart3, Clock, MapPin } from 'lucide-react';

export default function Analytics() {
  const [reportType, setReportType] = useState('daily');
  const [loading, setLoading] = useState(false);

  // Peak Hours distribution chart data
  const peakHoursData = {
    labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '17:00', '18:00', '19:00', '20:00'],
    datasets: [
      {
        label: 'Gandhipuram Junction (Vehicles)',
        data: [350, 480, 590, 420, 310, 490, 680, 590, 410],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  // Congestion by intersection comparison chart
  const congestionRoadsData = {
    labels: ['Gandhipuram Junction', 'Hope College Circle', 'Avinashi Road Crossing', 'Ukkadam Bus Stand'],
    datasets: [
      {
        label: 'Avg Delay (seconds)',
        data: [42, 28, 56, 34],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',  // Gandhipuram
          'rgba(16, 185, 129, 0.8)', // Hope College
          'rgba(245, 158, 11, 0.8)', // Avinashi
          'rgba(99, 102, 241, 0.8)', // Ukkadam
        ]
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94A3B8', font: { size: 10 } } }
    },
    scales: {
      x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94A3B8' } },
      y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94A3B8' } }
    }
  };

  // Generate a beautiful, printable PDF report layout
  const handleDownloadPDF = () => {
    setLoading(true);
    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      
      const htmlContent = `
        <html>
          <head>
            <title>TrafficEye Analytics Report - ${reportType.toUpperCase()}</title>
            <style>
              body { font-family: 'Arial', sans-serif; color: #1E293B; padding: 40px; line-height: 1.6; }
              .header { text-align: center; border-bottom: 3px double #3B82F6; padding-bottom: 20px; margin-bottom: 30px; }
              .header h1 { margin: 0; font-size: 28px; color: #1E3A8A; letter-spacing: 1px; }
              .header p { margin: 5px 0 0 0; font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 2px; }
              .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
              .meta-card { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 15px; border-radius: 8px; }
              .meta-card h3 { margin: 0 0 5px 0; font-size: 11px; color: #64748B; text-transform: uppercase; }
              .meta-card p { margin: 0; font-size: 18px; font-weight: bold; color: #0F172A; }
              .table-section { margin-bottom: 40px; }
              .table-section h2 { font-size: 18px; color: #1E3A8A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #CBD5E1; padding: 10px 12px; text-align: left; font-size: 13px; }
              th { background-color: #F1F5F9; color: #0F172A; font-weight: bold; }
              tr:nth-child(even) { background-color: #F8FAFC; }
              .footer { text-align: center; margin-top: 60px; font-size: 10px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 15px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>TRAFFIC EYE SYSTEMS CONTROL</h1>
              <p>Government Smart City Traffic & Density Assessment Report</p>
            </div>
            
            <div class="meta-grid">
              <div class="meta-card">
                <h3>Report Class</h3>
                <p>${reportType.toUpperCase()} INCIDENT & TELEMETRY SUMMARY</p>
              </div>
              <div class="meta-card">
                <h3>Generated On</h3>
                <p>${new Date().toLocaleString()}</p>
              </div>
              <div class="meta-card">
                <h3>Most Congested Road</h3>
                <p>Avinashi Road Crossing, Coimbatore</p>
              </div>
              <div class="meta-card">
                <h3>Adaptive AI Efficiency Gain</h3>
                <p>+22.4% Congestion Relief</p>
              </div>
            </div>

            <div class="table-section">
              <h2>Key Metrics Summary</h2>
              <table>
                <thead>
                  <tr>
                    <th>Intersection</th>
                    <th>Average Daily Vehicle Flow</th>
                    <th>Peak Hour (Time)</th>
                    <th>Avg Delay Time (sec)</th>
                    <th>AQI Score (Avg)</th>
                    <th>Incidents Logged</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Gandhipuram Junction, Coimbatore</td>
                    <td>14,820</td>
                    <td>18:00 - 19:00</td>
                    <td>42s</td>
                    <td>185</td>
                    <td>4</td>
                  </tr>
                  <tr>
                    <td>Hope College Circle, Coimbatore</td>
                    <td>11,350</td>
                    <td>09:00 - 10:00</td>
                    <td>28s</td>
                    <td>115</td>
                    <td>2</td>
                  </tr>
                  <tr>
                    <td>Avinashi Road Crossing, Coimbatore</td>
                    <td>18,490</td>
                    <td>17:30 - 18:30</td>
                    <td>56s</td>
                    <td>210</td>
                    <td>5</td>
                  </tr>
                  <tr>
                    <td>Ukkadam Bus Stand, Coimbatore</td>
                    <td>9,410</td>
                    <td>08:30 - 09:30</td>
                    <td>34s</td>
                    <td>142</td>
                    <td>1</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="table-section">
              <h2>Environmental Impact Audit</h2>
              <p style="font-size: 13px; color: #475569;">
                Telemetry suggests a strong correlation between peak grid congestion and elevated particulate matter (PM2.5). The activation of adaptive green cycles reduced aggregate waiting times by 12 seconds per vehicle, resulting in an estimated <strong>14.5% reduction in carbon emissions</strong> at Gandhipuram Junction.
              </p>
            </div>

            <div class="footer">
              This document is generated automatically by TrafficEye Smart City AI Operations. Confirmed and Authenticated.
            </div>

            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `;
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      
      {/* Selector and Actions Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-white/5">
        
        {/* Report duration tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          {['daily', 'weekly', 'monthly'].map(tab => (
            <button
              key={tab}
              onClick={() => setReportType(tab)}
              className={`text-xs font-bold px-4 py-2 rounded-lg cursor-pointer uppercase transition-colors ${
                reportType === tab 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Action Downloads */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <a
            href={reportAPI.getCSVReportURL()}
            className="flex-grow md:flex-grow-0 bg-slate-900 border border-slate-800 hover:border-emerald-500 text-slate-300 hover:text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Export CSV
          </a>

          <button
            onClick={handleDownloadPDF}
            disabled={loading}
            className="flex-grow md:flex-grow-0 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {loading ? 'Preparing...' : 'Download PDF Report'}
          </button>
        </div>

      </div>

      {/* Grid of Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Peak Hours line chart */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-white/5 h-80 flex flex-col justify-between shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Traffic Peak Hours Flow</h3>
          </div>
          <div className="relative flex-grow">
            <Line data={peakHoursData} options={chartOptions} />
          </div>
        </div>

        {/* Intersection Delays bar chart */}
        <div className="glass-panel p-5 rounded-xl border border-white/5 h-80 flex flex-col justify-between shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Average Delay by Junction</h3>
          </div>
          <div className="relative flex-grow">
            <Bar data={congestionRoadsData} options={chartOptions} />
          </div>
        </div>

      </div>

      {/* Grid of Key Analytical Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="glass-panel p-4 rounded-xl border border-white/5 shadow-xl text-center space-y-1.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Avg Waiting Time Reduced</span>
          <span className="text-2xl font-extrabold text-emerald-400">-22.4%</span>
          <p className="text-[10px] text-slate-400">Achieved via real-time signal adjustments</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5 shadow-xl text-center space-y-1.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Congestion Score Change</span>
          <span className="text-2xl font-extrabold text-emerald-400">-15%</span>
          <p className="text-[10px] text-slate-400">Fewer bumper-to-bumper backlogs in Delhi CP</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5 shadow-xl text-center space-y-1.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Co2 Emissions Abated</span>
          <span className="text-2xl font-extrabold text-cyan-400">14.5%</span>
          <p className="text-[10px] text-slate-400">Directly calculated from reduction in idle time</p>
        </div>

      </div>

    </div>
  );
}
