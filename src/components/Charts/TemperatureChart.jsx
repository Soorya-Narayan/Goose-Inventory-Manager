// src/components/Charts/TemperatureChart.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useAppContext } from '../../context/AppContext';
import styles from './TemperatureChart.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const fmtTime = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return String(iso);
  }
};

export default function TemperatureChart({ liveData, isLiveMode, historicData }) {
  const { isDarkTheme } = useAppContext();

  // Store history for multiple datasets
  const [history, setHistory] = useState({
    labels: [],
    main: [],
    caustic: [],
    hotWater: [],
    recovery: [],
    fresh: []
  });

  const [viewMode, setViewMode] = useState('detailed'); // 'detailed' or 'aesthetic'
  const mountedRef = useRef(false);

  const isHistoric = !!historicData;
  const lastHistoric = isHistoric ? historicData[historicData.length - 1] : null;

  // Extract current values safely
  const currentMain = isHistoric ? (lastHistoric?.temperature ?? lastHistoric?.Temperature ?? null) : (liveData?.temperature ?? null);
  const currentCaustic = isHistoric ? null : (liveData?.caustic?.temperature ?? null);
  const currentHot = isHistoric ? null : (liveData?.hotWater?.temperature ?? null);
  const currentRecovery = isHistoric ? null : (liveData?.recovery?.temperature ?? null);
  const currentFresh = isHistoric ? null : (liveData?.fresh?.temperature ?? null);

  const currentSetpoint = liveData?.temperatureSetpoint ?? 75;

  const stats = useMemo(() => {
    if (!history.main.length) return { min: 0, max: 0, avg: 0 };
    const vals = history.main;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { min, max, avg };
  }, [history.main]);

  const tempStatus = useMemo(() => {
    if (currentMain === null) return 'unknown';
    const diff = currentMain - currentSetpoint;
    if (Math.abs(diff) <= 2) return 'normal';
    if (diff > 2) return 'high';
    return 'low';
  }, [currentMain, currentSetpoint]);

  // Reset history when switching modes
  useEffect(() => {
    setHistory({
      labels: [],
      main: [],
      caustic: [],
      hotWater: [],
      recovery: [],
      fresh: [],
      live: []
    });
  }, [isLiveMode]);

  useEffect(() => {
    if (liveData && mountedRef.current) {
      setHistory(prev => {
        const newLabel = fmtTime(new Date());
        const maxPoints = 50;

        if (isLiveMode) {
          // LIVE MODE: only track the single IIH live value
          const liveVal = liveData?.temperature ?? 0;
          return {
            ...prev,
            labels: [...prev.labels, newLabel].slice(-maxPoints),
            live: [...(prev.live || []), liveVal].slice(-maxPoints),
          };
        }

        // SIMULATION MODE: track all sim series
        const updateSeries = (series, newVal) => {
          const val = newVal !== null ? newVal : (series[series.length - 1] || 0);
          return [...series, val].slice(-maxPoints);
        };

        return {
          labels: [...prev.labels, newLabel].slice(-maxPoints),
          main: updateSeries(prev.main, currentMain),
          caustic: updateSeries(prev.caustic, currentCaustic),
          hotWater: updateSeries(prev.hotWater, currentHot),
          recovery: updateSeries(prev.recovery, currentRecovery),
          fresh: updateSeries(prev.fresh, currentFresh),
          live: []
        };
      });
    }
  }, [liveData]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const data = useMemo(() => {
    const makeDataset = (label, data, color, isMain = false) => ({
      label,
      data,
      borderColor: color,
      backgroundColor: isMain ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
      borderWidth: isMain ? 3 : 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.4,
      fill: isMain
    });

    if (isHistoric) {
      const labels = historicData.map(pt => {
        try {
          return new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch { return String(pt.timestamp); }
      });
      const mainData = historicData.map(pt => pt.temperature ?? pt.Temperature ?? 0);
      
      return {
        labels,
        datasets: [
          makeDataset('Historic Temperature', mainData, '#8b5cf6', true)
        ]
      };
    }

    if (isLiveMode) {
      // Single live sensor line only
      return {
        labels: history.labels,
        datasets: [
          makeDataset('Live IIH Sensor', history.live || [], '#ef4444', true)
        ]
      };
    }

    const datasets = [
      makeDataset('Main Circuit', history.main, '#3b82f6', true),
      makeDataset('Caustic Tank', history.caustic, '#ec4899'),
      makeDataset('Hot Water', history.hotWater, '#f97316'),
      makeDataset('Recovery', history.recovery, '#14b8a6'),
      makeDataset('Fresh Water', history.fresh, '#0ea5e9'),
    ];

    if (currentSetpoint !== null && history.labels.length > 0) {
      datasets.push({
        label: 'Setpoint',
        data: Array(history.labels.length).fill(currentSetpoint),
        borderColor: '#f59e0b',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        tension: 0,
        fill: false,
      });
    }

    return { labels: history.labels, datasets };
  }, [history, currentSetpoint, viewMode, isDarkTheme, isLiveMode, historicData, isHistoric]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        display: true,
        ticks: { color: 'var(--text-secondary, #9ca3af)', maxTicksLimit: 8, maxRotation: 0, font: { size: 10 } },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        ticks: { color: 'var(--text-secondary, #9ca3af)', callback: (value) => `${value}°`, font: { size: 11 } },
        grid: { color: isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', drawTicks: false },
        border: { display: false },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          boxWidth: 6,
          color: isDarkTheme ? '#cbd5e1' : '#475569',
          font: { size: 11 }
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: isDarkTheme ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDarkTheme ? '#f1f5f9' : '#0f172a',
        bodyColor: isDarkTheme ? '#cbd5e1' : '#334155',
        borderColor: isDarkTheme ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        callbacks: { label: (context) => ` ${context.dataset.label}: ${Number(context.parsed.y).toFixed(1)}°C` }
      },
    },
    animation: { duration: 0 }, // Disable animation for performance with 5 lines
  }), [viewMode, isDarkTheme]);

  const toggleView = () => setViewMode(prev => prev === 'detailed' ? 'aesthetic' : 'detailed');

  /* ── Generate ambient fallback data ────────────────────────── */
  const ambientData = useMemo(() => {
    const pts = 24;
    const base = 68;
    const labels = Array.from({ length: pts }, (_, i) => {
      const d = new Date(); d.setMinutes(d.getMinutes() - (pts - i) * 2);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    const sine = (offset, amp, freq) =>
      Array.from({ length: pts }, (_, i) => base + amp * Math.sin((i + offset) / freq) + Math.random() * 1.2 - 0.6);
    return {
      labels,
      datasets: [
        { label: 'Main Circuit', data: sine(0, 6, 4), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.08)', borderWidth: 2.5, pointRadius: 0, tension: 0.4, fill: true },
        { label: 'Caustic Tank', data: sine(2, 4, 5), borderColor: '#ec4899', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: false },
        { label: 'Hot Water',    data: sine(4, 8, 3), borderColor: '#f97316', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: false },
      ],
    };
  }, []);

  if (!history.labels.length && !isHistoric) {
    return (
      <div className={styles.container} style={{ position: 'relative' }}>
        {/* Watermark */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          background: 'linear-gradient(135deg, rgba(var(--card-bg-rgb, 255,255,255),.7), rgba(var(--card-bg-rgb, 255,255,255),.5))',
          backdropFilter: 'blur(1px)',
          borderRadius: 12,
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: '14px 24px', borderRadius: 14,
            background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.2)',
          }}>
            <i className="fa-solid fa-satellite-dish" style={{ color: '#6366f1', fontSize: '1.4rem' }} />
            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#6366f1' }}>Simulation Mode</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Ambient trend shown · Connect to IIH for live data
            </span>
          </div>
        </div>

        {/* Ambient chart behind watermark */}
        <div className={styles.chartWrapper} style={{ height: '100%', opacity: 0.35 }}>
          <Line data={ambientData} options={{
            responsive: true, maintainAspectRatio: false,
            animation: false,
            scales: {
              x: { display: false },
              y: { display: false },
            },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
          }} />
        </div>
      </div>
    );
  }

  // Simplified container for just the chart when in aesthetic mode or just preference
  // Keeping the header for detailed mode as it has useful stats

  return (
    <div className={styles.container}>
      <button onClick={toggleView} className={styles.viewToggle} title="View Mode">
        <i className={`fa-solid ${viewMode === 'detailed' ? 'fa-chart-line' : 'fa-chart-simple'}`} />
      </button>

      {viewMode === 'detailed' && (
        <div className={styles.header}>
          <div className={styles.mainValue}>
            <div className={`${styles.statusIndicator} ${styles[tempStatus]}`} />
            <div className={styles.valueWrapper}>
              <span className={styles.value}>{currentMain?.toFixed(1) ?? '--'}</span>
              <span className={styles.unit}>°C</span>
            </div>
            <span className={styles.label}>Main Circuit</span>
          </div>

          <div className={styles.statsGrid}>
            {!isHistoric && (
              <>
                <div className={styles.stat}>
                  <span className={styles.statLabel} style={{ color: '#ec4899' }}>Caustic</span>
                  <span className={styles.statValue}>{currentCaustic?.toFixed(1)}°</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel} style={{ color: '#f97316' }}>Hot Water</span>
                  <span className={styles.statValue}>{currentHot?.toFixed(1)}°</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel} style={{ color: '#14b8a6' }}>Recovery</span>
                  <span className={styles.statValue}>{currentRecovery?.toFixed(1)}°</span>
                </div>
              </>
            )}
            {isHistoric && (
              <div className={styles.stat}>
                <span className={styles.statLabel} style={{ color: '#8b5cf6' }}>Historical Period</span>
                <span className={styles.statValue}>{historicData.length} pts</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.chartWrapper} style={{ height: viewMode === 'detailed' ? 'calc(100% - 80px)' : '100%' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}