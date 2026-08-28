// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import api from '../services/api';

import KpiCard from '../components/KpiCard';
import CycleProgress from '../components/CycleProgress';
import TankStatus from '../components/TankStatus';
import RecentCyclesTable from '../components/RecentCyclesTable';
import ActiveAlarmsList from '../components/ActiveAlarmsList';
import TemperatureChart from '../components/Charts/TemperatureChart';
import WaterUsageChart from '../components/Charts/WaterUsageChart';
import CircuitSelector from '../components/CircuitSelector';
import DeviationIntelligence from '../components/DeviationIntelligence';

/* ─── Inline page styles ─────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap');

/* ── Shimmer animation for KPI skeletons ──────────────────── */
@keyframes kpi-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes dp-pulse {
  0%,100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
  50%      { opacity: .6; box-shadow: 0 0 8px 2px currentColor; }
}

@keyframes dp-fadeup {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes dp-spin {
  to { transform: rotate(360deg); }
}

/* ── Page wrapper ────────────────────────────────────────────── */
.dp-page {
  padding: clamp(18px, 2.2vw, 32px);
  max-width: 1760px;
  margin: 0 auto;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  animation: dp-fadeup 0.45s cubic-bezier(.16,1,.3,1) both;
}

/* ── Hero header ─────────────────────────────────────────────── */
.dp-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 28px;
  padding: 22px 28px;
  border-radius: 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.dp-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(99,102,241,.06) 0%, rgba(59,130,246,.04) 50%, transparent 100%);
  pointer-events: none;
}

.dp-hero-accent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 5px;
  background: linear-gradient(90deg, #6366f1, #3b82f6, #0ea5e9, #22c55e, #6366f1);
  background-size: 300% 100%;
  animation: dp-gradient-shift 5s linear infinite;
  filter: drop-shadow(0 1px 4px rgba(99,102,241,.5));
}

@keyframes dp-gradient-shift {
  0%   { background-position: 0% 50%; }
  100% { background-position: 300% 50%; }
}

/* Subtle dot mesh pattern on hero */
.dp-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, var(--border-color) 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: 0.35;
  pointer-events: none;
}

/* ── Simulation mode banner ────────────────────────────────────── */
.dp-sim-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, rgba(99,102,241,.07), rgba(59,130,246,.05));
  border: 1px solid rgba(99,102,241,.22);
  font-size: 0.82rem;
  color: var(--text-secondary);
  animation: dp-fadeup .35s ease both;
}
.dp-sim-banner i { color: #6366f1; flex-shrink: 0; }

.dp-hero-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dp-hero-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #6366f1, #3b82f6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: #fff;
  box-shadow: 0 8px 20px rgba(99,102,241,.35);
  flex-shrink: 0;
}

.dp-hero h1 {
  margin: 0 0 3px;
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  font-weight: 900;
  color: transparent;
  background: linear-gradient(135deg, var(--text-primary) 0%, #6366f1 150%);
  -webkit-background-clip: text;
  background-clip: text;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.dp-hero-sub {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.dp-hero-sub p {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.dp-last-update {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: var(--text-secondary);
  background: var(--border-color);
  padding: 2px 8px;
  border-radius: 20px;
  opacity: 0.85;
}

/* ── Connection badge ─────────────────────────────────────────── */
.dp-conn-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 30px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  transition: all 0.4s;
  border: 1.5px solid;
}
.dp-conn-badge.online {
  background: rgba(34,197,94,.1);
  border-color: rgba(34,197,94,.35);
  color: #16a34a;
}
.dp-conn-badge.offline {
  background: rgba(245,158,11,.1);
  border-color: rgba(245,158,11,.35);
  color: #d97706;
}
.dp-conn-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dp-conn-badge.online .dp-conn-dot {
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
  animation: dp-pulse 2.2s infinite;
}
.dp-conn-badge.offline .dp-conn-dot {
  background: #f59e0b;
}

/* ── Error banner ─────────────────────────────────────────────── */
.dp-error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 18px;
  border-radius: 12px;
  margin-bottom: 22px;
  background: rgba(239,68,68,.07);
  border: 1px solid rgba(239,68,68,.25);
  font-size: 0.84rem;
  color: var(--text-primary);
  animation: dp-fadeup .35s ease both;
}
.dp-error i { color: #ef4444; flex-shrink: 0; }

/* ── Section header ───────────────────────────────────────────── */
.dp-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.dp-section-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px 4px 8px;
  border-radius: 20px;
  font-size: 0.67rem;
  font-weight: 800;
  letter-spacing: 1.1px;
  text-transform: uppercase;
  background: var(--border-color);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.dp-section-pill i { font-size: 0.65rem; }
.dp-section-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--border-color), transparent);
}

