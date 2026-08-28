// src/components/TankStatus.jsx
import React from 'react';
import styles from './TankStatus.module.css';

/* ─── Keyframes injected once ────────────────────────────────── */
const TANK_CSS = `
@keyframes ts-wave {
  0%   { transform: translateX(0)    translateY(0);   }
  50%  { transform: translateX(-25%) translateY(-5px);}
  100% { transform: translateX(-50%) translateY(0);   }
}
@keyframes ts-wave2 {
  0%   { transform: translateX(0)    translateY(0);   }
  50%  { transform: translateX(-30%) translateY(4px); }
  100% { transform: translateX(-50%) translateY(0);   }
}
@keyframes ts-fadein {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

const fmt = (n, unit = '') => {
  if (n == null) return '—';
  if (unit === '°C' || unit === ' ppm') return `${Number(n).toFixed(1)}${unit}`;
  return `${Math.round(n)}${unit}`;
};

/* ─── Level → status color ───────────────────────────────────── */
const levelStatus = (v) => {
  if (v == null) return { color: '#94a3b8', label: 'Offline' };
  if (v < 20)   return { color: '#ef4444', label: 'Critical' };
  if (v < 40)   return { color: '#f59e0b', label: 'Low'      };
  return              { color: '#10b981', label: 'Normal'   };
};

/* ─── Animated mini tank ─────────────────────────────────────── */
function MiniTank({ pct, tankColor, hasData }) {
  const fillPct = hasData ? Math.max(2, Math.min(100, pct)) : 0;
  const { color: statusColor } = levelStatus(hasData ? pct : null);
  const liquidColor = hasData ? statusColor : 'var(--border-color, #e2e8f0)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {/* Glass tank */}
      <div style={{
        position: 'relative',
        width: 64, height: 110,
        border: `2px solid ${hasData ? tankColor + '55' : 'var(--border-color)'}`,
        borderRadius: 12,
        background: hasData ? `${tankColor}08` : 'var(--light-bg, #f1f5f9)',
        overflow: 'hidden',
        boxShadow: `inset 0 2px 8px ${hasData ? tankColor + '12' : 'transparent'}, 0 2px 8px rgba(0,0,0,.06)`,
      }}>
        {/* Liquid fill */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${fillPct}%`,
          background: hasData
            ? `linear-gradient(180deg, ${liquidColor}99 0%, ${liquidColor}ee 100%)`
            : 'var(--border-color)',
          transition: 'height 0.8s cubic-bezier(.4,0,.2,1)',
          overflow: 'hidden',
        }}>
          {hasData && fillPct > 8 && (
            <>
              <div style={{
                position: 'absolute', top: -10, left: '-50%',
                width: '200%', height: 20,
                background: 'rgba(255,255,255,.25)', borderRadius: '40%',
                animation: 'ts-wave 3.5s linear infinite',
              }} />
              <div style={{
                position: 'absolute', top: -6, left: '-50%',
                width: '200%', height: 14,
                background: 'rgba(255,255,255,.15)', borderRadius: '40%',
                animation: 'ts-wave2 5.2s linear infinite',
              }} />
            </>
          )}
          {/* Shine */}
          {hasData && (
            <div style={{
              position: 'absolute', top: 0, left: '20%', width: '12%', bottom: 0,
              background: 'linear-gradient(180deg, rgba(255,255,255,.3), transparent)',
              borderRadius: 4, pointerEvents: 'none',
            }} />
          )}
        </div>

        {/* % label overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2, pointerEvents: 'none',
        }}>
          <span style={{
            fontSize: '0.85rem', fontWeight: 900, letterSpacing: '-0.03em',
            color: hasData && fillPct > 35 ? '#fff' : hasData ? liquidColor : 'var(--text-secondary)',
            textShadow: hasData && fillPct > 35 ? '0 1px 4px rgba(0,0,0,.3)' : 'none',
          }}>
            {hasData ? `${Math.round(pct)}%` : '—'}
          </span>
        </div>
      </div>

      {/* Base nozzle */}
      <div style={{
        width: 20, height: 8,
        background: hasData ? `${tankColor}88` : 'var(--border-color)',
        borderRadius: '0 0 4px 4px',
        boxShadow: hasData ? `0 4px 8px ${tankColor}33` : 'none',
      }} />
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export default function TankStatus({ liveData }) {
  const caustic = liveData?.caustic  || {};
  const hot     = liveData?.hotWater || {};
  const rec     = liveData?.recovery || {};
  const fresh   = liveData?.fresh    || {};

  const tankConfigs = [
    {
      name: 'Caustic Tank', icon: 'fa-flask', color: '#f59e0b',
      liquidDesc: 'Caustic Soda NaOH',
      data: caustic,
      fields: [
        { label: 'Level',         value: caustic.level,         unit: '%' },
        { label: 'Temperature',   value: caustic.temperature,   unit: '°C' },
        { label: 'Concentration', value: caustic.concentration, unit: '%', optional: true },
      ],
    },
    {
      name: 'Hot Water', icon: 'fa-fire', color: '#ef4444',
      liquidDesc: 'Heated Rinse Water',
      data: hot,
      fields: [
        { label: 'Level',       value: hot.level,       unit: '%' },
        { label: 'Temperature', value: hot.temperature, unit: '°C' },
      ],
    },
    {
      name: 'Recovery', icon: 'fa-rotate', color: '#10b981',
      liquidDesc: 'Recovered Solution',
      data: rec,
      fields: [
        { label: 'Level',       value: rec.level,       unit: '%' },
        { label: 'Temperature', value: rec.temperature, unit: '°C' },
        { label: 'TDS',         value: rec.tds,         unit: ' ppm', optional: true },
      ],
    },
    {
      name: 'Fresh Water', icon: 'fa-droplet', color: '#3b82f6',
      liquidDesc: 'Municipal Supply',
      data: fresh,
      fields: [
        { label: 'Level',       value: fresh.level,       unit: '%' },
        { label: 'Temperature', value: fresh.temperature, unit: '°C' },
      ],
    },
  ];

  return (
    <div className={styles.container}>
      <style>{TANK_CSS}</style>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className={styles.header}>
        <h3>
          <i className="fa-solid fa-flask-vial" />
          Tank Status
        </h3>
        {!liveData && (
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
            color: '#6366f1', background: 'rgba(99,102,241,.1)',
            border: '1px solid rgba(99,102,241,.25)',
            padding: '3px 10px', borderRadius: 20,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <i className="fa-solid fa-flask" />
            Simulation Mode
          </span>
        )}
      </div>

      {/* ── Tank cards grid ───────────────────────────────────── */}
      <div className={styles.tanksGrid}>
        {tankConfigs.map((tank, idx) => {
          const levelVal = tank.fields[0]?.value;
          const hasData  = levelVal != null;
          const { color: statusColor, label: statusLabel } = levelStatus(levelVal);

          return (
            <div
              key={idx}
              className={styles.tankCard}
              style={{
                borderTop: `3px solid ${tank.color}`,
                animation: `ts-fadein 0.4s ${idx * 80}ms ease both`,
              }}
            >
              {/* Card header */}
              <div className={styles.cardHeader}>
                <div
                  className={styles.iconWrapper}
                  style={{ background: `${tank.color}15`, borderColor: `${tank.color}35`, flexShrink: 0 }}
                >
                  <i className={`fa-solid ${tank.icon}`} style={{ color: tank.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tank.name}
                  </h4>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tank.liquidDesc}
                  </div>
                </div>

                {/* Status chip (top-right) */}
                <span style={{
                  marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 800, flexShrink: 0,
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  padding: '2px 8px', borderRadius: 20,
                  background: `${statusColor}15`, color: statusColor,
                  border: `1px solid ${statusColor}30`,
                  whiteSpace: 'nowrap',
                }}>
                  {statusLabel}
                </span>
              </div>

              {/* Tank viz + radial info */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '4px 0', minHeight: 110 }}>
                <MiniTank pct={hasData ? levelVal : 0} tankColor={tank.color} hasData={hasData} />

                {/* Right side stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                  {tank.fields.map((f, fi) => {
                    if (f.optional && f.value == null) return null;
                    const isLevel = fi === 0;
                    return (
                      <div key={fi} className={styles.stat}>
                        <span className={styles.statLabel}>{f.label}</span>
                        <span
                          className={styles.statValue}
                          style={isLevel && hasData ? { color: statusColor, borderColor: `${statusColor}30` } : {}}
                        >
                          {fmt(f.value, f.unit)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Level progress strip */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fill Level</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: statusColor }}>{hasData ? `${Math.round(levelVal)}%` : '—'}</span>
                </div>
                <div style={{ height: 4, borderRadius: 6, background: 'var(--border-color)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 6,
                    width: hasData ? `${Math.min(100, Math.max(0, levelVal))}%` : '0%',
                    background: `linear-gradient(90deg, ${tank.color}88, ${statusColor})`,
                    transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
                    boxShadow: hasData ? `0 0 6px ${statusColor}55` : 'none',
                  }} />
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
