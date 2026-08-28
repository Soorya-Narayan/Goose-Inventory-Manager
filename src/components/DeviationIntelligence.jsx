// src/components/DeviationIntelligence.jsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── Scan animation CSS injected once ──────────────────────── */
const SCAN_CSS = `
@keyframes di-scan {
  0%   { transform: translateY(-100%); opacity: 0.7; }
  100% { transform: translateY(400%); opacity: 0; }
}
@keyframes di-bar-grow {
  from { width: 0%; }
  to   { width: var(--target-w); }
}
@keyframes di-fadein {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

/* ─── Health metric bar ──────────────────────────────────────── */
function HealthBar({ label, pct = 95, color = '#10b981', icon }) {
  const status = pct >= 90 ? 'Nominal' : pct >= 70 ? 'Watch' : 'Alert';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, animation: 'di-fadein 0.4s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className={icon} style={{ fontSize: '0.65rem', color, opacity: 0.85 }} />
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            fontSize: '0.6rem', fontWeight: 800, padding: '1px 6px', borderRadius: 10,
            background: `${color}18`, color, border: `1px solid ${color}30`,
          }}>{status}</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {pct}%
          </span>
        </div>
      </div>
      <div style={{ height: 5, borderRadius: 10, background: 'var(--border-color)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 10,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          transition: 'width 1.2s cubic-bezier(.4,0,.2,1)',
          boxShadow: pct > 70 ? `0 0 6px ${color}55` : 'none',
        }} />
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
const DeviationIntelligence = ({ deviations = [] }) => {
  const navigate   = useNavigate();
  const styleRef   = useRef(false);
  const critical   = deviations.filter(d => d.severity === 'critical').length;
  const warning    = deviations.filter(d => d.severity === 'warning').length;
  const hasData    = deviations.length > 0;

  useEffect(() => {
    if (styleRef.current) return;
    const tag = document.createElement('style');
    tag.setAttribute('data-di', '');
    tag.textContent = SCAN_CSS;
    document.head.appendChild(tag);
    styleRef.current = true;
    return () => { tag.remove(); styleRef.current = false; };
  }, []);

  /* Simulated health scores when nominal */
  const healthMetrics = [
    { label: 'Temp Stability',   pct: 96, color: '#10b981', icon: 'fa-solid fa-temperature-half' },
    { label: 'Pressure Reg.',    pct: 91, color: '#3b82f6', icon: 'fa-solid fa-gauge-high'        },
    { label: 'Flow Consistency', pct: 88, color: '#6366f1', icon: 'fa-solid fa-water'             },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(139,92,246,.12)', border: '1px solid rgba(139,92,246,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#8b5cf6', fontSize: '0.78rem',
          }}>
            <i className="fa-solid fa-brain" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              AI Health Monitor
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: 1 }}>
              ML anomaly detection · Active
            </div>
          </div>
        </div>
        <span style={{
          padding: '3px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 800,
          background: hasData ? 'rgba(239,68,68,.12)' : 'rgba(16,185,129,.12)',
          color: hasData ? '#ef4444' : '#10b981',
          border: `1px solid ${hasData ? 'rgba(239,68,68,.25)' : 'rgba(16,185,129,.25)'}`,
        }}>
          {deviations.length} issues
        </span>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      {!hasData ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Scanning animation panel */}
          <div style={{
            position: 'relative', overflow: 'hidden',
            borderRadius: 12, padding: '10px 14px',
            background: 'rgba(16,185,129,.04)',
            border: '1px solid rgba(16,185,129,.18)',
          }}>
            {/* Scan line */}
            <div style={{
              position: 'absolute', left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(16,185,129,.6), transparent)',
              animation: 'di-scan 2.8s ease-in-out infinite',
              zIndex: 1,
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#10b981', fontSize: '0.8rem', flexShrink: 0,
              }}>
                <i className="fa-solid fa-shield-check" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#10b981' }}>All Systems Nominal</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  No anomalies detected · Scanning…
                </div>
              </div>
            </div>
          </div>

          {/* Health bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {healthMetrics.map((m, i) => (
              <HealthBar key={i} {...m} />
            ))}
          </div>

          {/* Last scanned timestamp */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.62rem', color: 'var(--text-secondary)', opacity: 0.7,
          }}>
            <i className="fa-regular fa-clock" style={{ fontSize: '0.58rem' }} />
            Last scan: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

      ) : (
        /* Deviation counts when alarms exist */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>
          <div style={{
            padding: 14, borderRadius: 10,
            background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', fontSize: '1.3rem' }} />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{critical}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Critical</div>
            </div>
          </div>
          <div style={{
            padding: 14, borderRadius: 10,
            background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <i className="fa-solid fa-circle-exclamation" style={{ color: '#f59e0b', fontSize: '1.3rem' }} />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{warning}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Warning</div>
            </div>
          </div>
        </div>
      )}

      {/* ── CTA ──────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/ai-diagnostics')}
        style={{
          width: '100%', padding: '9px', border: 'none',
          background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
          color: '#fff', borderRadius: 10, fontSize: '0.78rem',
          fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(99,102,241,.3)',
          letterSpacing: '0.01em',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(99,102,241,.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,.3)'; }}
      >
        <i className="fa-solid fa-brain" style={{ fontSize: '0.72rem' }} />
        View AI Diagnostics
        <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.65rem' }} />
      </button>
    </div>
  );
};

export default DeviationIntelligence;