/* ── KPI Grid ─────────────────────────────────────────────────── */
.dp-kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
  margin-bottom: 28px;
}

.dp-kpi-cell {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(0,0,0,.05), 0 0 0 0 transparent;
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
  overflow: hidden;
  cursor: default;
}
.dp-kpi-cell:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0,0,0,.10);
}

/* ── Main grid ────────────────────────────────────────────────── */
.dp-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
}

/* ── Dashboard card ───────────────────────────────────────────── */
.dp-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(0,0,0,.05);
  padding: clamp(16px, 1.8vw, 22px);
  transition: box-shadow .22s ease;
  overflow: hidden;
}
.dp-card:hover {
  box-shadow: 0 8px 28px rgba(0,0,0,.09);
}

.dp-card-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: -0.01em;
}
.dp-card-title i {
  color: var(--text-secondary);
  font-size: 0.78rem;
}

/* ── Chart wrapper ────────────────────────────────────────────── */
.dp-chart-wrap {
  height: clamp(220px, 26vh, 310px);
  position: relative;
}

/* ── Column spans ─────────────────────────────────────────────── */
.dp-col-12 { grid-column: span 12; }
.dp-col-8  { grid-column: span 8; }
.dp-col-4  { grid-column: span 4; }
.dp-col-6  { grid-column: span 6; }

