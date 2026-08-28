import React, { useEffect, useState, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { useAppContext } from '../../context/AppContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const PARAMS = {
  tempSupply: { label: 'Temp Supply (°C)', color: '#3b82f6', yAxisID: 'yTemp', min: 0, max: 100, fillColor: 'rgba(59, 130, 246, 0.2)' },
  tempReturn: { label: 'Temp Return (°C)', color: '#06b6d4', yAxisID: 'yTemp', min: 0, max: 100, fillColor: 'rgba(6, 182, 212, 0.2)' },
  conductivity: { label: 'Conductivity (mS)', color: '#8b5cf6', yAxisID: 'yCond', min: 0, max: 100, fillColor: 'rgba(139, 92, 246, 0.2)' },
  flowRate: { label: 'Flow Rate (L/min)', color: '#10b981', yAxisID: 'yFlow', min: 0, max: 200, fillColor: 'rgba(16, 185, 129, 0.2)' },
  pressure: { label: 'Pressure (bar)', color: '#f59e0b', yAxisID: 'yPress', min: 0, max: 6, fillColor: 'rgba(245, 158, 11, 0.2)' }
};

const TrendsChart = ({ cycleId }) => {
  const { isDarkTheme, liveParameters } = useAppContext();
  const chartRef = useRef(null);

  const [chartData, setChartData] = useState({
    labels: Array(60).fill(''),
    datasets: Object.entries(PARAMS).map(([key, cfg]) => ({
      label: cfg.label,
      data: Array(60).fill(null),
      borderColor: cfg.color,
      backgroundColor: cfg.fillColor,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.4,
      yAxisID: cfg.yAxisID,
      fill: true
    }))
  });

  const [hasData, setHasData] = useState(false);

  // Live polling
  useEffect(() => {
    if (cycleId !== 'live') return;

    // We need to import api here dynamically or at the top. Let's assume it's imported, wait, I need to add import api from '../../services/api';
    const tagIds = [
      'ns=sim;s=Tank1_Temperature',
      'ns=sim;s=Recovery_Temp',
      'ns=sim;s=Conductivity',
      'ns=sim;s=Flow_Rate',
      'ns=sim;s=Main_Pressure'
    ];

    const fetchLiveData = async () => {
      try {
        const { getMultipleTagValues } = await import('../../services/api.js');
        const res = await getMultipleTagValues(tagIds);
        
        const map = {};
        (res.values || []).forEach(v => { map[v.name] = v.value; });

        setChartData(prev => {
          const now = new Date().toLocaleTimeString();
          const newLabels = [...prev.labels.slice(1), now];
          let anyDataFound = false;

          const newDatasets = prev.datasets.map(ds => {
            let val = null;
            if (ds.label === PARAMS.tempSupply.label && map.Tank1_Temperature !== undefined) val = map.Tank1_Temperature;
            if (ds.label === PARAMS.tempReturn.label && map.Recovery_Temp !== undefined) val = map.Recovery_Temp;
            if (ds.label === PARAMS.conductivity.label && map.Conductivity !== undefined) val = map.Conductivity;
            if (ds.label === PARAMS.flowRate.label && map.Flow_Rate !== undefined) val = map.Flow_Rate;
            if (ds.label === PARAMS.pressure.label && map.Main_Pressure !== undefined) val = map.Main_Pressure;

            if (val !== null) anyDataFound = true;
            return { ...ds, data: [...ds.data.slice(1), val] };
          });

          if (anyDataFound) setHasData(true);
          return { labels: newLabels, datasets: newDatasets };
        });
      } catch (e) {
        console.error("TrendsChart fetch error:", e);
      }
    };

    const interval = setInterval(fetchLiveData, 2000);
    fetchLiveData(); // Fetch immediately

    return () => clearInterval(interval);
  }, [cycleId]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        ticks: { color: isDarkTheme ? '#94a3b8' : '#64748b', maxTicksLimit: 8 },
        grid: { display: false }
      },
      yTemp: {
        type: 'linear', display: true, position: 'left',
        title: { display: true, text: 'Temp (°C)', color: PARAMS.tempSupply.color, font: { weight: 'bold' } },
        grid: { color: isDarkTheme ? '#334155' : '#e2e8f0' },
        ticks: { color: isDarkTheme ? '#cbd5e1' : '#475569' }
      },
      yCond: { type: 'linear', display: false, position: 'right' },
      yFlow: { type: 'linear', display: false, position: 'right' },
      yPress: { type: 'linear', display: false, position: 'right' }
    },
    plugins: {
      legend: { position: 'top', align: 'end', labels: { color: isDarkTheme ? '#e2e8f0' : '#1e293b', usePointStyle: true } },
      tooltip: { mode: 'index', intersect: false }
    }
  };

  /* ── Generate ambient fallback data ────────────────────────── */
  const ambientData = React.useMemo(() => {
    const pts = 40;
    const labels = Array.from({ length: pts }, (_, i) => {
      const d = new Date(); d.setMinutes(d.getMinutes() - (pts - i) * 2);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    const sine = (offset, amp, freq, base) =>
      Array.from({ length: pts }, (_, i) => base + amp * Math.sin((i + offset) / freq) + Math.random() * (amp*0.1));
    return {
      labels,
      datasets: [
        { label: PARAMS.tempSupply.label, data: sine(0, 5, 8, 75), borderColor: PARAMS.tempSupply.color, backgroundColor: PARAMS.tempSupply.fillColor, borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true, yAxisID: 'yTemp' },
        { label: PARAMS.tempReturn.label, data: sine(4, 4, 8, 65), borderColor: PARAMS.tempReturn.color, backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: false, yAxisID: 'yTemp' },
        { label: PARAMS.flowRate.label,   data: sine(10, 10, 5, 120), borderColor: PARAMS.flowRate.color, backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: false, yAxisID: 'yFlow' },
        { label: PARAMS.conductivity.label, data: sine(2, 2, 6, 25), borderColor: PARAMS.conductivity.color, backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: false, yAxisID: 'yCond' },
      ],
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '400px' }}>
      {!hasData ? (
        <>
          {/* Watermark Overlay */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
            background: isDarkTheme ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(2px)',
            borderRadius: 12,
          }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              padding: '20px 32px', borderRadius: 16,
              background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.2)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
            }}>
              <i className="fa-solid fa-satellite-dish" style={{ color: '#6366f1', fontSize: '2rem' }} />
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#6366f1', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Simulation Mode</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '240px' }}>
                Ambient trends shown. Connect to IIH DataService for live telemetry.
              </div>
            </div>
          </div>
          
          {/* Ambient Chart (Behind Watermark) */}
          <div style={{ opacity: 0.4, height: '100%' }}>
            <Line options={{ ...options, animation: false, plugins: { ...options.plugins, tooltip: { enabled: false } } }} data={ambientData} />
          </div>
        </>
      ) : (
        <Line ref={chartRef} options={options} data={chartData} />
      )}
    </div>
  );
};

export default TrendsChart;
