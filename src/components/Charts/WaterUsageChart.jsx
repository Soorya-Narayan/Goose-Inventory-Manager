// src/components/Charts/WaterUsageChart.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { useAppContext } from '../../context/AppContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

/* ─── Inline styles ──────────────────────────────────────────── */
const injectCSS = `
@keyframes wuc-wave {
  0%   { transform: translateX(0)   translateY(0);   }
  50%  { transform: translateX(-25%) translateY(-6px); }
  100% { transform: translateX(-50%) translateY(0);   }
}
@keyframes wuc-wave2 {
  0%   { transform: translateX(0)   translateY(0);   }
  50%  { transform: translateX(-30%) translateY(5px);  }
  100% { transform: translateX(-50%) translateY(0);   }
}
@keyframes wuc-spin {
  to { stroke-dashoffset: 0; }
}
@keyframes wuc-fadein {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0);   }
}
@keyframes wuc-pulse-dot {
  0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,.5); }
  50%     { box-shadow: 0 0 0 6px rgba(59,130,246,0); }
}
`;

const getCurrentTimeLabel = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* ─── Radial ring SVG ────────────────────────────────────────── */
function RadialRing({ pct = 0, size = 120, stroke = 10, color = '#3b82f6' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="var(--border-color, #e2e8f0)"
        strokeWidth={stroke}
      />
      {/* Fill */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${color}66)` }}
      />
      {/* Glow dot at end */}
      <circle
        cx={size / 2 + r * Math.cos((2 * Math.PI * pct) / 100 - Math.PI / 2)}
        cy={size / 2 + r * Math.sin((2 * Math.PI * pct) / 100 - Math.PI / 2)}
        r={stroke / 2 + 1}
        fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})`, opacity: pct > 1 ? 1 : 0, transition: 'opacity 0.4s' }}
      />
    </svg>
  );
}