/* ── Stats strip (inside hero) ────────────────────────────────── */
.dp-stats-strip {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.dp-stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 14px;
  border-radius: 10px;
  background: var(--light-bg, #f1f5f9);
  border: 1px solid var(--border-color);
  min-width: 72px;
}
.dp-stat-chip-val {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  letter-spacing: -0.03em;
}
.dp-stat-chip-lbl {
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ── Responsive ───────────────────────────────────────────────── */
@media (max-width: 1400px) {
  .dp-kpi-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 1100px) {
  .dp-col-8, .dp-col-4 { grid-column: span 12; }
}
@media (max-width: 860px) {
  .dp-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .dp-hero { padding: 16px 18px; }
}
@media (max-width: 540px) {
  .dp-kpi-grid { grid-template-columns: 1fr; }
  .dp-col-6 { grid-column: span 12; }
  .dp-grid { gap: 12px; }
}
`;

/* ── Sparkline seed data helper (simulated mini-history) ───── */
const mkSpark = (val, len = 12, spread = 0.12) => {
  if (val == null) return null;
  const v = parseFloat(val);
  if (isNaN(v)) return null;
  return Array.from({ length: len }, (_, i) =>
    v * (1 + (Math.random() - 0.5) * spread * (i < len - 1 ? 1 : 0))
  ).concat(v);
};

const DashboardPage = () => {
  const { circuit, systemMode, historicData, selectedHistoricDate } = useAppContext();
  const isHistoric = systemMode === 'historic';

  const [liveData,   setLiveData]   = useState(null);
  const [tags,       setTags]       = useState([]);
  const [error,      setError]      = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const tagsRef = useRef([]);

  /* ── Tag discovery ──────────────────────────────────────── */
  useEffect(() => {
    api.getTags()
      .then(r => { setTags(r.tags || []); tagsRef.current = r.tags || []; setError(null); })
      .catch(err => { console.error('Tags fetch failed:', err); setError('Cannot reach IIH backend.'); });
  }, []);

  /* ── Live polling ───────────────────────────────────────── */
  const fetchLive = async () => {
    const tagIds = tagsRef.current.map(t => t.id);
    if (!tagIds.length) return;
    try {
      const [valRes, alarmRes] = await Promise.all([
        api.getMultipleTagValues(tagIds),
        api.getActiveAlarms(),
      ]);

      const map = {};
      (valRes.values || []).forEach(v => { map[v.name] = v.value; });

      setLiveData({
        temperature:         map.Tank1_Temperature   ?? null,
        temperatureSetpoint: map.Temp_Setpoint       ?? null,
        pressure:            map.Main_Pressure       ?? null,
        flowRate:            map.Flow_Rate           ?? null,
        conductivity:        map.Conductivity        ?? null,
        phLevel:             map.pH_Level            ?? null,
        causticLevel:        map.Caustic_Level       ?? null,
        waterLevel:          map.Water_Level         ?? null,
        pump1Speed:          map.Pump1_Speed         ?? null,
        pump2Speed:          map.Pump2_Speed         ?? null,
        systemRunning:       map.System_Running      ?? false,
        caustic: {
          level:         map.Caustic_Level      ?? null,
          temperature:   map.Tank1_Temperature  ?? null,
          concentration: map.Caustic_Conc       ?? null,
        },
        hotWater: {
          level:       map.HotWater_Level  ?? null,
          temperature: map.HotWater_Temp   ?? null,
        },
        recovery: {
          level:       map.Recovery_Level ?? null,
          temperature: map.Recovery_Temp  ?? null,
          tds:         map.Recovery_TDS   ?? null,
        },
        fresh: {
          level:       map.Fresh_Level ?? null,
          temperature: map.Fresh_Temp  ?? null,
        },
        alarms:    alarmRes.alarms || [],
        timestamp: valRes.timestamp,
      });

      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Live fetch failed:', err);
      setError(err.message || 'Failed to fetch live data');
    }
  };

  useEffect(() => {
    if (!tags.length || isHistoric) return;
    fetchLive();
    const cleanup = api.setupPolling(fetchLive, 2000);
    return cleanup;
  }, [tags, isHistoric]);

  /* ── Derived ────────────────────────────────────────────── */
  const isOnline   = !!liveData && !isHistoric;
  const alarms     = isHistoric ? [] : (liveData?.alarms || []);
  const critAlarms = alarms.filter(a => (a.severity || '').toLowerCase() === 'critical').length;

  /* ── Historic Mode Aggregates ───────────────────────────── */
  const avgHistoric = React.useMemo(() => {
    if (!isHistoric || !historicData || historicData.length === 0) return null;
    const count = historicData.length;
    const lastPoint = historicData[count - 1];
    const sums = { temperature: 0, pressure: 0, flowRate: 0, waterLevel: 0 };
    const counts = { temperature: 0, pressure: 0, flowRate: 0, waterLevel: 0 };
    historicData.forEach(pt => {
      const temp = pt.temperature ?? pt.Temperature;
      const pres = pt.pressure ?? pt.Pressure;
      const flow = pt.flowrate ?? pt.flowRate ?? pt.FlowRate;
      const water = pt.waterlevel ?? pt.waterLevel ?? pt.WaterLevel;

      if (temp != null) { sums.temperature += temp; counts.temperature++; }
      if (pres != null) { sums.pressure += pres; counts.pressure++; }
      if (flow != null) { sums.flowRate += flow; counts.flowRate++; }
      if (water != null) { sums.waterLevel += water; counts.waterLevel++; }
    });
    return {
      temperature: counts.temperature ? sums.temperature / counts.temperature : null,
      pressure: counts.pressure ? sums.pressure / counts.pressure : null,
      flowRate: counts.flowRate ? sums.flowRate / counts.flowRate : null,
      waterLevel: counts.waterLevel ? sums.waterLevel / counts.waterLevel : null,
    };
  }, [isHistoric, historicData]);

  const dashboardLiveData = isHistoric && historicData && historicData.length ? {
    temperature: historicData[historicData.length-1].temperature || avgHistoric?.temperature,
    pressure: historicData[historicData.length-1].pressure || avgHistoric?.pressure,
    flowRate: historicData[historicData.length-1].flowRate || avgHistoric?.flowRate,
    conductivity: historicData[historicData.length-1].conductivity || 0,
    phLevel: historicData[historicData.length-1].phLevel || 7.0,
    waterLevel: historicData[historicData.length-1].waterLevel || avgHistoric?.waterLevel,
    causticLevel: historicData[historicData.length-1].causticLevel || 50,
    systemRunning: historicData[historicData.length-1].productionStatus ?? historicData[historicData.length-1].cipStatus ?? true,
    caustic: {
      level: historicData[historicData.length-1].causticLevel || 50,
      temperature: historicData[historicData.length-1].temperature || avgHistoric?.temperature,
      concentration: 2.5
    },
    hotWater: {
      level: historicData[historicData.length-1].waterLevel || 80,
      temperature: historicData[historicData.length-1].temperature || 85
    }
  } : liveData;

  const dispTemp = isHistoric ? avgHistoric?.temperature : liveData?.temperature;
  const dispPres = isHistoric ? avgHistoric?.pressure : liveData?.pressure;
  const dispFlow = isHistoric ? avgHistoric?.flowRate : liveData?.flowRate;
  const dispWater = isHistoric ? avgHistoric?.waterLevel : liveData?.waterLevel;

  /* ── KPI definitions ────────────────────────────────────── */
  const kpis = [
    {
      title:     'System Status',
      value:     isHistoric ? 'Historic' : liveData ? (liveData.systemRunning ? 'Running' : 'Idle') : null,
      iconClass: isHistoric ? 'fa-solid fa-clock-rotate-left' : liveData?.systemRunning ? 'fa-solid fa-bolt' : 'fa-solid fa-power-off',
      color:     isHistoric ? '#8b5cf6' : liveData?.systemRunning ? '#22c55e' : '#94a3b8',
      badge:     isHistoric ? { label: selectedHistoricDate || 'No Date', color: '#8b5cf6' } : liveData?.systemRunning ? { label: 'Live', color: '#22c55e' } : null,
      trend:     liveData?.systemRunning && !isHistoric ? 2 : null,
      trendLabel: isHistoric ? 'Historical View' : liveData?.systemRunning ? 'Operational' : null,
    },
    {
      title:      `Temperature`,
      value:      dispTemp != null ? dispTemp.toFixed(1) : null,
      unit:       '°C',
      iconClass:  'fa-solid fa-temperature-half',
      color:      '#ef4444',
      sparkData:  mkSpark(dispTemp, 13, 0.06),
      trendLabel: dispTemp ? (isHistoric ? 'Avg' : `C${circuit}`) : null,
    },
    {
      title:      `Pressure`,
      value:      dispPres != null ? dispPres.toFixed(2) : null,
      unit:       'bar',
      iconClass:  'fa-solid fa-gauge-high',
      color:      '#f59e0b',
      sparkData:  mkSpark(dispPres, 13, 0.08),
      trendLabel: dispPres ? (isHistoric ? 'Avg' : `C${circuit}`) : null,
    },
    {
      title:      `Flow Rate`,
      value:      dispFlow != null ? dispFlow.toFixed(1) : null,
      unit:       'L/min',
      iconClass:  'fa-solid fa-droplet',
      color:      '#3b82f6',
      sparkData:  mkSpark(dispFlow, 13, 0.09),
      trendLabel: dispFlow ? (isHistoric ? 'Avg' : `C${circuit}`) : null,
    },
    {
      title:      'Active Alarms',
      value:      isHistoric ? 0 : (liveData ? alarms.length : null),
      iconClass:  'fa-solid fa-bell',
      color:      isHistoric ? '#10b981' : (critAlarms > 0 ? '#ef4444' : alarms.length > 0 ? '#f59e0b' : '#10b981'),
      badge:      critAlarms > 0 && !isHistoric ? { label: `${critAlarms} Critical`, color: '#ef4444' } : null,
      trendLabel: isHistoric ? 'None in historic data' : (critAlarms > 0 ? 'Needs attention' : alarms.length === 0 ? 'All clear' : null),
    },
    {
      title:      'Water Level',
      value:      dispWater != null ? Math.round(dispWater) : null,
      unit:       '%',
      iconClass:  'fa-solid fa-water',
      color:      '#0ea5e9',
      sparkData:  mkSpark(dispWater, 13, 0.04),
    },
  ];

  /* ── Quick-stat chips (hero bar) ──────────────────────────── */
  const statsChips = [
    { val: isHistoric ? '0' : (liveData ? alarms.length : 'SIM'), lbl: 'Alarms',   color: critAlarms > 0 && !isHistoric ? '#ef4444' : '#64748b' },
    { val: isHistoric ? '0' : (liveData ? (critAlarms || '0'): 'SIM'), lbl: 'Critical', color: critAlarms > 0 && !isHistoric ? '#ef4444' : '#64748b' },
    { val: `C${circuit}`,                          lbl: 'Circuit',  color: '#6366f1' },
    { val: isHistoric ? 'HIST' : (liveData ? (liveData.systemRunning ? 'ON' : 'IDLE') : 'SIM'), lbl: 'System', color: isHistoric ? '#8b5cf6' : liveData?.systemRunning ? '#22c55e' : '#64748b' },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="dp-page">

        {/* ── Hero header ──────────────────────────────────── */}
        <div className="dp-hero">
          <div className="dp-hero-accent" />

          <div className="dp-hero-left">
            <div className="dp-hero-icon">
              <i className="fa-solid fa-gauge-high" />
            </div>
            <div>
              <h1>CIPoptima™</h1>
              <div className="dp-hero-sub">
                <p>Real-time monitoring · Circuit {circuit}</p>
                {lastUpdate && (
                  <span className="dp-last-update">
                    <i className="fa-regular fa-clock" />
                    {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {/* Quick stat chips */}
            <div className="dp-stats-strip">
              {statsChips.map((c, i) => (
                <div key={i} className="dp-stat-chip">
                  <span className="dp-stat-chip-val" style={{ color: c.color || 'var(--text-primary)' }}>{c.val}</span>
                  <span className="dp-stat-chip-lbl">{c.lbl}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              {/* Connection badge */}
              {isHistoric ? (
                <div className="dp-conn-badge" style={{ background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.35)', color: '#8b5cf6' }}>
                  <i className="fa-solid fa-clock-rotate-left"></i>
                  Historic Mode
                </div>
              ) : (
                <div className={`dp-conn-badge ${isOnline ? 'online' : 'offline'}`}>
                  <span className="dp-conn-dot" />
                  {isOnline ? 'IIH Connected' : 'Simulation Mode'}
                </div>
              )}
              {!isOnline && !isHistoric && (
                <span style={{ fontSize: '0.62rem', color: '#6366f1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, opacity: 0.8 }}>
                  <i className="fa-solid fa-flask" style={{ fontSize: '0.58rem' }} />
                  Demo · No live backend
                </span>
              )}
              {isHistoric && (
                <span style={{ fontSize: '0.62rem', color: '#8b5cf6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, opacity: 0.8 }}>
                  Viewing static dataset
                </span>
              )}
              <CircuitSelector />
            </div>
          </div>
        </div>

        {/* ── Connection notice ─────────────────────────────── */}
        {isHistoric && historicData && (
          <div className="dp-sim-banner" style={{ background: 'rgba(139, 92, 246, 0.05)', borderColor: 'rgba(139, 92, 246, 0.2)' }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ color: '#8b5cf6' }} />
            <span>
              <strong style={{ color: '#8b5cf6' }}>Historic Mode Active</strong>
              {' '}— Viewing dataset from <strong>{selectedHistoricDate}</strong>. Dashboard is static. To view live values, switch to Live Mode in settings.
            </span>
          </div>
        )}
        {isHistoric && !historicData && (
          <div className="dp-error" style={{ background: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.25)', color: 'var(--text-secondary)' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b' }} />
            <span><strong>No historic data found:</strong> Please go to Settings to upload a CSV file or select a date.</span>
          </div>
        )}
        {error && isOnline && (
          <div className="dp-error">
            <i className="fa-solid fa-triangle-exclamation" />
            <span><strong>Connection Error:</strong> {error}</span>
          </div>
        )}

        {/* ── KPI section ──────────────────────────────────── */}
        <div className="dp-section" style={{ marginBottom: 14 }}>
          <div className="dp-section-pill">
            <i className="fa-solid fa-chart-simple" />
            Key Performance Indicators
          </div>
          <div className="dp-section-line" />
        </div>

        <div className="dp-kpi-grid">
          {kpis.map((kpi, i) => (
            <div key={i} className="dp-kpi-cell">
              <KpiCard {...kpi} />
            </div>
          ))}
        </div>

        {/* ── System panels section ────────────────────────── */}
        <div className="dp-section" style={{ marginTop: 10, marginBottom: 16 }}>
          <div className="dp-section-pill">
            <i className="fa-solid fa-layer-group" />
            System Panels
          </div>
          <div className="dp-section-line" />
        </div>

        <div className="dp-grid">

          {/* Cycle Progress — full width */}
          <div className="dp-card dp-col-12" style={{ padding: 0, overflow: 'hidden' }}>
            <CycleProgress />
          </div>

          {/* Temperature chart — 8 col */}
          <div className="dp-card dp-col-8">
            <div className="dp-card-title">
              <i className={isHistoric ? "fa-solid fa-clock-rotate-left" : "fa-solid fa-temperature-half"} />
              {isHistoric ? "Historic Temperature Trend" : "Live Temperature Trend"}
            </div>
            <div className="dp-chart-wrap">
              <TemperatureChart liveData={liveData} historicData={isHistoric ? historicData : null} />
            </div>
          </div>

          {/* Water usage — 4 col */}
          <div className="dp-card dp-col-4" style={{ padding: 0, minHeight: 420 }}>
            <WaterUsageChart historicData={isHistoric ? historicData : null} />
          </div>

          {/* Tank status — full width */}
          <div className="dp-card dp-col-12" style={{ padding: 0 }}>
            <TankStatus liveData={dashboardLiveData} />
          </div>

          {/* Recent cycles — 8 col */}
          <div className="dp-card dp-col-8" style={{ padding: 0 }}>
            <RecentCyclesTable />
          </div>

          {/* Right column: Alarms + AI — 4 col */}
          <div className="dp-col-4" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Active alarms */}
            <div className="dp-card" style={{ flex: 1, minHeight: 260, padding: 0 }}>
              <ActiveAlarmsList alarms={alarms} />
            </div>

            {/* Deviation intelligence */}
            <div className="dp-card" style={{ padding: '18px 20px' }}>
              <DeviationIntelligence deviations={[]} />
            </div>

          </div>

        </div>
      </div>
    </>
  );
};

export default DashboardPage;