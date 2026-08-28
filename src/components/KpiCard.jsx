// src/components/KpiCard.jsx
import React, { useEffect, useRef, useState } from 'react';

/**
 * Premium KPI Card — Modern Glassmorphism Design
 * Props:
 *   title      – label shown below value
 *   value      – numeric or string value (null/undefined → skeleton)
 *   unit       – unit string appended to value
 *   iconClass  – FontAwesome class string
 *   color      – accent hex color
 *   badge      – { label, color } optional badge chip
 *   trend      – number: positive = up, negative = down, 0 = flat (optional)
 *   trendLabel – string description of trend (optional)
 *   sparkData  – array of numbers for mini sparkline (optional)
 */
export default function KpiCard({
  title,
  value,
  iconClass,
  color = '#3b82f6',
  unit = '',
  badge,
  trend,
  trendLabel,
  sparkData,
}) {
  const isEmpty = value === null || value === undefined || value === 'N/A';
  const display = isEmpty ? null : String(value);
  const canvasRef = useRef(null);
  const [shimmer, setShimmer] = useState(true);

  /* ── Shimmer fades after data arrives ─────────────────────── */
  useEffect(() => {
    if (!isEmpty) {
      const t = setTimeout(() => setShimmer(false), 400);
      return () => clearTimeout(t);
    } else {
      setShimmer(true);
    }
  }, [isEmpty]);

  /* ── Draw sparkline on canvas ─────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sparkData || sparkData.length < 2) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const min = Math.min(...sparkData);
    const max = Math.max(...sparkData);
    const range = max - min || 1;
    const pts = sparkData.map((v, i) => ({
      x: (i / (sparkData.length - 1)) * W,
      y: H - ((v - min) / range) * (H - 6) - 3,
    }));

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, `${color}55`);
    grad.addColorStop(1, `${color}00`);

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dot at last point
    const last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
    ctx.strokeStyle = `${color}55`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [sparkData, color]);

  /* ── Trend arrow ──────────────────────────────────────────── */
  const trendIcon =
    trend > 0 ? 'fa-solid fa-arrow-trend-up' :
    trend < 0 ? 'fa-solid fa-arrow-trend-down' :
    trend === 0 ? 'fa-solid fa-minus' : null;

  const trendColor =
    trend > 0 ? '#22c55e' :
    trend < 0 ? '#ef4444' :
    '#94a3b8';

  return (
    <div style={cardStyle(color)}>
      {/* ── Glow orb ─────────────────────────────────────────── */}
      <div style={glowStyle(color)} />

      {/* ── Top accent bar ───────────────────────────────────── */}
      <div style={topBarStyle(color)} />

      {/* ── Header: icon + badge ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={iconWrapStyle(color)}>
          <i className={iconClass || 'fa-solid fa-circle-dot'} style={{ fontSize: '1.1rem', color }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {badge && (
            <span style={badgeStyle(badge.color || color)}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: badge.color || color, display: 'inline-block', marginRight: 4 }} />
              {badge.label}
            </span>
          )}
          {trendIcon && (
            <span style={{ fontSize: '0.65rem', color: trendColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
              <i className={trendIcon} style={{ fontSize: '0.6rem' }} />
              {trendLabel || (trend > 0 ? '+' + trend + '%' : trend + '%')}
            </span>
          )}
        </div>
      </div>

      {/* ── Value section ────────────────────────────────────── */}
      <div style={{ flex: 1 }}>
        {shimmer && isEmpty ? (
          <div>
            {/* Value shimmer only — title always visible */}
            <div style={skeletonStyle(38, '60%', 8)} />
            <div style={{ marginTop: 8, fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', opacity: 0.7 }}>
              {title}
            </div>
          </div>
        ) : (
          <>
            <div style={valueStyle(color)}>
              <span style={{
                background: `linear-gradient(135deg, var(--text-primary) 0%, ${color} 150%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.08))'
              }}>
                {display}
              </span>
              {unit && (
                <span style={{ fontSize: '0.55em', fontWeight: 700, opacity: 0.7, marginLeft: 4, color: 'var(--text-secondary)' }}>
                  {unit}
                </span>
              )}
            </div>
            <div style={titleStyle}>{title}</div>
          </>
        )}
      </div>

      {/* ── Sparkline canvas ─────────────────────────────────── */}
      {sparkData && sparkData.length >= 2 && !isEmpty && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${color}18`, paddingTop: 10 }}>
          <canvas
            ref={canvasRef}
            width={220}
            height={42}
            style={{ width: '100%', height: 42, display: 'block', borderRadius: 4 }}
          />
        </div>
      )}

      {/* ── Bottom divider glow ──────────────────────────────── */}
      <div style={bottomGlowStyle(isEmpty, color)} />
    </div>
  );
}

/* ── Style helpers ──────────────────────────────────────────── */

const cardStyle = (color) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  padding: '20px 20px 16px',
  height: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden',
  cursor: 'default',
  background: 'var(--card-bg)',
  borderRadius: 18,
});

const glowStyle = (color) => ({
  position: 'absolute',
  top: -30,
  right: -30,
  width: 110,
  height: 110,
  borderRadius: '50%',
  background: `radial-gradient(circle, ${color}28 0%, transparent 70%)`,
  pointerEvents: 'none',
  transition: 'opacity 0.4s',
});

const topBarStyle = (color) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 3,
  background: `linear-gradient(90deg, ${color}cc, ${color}44, transparent)`,
  borderRadius: '18px 18px 0 0',
});

const iconWrapStyle = (color) => ({
  width: 44,
  height: 44,
  borderRadius: 12,
  background: `${color}15`,
  border: `1.5px solid ${color}35`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  boxShadow: `0 4px 12px ${color}20`,
  position: 'relative',
  zIndex: 1,
});

const badgeStyle = (color) => ({
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  padding: '3px 8px 3px 6px',
  borderRadius: 20,
  background: `${color}18`,
  color: color,
  border: `1px solid ${color}30`,
  display: 'flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
});

const valueStyle = (color) => ({
  fontSize: 'clamp(1.75rem, 3vw, 2.4rem)',
  fontWeight: 900,
  color: 'var(--text-primary)',
  lineHeight: 1,
  letterSpacing: '-0.04em',
  display: 'flex',
  alignItems: 'baseline',
  gap: 2,
});

const titleStyle = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  marginTop: 8,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

const bottomGlowStyle = (isEmpty, color) => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 2,
  background: isEmpty
    ? 'linear-gradient(90deg, transparent, var(--border-color, #e2e8f0), transparent)'
    : `linear-gradient(90deg, transparent, ${color}80, transparent)`,
});

const skeletonStyle = (height, width, borderRadius) => ({
  height,
  width,
  borderRadius,
  background: 'linear-gradient(90deg, var(--border-color, #e2e8f0) 25%, var(--card-bg, #f1f5f9) 50%, var(--border-color, #e2e8f0) 75%)',
  backgroundSize: '200% 100%',
  animation: 'kpi-shimmer 1.4s infinite',
});