/* ─── Animated water tank ────────────────────────────────────── */
function WaterTank({ pct = 0, usage = 0, capacity = 1000 }) {
  const fillColor = pct > 80 ? '#ef4444' : pct > 50 ? '#3b82f6' : '#0ea5e9';
  const bgGlass = pct > 80
    ? 'rgba(239,68,68,.06)'
    : 'rgba(59,130,246,.05)';

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'center' }}>
      {/* Tank body */}
      <div style={{ position: 'relative', width: 80, height: 160, flexShrink: 0 }}>
        {/* Glass shell */}
        <div style={{
          position: 'absolute', inset: 0,
          border: `2px solid ${fillColor}55`,
          borderRadius: 14,
          background: bgGlass,
          overflow: 'hidden',
          boxShadow: `inset 0 2px 8px ${fillColor}15, 0 4px 16px rgba(0,0,0,.08)`,
        }}>
          {/* Water fill */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${Math.max(2, pct)}%`,
            background: `linear-gradient(180deg, ${fillColor}aa 0%, ${fillColor}ee 100%)`,
            transition: 'height 0.8s cubic-bezier(.4,0,.2,1)',
            overflow: 'hidden',
          }}>
            {/* Wave 1 */}
            <div style={{
              position: 'absolute', top: -12, left: '-50%',
              width: '200%', height: 24,
              background: 'rgba(255,255,255,.25)',
              borderRadius: '40%',
              animation: 'wuc-wave 3.5s linear infinite',
            }} />
            {/* Wave 2 */}
            <div style={{
              position: 'absolute', top: -8, left: '-50%',
              width: '200%', height: 18,
              background: 'rgba(255,255,255,.15)',
              borderRadius: '40%',
              animation: 'wuc-wave2 5s linear infinite',
            }} />
          </div>

          {/* % label */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', zIndex: 2,
          }}>
            <span style={{
              fontSize: '1rem', fontWeight: 900,
              color: pct > 30 ? '#fff' : 'var(--text-primary)',
              textShadow: pct > 30 ? '0 1px 6px rgba(0,0,0,.3)' : 'none',
              letterSpacing: '-0.04em',
            }}>
              {pct.toFixed(0)}%
            </span>
          </div>

          {/* Shine strip */}
          <div style={{
            position: 'absolute', top: 0, left: '20%', width: '15%', bottom: 0,
            background: 'linear-gradient(180deg, rgba(255,255,255,.25), transparent)',
            borderRadius: 4, pointerEvents: 'none',
          }} />
        </div>

        {/* Tick marks on right */}
        {[0, 25, 50, 75, 100].map(t => (
          <div key={t} style={{
            position: 'absolute', right: -28,
            bottom: `${t}%`,
            display: 'flex', alignItems: 'center', gap: 3,
            transform: 'translateY(50%)',
          }}>
            <div style={{ width: 6, height: 1, background: 'var(--border-color, #e2e8f0)' }} />
            <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {(capacity * t / 100).toFixed(0)}L
            </span>
          </div>
        ))}

        {/* Base pipe */}
        <div style={{
          position: 'absolute', bottom: -12, left: '50%',
          transform: 'translateX(-50%)',
          width: 24, height: 14,
          background: `linear-gradient(90deg, ${fillColor}88, ${fillColor}cc)`,
          borderRadius: '0 0 6px 6px',
          boxShadow: `0 4px 8px ${fillColor}44`,
        }} />
      </div>

      {/* Radial ring + center stats */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          <RadialRing pct={pct} size={120} stroke={9} color={fillColor} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 2,
          }}>
            <i className="fa-solid fa-droplet" style={{ fontSize: '0.9rem', color: fillColor, marginBottom: 2 }} />
            <span style={{
              fontSize: '1.4rem', fontWeight: 900,
              color: 'var(--text-primary)',
              letterSpacing: '-0.04em', lineHeight: 1,
            }}>
              {usage.toFixed(0)}
            </span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
              LITERS
            </span>
          </div>
        </div>
        <span style={{
          fontSize: '0.65rem', fontWeight: 700,
          color: fillColor, textTransform: 'uppercase',
          letterSpacing: '0.06em',
          background: `${fillColor}15`,
          border: `1px solid ${fillColor}30`,
          padding: '3px 10px', borderRadius: 20,
        }}>
          {pct > 80 ? 'High Fill' : pct > 50 ? 'Normal' : pct > 20 ? 'Moderate' : 'Low'}
        </span>
      </div>
    </div>
  );
}

/* ─── Stat chip ──────────────────────────────────────────────── */
function StatChip({ icon, label, value, unit, color }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      display: 'flex', flexDirection: 'column', gap: 4,
      padding: '10px 12px',
      borderRadius: 12,
      background: `${color}0d`,
      border: `1px solid ${color}25`,
      animation: 'wuc-fadein 0.4s ease both',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <i className={icon} style={{ fontSize: '0.7rem', color }} />
        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{unit}</span>}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
const WaterUsageChart = ({ historicData }) => {
  const [activeTab, setActiveTab] = useState('tank'); // 'tank' | 'graph'
  const [points, setPoints] = useState({ labels: [], values: [] });
  const [sessionTotal, setSessionTotal] = useState(0);
  const [prevUsage, setPrevUsage] = useState(null);
  const [liveUsage, setLiveUsage] = useState(0);
  const mountedRef = useRef(false);
  const styleInjected = useRef(false);

  const isHistoric = !!historicData;
  const lastHistoric = isHistoric ? historicData[historicData.length - 1] : null;
  const currentUsage = isHistoric 
    ? (lastHistoric?.waterLevel ?? lastHistoric?.waterlevel ?? lastHistoric?.water_usage ?? 0)
    : liveUsage;

  // Poll for live water usage
  useEffect(() => {
    if (isHistoric) return;
    const fetchUsage = async () => {
      try {
        const { getMultipleTagValues } = await import('../../services/api.js');
        const res = await getMultipleTagValues(['ns=sim;s=Water_Usage']);
        if (res.values && res.values.length > 0 && res.values[0].value !== null) {
          setLiveUsage(res.values[0].value);
        }
      } catch (err) {
        console.error("WaterUsage fetch error", err);
      }
    };
    
    const interval = setInterval(fetchUsage, 2000);
    fetchUsage();
    return () => clearInterval(interval);
  }, [isHistoric]);
  const totalCapacity = 1000;
  const percentage = Math.min(100, (currentUsage / totalCapacity) * 100);
  const flowRate = (currentUsage / 60).toFixed(1);
  const efficiency = totalCapacity > 0 ? ((1 - (currentUsage / totalCapacity)) * 100).toFixed(0) : '—';

  /* ── Inject CSS once ─────────────────────────────────────── */
  useEffect(() => {
    if (styleInjected.current) return;
    const tag = document.createElement('style');
    tag.setAttribute('data-wuc', '');
    tag.textContent = injectCSS;
    document.head.appendChild(tag);
    styleInjected.current = true;
    return () => { tag.remove(); styleInjected.current = false; };
  }, []);

  /* ── Track session total ─────────────────────────────────── */
  useEffect(() => {
    if (prevUsage !== null && currentUsage > prevUsage) {
      setSessionTotal(p => p + (currentUsage - prevUsage));
    }
    setPrevUsage(currentUsage);
  }, [currentUsage]);

  /* ── Accumulate trend points ─────────────────────────────── */
  useEffect(() => {
    if (isHistoric && historicData) {
      const labels = historicData.map(pt => {
        try { return new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
        catch { return String(pt.timestamp); }
      });
      const values = historicData.map(pt => pt.waterLevel ?? pt.waterlevel ?? pt.water_usage ?? 0);
      setPoints({ labels, values });
      return;
    }

    if (mountedRef.current) {
      setPoints(prev => {
        const newLabels = [...prev.labels, getCurrentTimeLabel()].slice(-30);
        const newValues = [...prev.values, currentUsage].slice(-30);
        return { labels: newLabels, values: newValues };
      });
    }
  }, [currentUsage, isHistoric, historicData]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* ── Chart config ────────────────────────────────────────── */
  const chartData = useMemo(() => ({
    labels: points.labels,
    datasets: [{
      label: 'Water Usage',
      data: points.values,
      borderColor: '#0ea5e9',
      backgroundColor: 'rgba(14,165,233,.12)',
      borderWidth: 2.5,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: '#0ea5e9',
      tension: 0.45,
      fill: true,
    }],
  }), [points]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        ticks: { color: 'var(--text-secondary,#9ca3af)', maxTicksLimit: 6, font: { size: 10, family: 'Inter' } },
        grid: { display: false },
        border: { color: 'var(--border-color,#e5e7eb)' },
      },
      y: {
        beginAtZero: true,
        ticks: { color: 'var(--text-secondary,#9ca3af)', callback: v => `${v}L`, font: { size: 10, family: 'Inter' } },
        grid: { color: 'rgba(0,0,0,.04)', drawTicks: false },
        border: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,.95)',
        titleColor: '#f1f5f9', bodyColor: '#94a3b8',
        borderColor: '#334155', borderWidth: 1,
        padding: 10, cornerRadius: 10,
        callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(0)} L used` },
      },
    },
    animation: { duration: 250 },
  }), []);

  /* ── Tab button ──────────────────────────────────────────── */
  const TabBtn = ({ id, icon, label }) => {
    const active = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 12px', borderRadius: 8,
          border: active ? '1px solid #0ea5e960' : '1px solid transparent',
          background: active ? 'rgba(14,165,233,.12)' : 'transparent',
          color: active ? '#0ea5e9' : 'var(--text-secondary)',
          fontSize: '0.72rem', fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.2s',
          letterSpacing: '0.02em',
        }}
      >
        <i className={icon} style={{ fontSize: '0.65rem' }} />
        {label}
      </button>
    );
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      gap: 0, padding: '16px 16px 12px', boxSizing: 'border-box',
    }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(14,165,233,.12)', border: '1px solid rgba(14,165,233,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="fa-solid fa-droplet" style={{ fontSize: '0.8rem', color: '#0ea5e9' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Water Consumption
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#0ea5e9', display: 'inline-block',
                animation: 'wuc-pulse-dot 2s infinite',
              }} />
              <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {isHistoric ? 'Historic' : 'Live'} · {totalCapacity}L Capacity
              </span>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', gap: 2, padding: '3px',
          background: 'var(--border-color)', borderRadius: 10,
        }}>
          <TabBtn id="tank" icon="fa-solid fa-water"      label="Tank"  />
          <TabBtn id="graph" icon="fa-solid fa-chart-area" label="Graph" />
        </div>
      </div>

      {/* ── Stat chips row ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <StatChip icon="fa-solid fa-droplet"        label="Current"   value={currentUsage.toFixed(0)} unit="L"    color="#0ea5e9" />
        <StatChip icon="fa-solid fa-gauge-high"     label="Flow Rate" value={flowRate}                unit="L/m"  color="#6366f1" />
        <StatChip icon="fa-solid fa-leaf"           label="Effic."    value={efficiency}              unit="%"    color="#10b981" />
        <StatChip icon="fa-solid fa-clock-rotate-left" label="Session" value={sessionTotal.toFixed(0)} unit="L"  color="#f59e0b" />
      </div>

      {/* ── Main view area ────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {activeTab === 'tank' ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <WaterTank pct={percentage} usage={currentUsage} capacity={totalCapacity} />

            {/* Progress bar */}
            <div style={{ width: '88%', marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Fill Level
                </span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#0ea5e9' }}>
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 10, background: 'var(--border-color)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 10,
                  width: `${percentage}%`,
                  background: percentage > 80
                    ? 'linear-gradient(90deg,#f97316,#ef4444)'
                    : 'linear-gradient(90deg,#0ea5e9,#6366f1)',
                  transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
                  boxShadow: '0 0 8px rgba(14,165,233,.5)',
                }} />
              </div>
            </div>
          </div>

        ) : (
          /* Graph view */
          <div style={{ width: '100%', height: '100%', minHeight: 140, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {points.labels.length > 1 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div style={{
                  height: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 10, color: 'var(--text-secondary)',
                }}>
                  <i className="fa-solid fa-chart-area" style={{ fontSize: '2rem', opacity: 0.2 }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 500 }}>Collecting data…</span>
                </div>
              )}
            </div>

            {/* Mini legend */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 20, height: 2, borderRadius: 2, background: '#0ea5e9' }} />
                <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Water Usage (L)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaterUsageChart;