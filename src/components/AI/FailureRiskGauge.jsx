// src/components/AI/FailureRiskGauge.jsx — JARVIS-ALPHA Arc Reactor Gauge
import React, { useEffect, useState } from 'react';
import styles from './FailureRiskGauge.module.css';

const FailureRiskGauge = ({ probability = 0, riskLevel = 'Low', riskColor = 'green' }) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const increment = (probability - animatedValue) / steps;
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setAnimatedValue(prev => {
        if (currentStep >= steps) { clearInterval(timer); return probability; }
        return prev + increment;
      });
    }, duration / steps);
    return () => clearInterval(timer);
  }, [probability]);

  // SVG arc parameters – 3/4 circle arc
  const size    = 220;
  const cx      = 110;
  const cy      = 120;
  const radius  = 85;
  const strokeW = 14;

  // Arc from 135° to 405° (270° sweep = 3/4 circle)
  const startDeg = 135;
  const totalDeg = 270;
  const circumference = (totalDeg / 360) * 2 * Math.PI * radius;
  const fillFraction  = Math.min(1, Math.max(0, animatedValue / 100));
  const dashOffset    = circumference * (1 - fillFraction);

  const degToRad = (d) => (d * Math.PI) / 180;
  const polar = (deg) => ({
    x: cx + radius * Math.cos(degToRad(deg)),
    y: cy + radius * Math.sin(degToRad(deg)),
  });

  const arcPath = (startAngle, sweep) => {
    const endAngle  = startAngle + sweep;
    const s = polar(startAngle);
    const e = polar(endAngle);
    const la = sweep > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${la} 1 ${e.x} ${e.y}`;
  };

  // Colours
  const getStroke = () => {
    switch (riskLevel.toLowerCase()) {
      case 'low':    return '#00e676';
      case 'medium': return '#ffaa00';
      case 'high':   return '#ff3b3b';
      default:       return '#00d4ff';
    }
  };
  const stroke = getStroke();

  const riskClass = riskLevel.toLowerCase() === 'low'
    ? styles.riskLow
    : riskLevel.toLowerCase() === 'medium'
    ? styles.riskMedium
    : styles.riskHigh;

  return (
    <div className={styles.gaugeWrapper}>
      <svg
        className={styles.gaugeSvg}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          {/* Glow filter */}
          <filter id="arcGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Gradient arc */}
          <linearGradient id="arcGrad" gradientUnits="userSpaceOnUse"
            x1={polar(startDeg).x} y1={polar(startDeg).y}
            x2={polar(startDeg + totalDeg).x} y2={polar(startDeg + totalDeg).y}
          >
            <stop offset="0%" stopColor={stroke} stopOpacity="0.6" />
            <stop offset="100%" stopColor={stroke} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Outer glow rings */}
        <circle cx={cx} cy={cy} r={radius + 10} fill="none" stroke={stroke} strokeWidth="1" opacity="0.08" className={styles.arcGlowOuter} />
        <circle cx={cx} cy={cy} r={radius - 10} fill="none" stroke={stroke} strokeWidth="1" opacity="0.06" className={styles.arcGlowInner} />

        {/* Track */}
        <path
          d={arcPath(startDeg, totalDeg)}
          fill="none"
          stroke="rgba(0,212,255,0.08)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* Fill */}
        <path
          d={arcPath(startDeg, totalDeg)}
          fill="none"
          stroke={`url(#arcGrad)`}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          filter="url(#arcGlow)"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease' }}
        />

        {/* Centre probability number */}
        <text x={cx} y={cy - 10} textAnchor="middle" dominantBaseline="central"
          fontFamily="'JetBrains Mono', monospace" fontSize="42" fontWeight="700"
          fill={stroke} filter="url(#arcGlow)" style={{ letterSpacing: '-2px' }}>
          {Math.round(animatedValue)}
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle"
          fontFamily="'JetBrains Mono', monospace" fontSize="13"
          fill="rgba(91,168,204,0.9)" letterSpacing="1">
          %
        </text>
        <text x={cx} y={cy + 40} textAnchor="middle"
          fontFamily="'JetBrains Mono', monospace" fontSize="9"
          fill="rgba(91,168,204,0.7)" letterSpacing="3" textTransform="uppercase">
          FAILURE PROB
        </text>
      </svg>

      {/* Risk level tag */}
      <div className={`${styles.riskText} ${riskClass}`}>
        <i className={`fa-solid ${riskLevel === 'Low' ? 'fa-circle-check' : riskLevel === 'Medium' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation'}`} />
        {riskLevel.toUpperCase()} RISK
      </div>
    </div>
  );
};

export default FailureRiskGauge;
