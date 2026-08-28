// src/components/CycleProgress.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import styles from './CycleProgress.module.css';

/* ─── Default CIP step pipeline (always visible) ──────────────── */
const DEFAULT_STEPS = [
  { name: 'Pre-Rinse',   icon: 'fa-shower',       duration: 300,  color: '#0ea5e9' },
  { name: 'Caustic',     icon: 'fa-flask',         duration: 900,  color: '#f59e0b' },
  { name: 'Rinse',       icon: 'fa-droplet',       duration: 300,  color: '#3b82f6' },
  { name: 'Acid',        icon: 'fa-flask-vial',    duration: 600,  color: '#ef4444' },
  { name: 'Final Rinse', icon: 'fa-check-circle',  duration: 300,  color: '#10b981' },
];

/* ─── Mock last-cycle summary (replace with API when available) ── */
const MOCK_LAST_CYCLE = {
  id: 'CYC-0042',
  result: 'Pass',
  duration: '28m 14s',
  timeAgo: '2h ago',
  temp: '78°C',
  pressure: '3.2 bar',
};

const CycleProgress = () => {
  const [cycleData, setCycleData] = useState({
    status: 'idle',
    current_step: 0,
    progress_percent: 0,
    time_remaining: 0,
    steps: [],
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [elapsed, setElapsed]   = useState(0);

  /* ── Elapsed timer ─────────────────────────────────────────── */
  useEffect(() => {
    if (cycleData.status !== 'running') { setElapsed(0); return; }
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [cycleData.status]);

  /* ── Fetch cycle status ────────────────────────────────────── */
  const fetchCycleStatus = async () => {
    try {
      const data = await api.getCycleStatus();
      setCycleData(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch cycle status:', err);
      setError(err.message);
    }
  };

  // Polling disabled for simulation
  useEffect(() => { /* fetchCycleStatus(); */ }, []);

  /* ── Controls ──────────────────────────────────────────────── */
  const handleControl = async (action) => {
    setLoading(true);
    try {
      await api.controlCycle(action);
      await fetchCycleStatus();
      setError(null);
    } catch (err) {
      setError(err.message || `Failed to ${action} cycle`);
    } finally {
      setLoading(false);
    }
  };

  const handleStart  = () => handleControl('start');
  const handlePause  = () => handleControl('pause');
  const handleResume = () => handleControl('resume');
  const handleStop   = () => handleControl('stop');

  /* ── Derived ───────────────────────────────────────────────── */
  const isIdle      = cycleData.status === 'idle';
  const isRunning   = cycleData.status === 'running';
  const isPaused    = cycleData.status === 'paused';
  const isCompleted = cycleData.status === 'completed';

  const progressPercent  = Math.max(0, Math.min(100, cycleData.progress_percent || 0));
  const currentStepIndex = cycleData.current_step || 0;

  /* Merge API steps with defaults */
  const steps = (cycleData.steps?.length ? cycleData.steps : DEFAULT_STEPS).map((s, i) => ({
    ...DEFAULT_STEPS[i] || {},
    ...s,
    icon: DEFAULT_STEPS[i]?.icon || 'fa-circle',
    color: DEFAULT_STEPS[i]?.color || '#3b82f6',
  }));

  /* Progress-bar segment width per step */
  const segW = steps.length > 1 ? 100 / (steps.length - 1) : 100;
  const filledW = isIdle ? 0 : Math.min(100, progressPercent);

  const formatDuration = (secs) => {
    if (!Number.isFinite(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatElapsed = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  /* ── Status colors ─────────────────────────────────────────── */
  const statusMeta = {
    idle:      { color: '#94a3b8', label: 'IDLE',      bg: 'rgba(148,163,184,.12)' },
    running:   { color: '#22c55e', label: 'RUNNING',   bg: 'rgba(34,197,94,.12)'   },
    paused:    { color: '#f59e0b', label: 'PAUSED',    bg: 'rgba(245,158,11,.12)'  },
    completed: { color: '#3b82f6', label: 'COMPLETED', bg: 'rgba(59,130,246,.12)'  },
  };
  const meta = statusMeta[cycleData.status] || statusMeta.idle;

  return (
    <section className={styles.cycleCard} aria-label="Cycle progress">

      {/* ── Top gradient accent ───────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: isRunning
          ? 'linear-gradient(90deg, #3b82f6, #22c55e, #3b82f6)'
          : isCompleted
          ? 'linear-gradient(90deg, #22c55e, #10b981)'
          : 'linear-gradient(90deg, var(--border-color), var(--border-color))',
        backgroundSize: '200% 100%',
        animation: isRunning ? 'cp-slide 2s linear infinite' : 'none',
        borderRadius: '16px 16px 0 0',
      }} />

      <style>{`
        @keyframes cp-slide { 0% { background-position: 0% 0; } 100% { background-position: 200% 0; } }
        @keyframes cp-blink { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>
            <i className={`fa-solid fa-rotate${isRunning ? ' fa-spin' : ''}`} style={{ marginRight: 8, color: meta.color, opacity: 0.85 }} />
            Cycle Progress
          </h3>
          <div className={styles.statusRow}>
            {/* Status pill */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800,
              letterSpacing: '0.06em', background: meta.bg, color: meta.color,
              border: `1px solid ${meta.color}35`,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: meta.color,
                boxShadow: isRunning ? `0 0 8px ${meta.color}` : 'none',
                animation: isRunning ? 'cp-blink 1.5s infinite' : 'none',
              }} />
              {meta.label}
            </span>

            {isRunning && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                <i className="fa-regular fa-clock" />
                {formatElapsed(elapsed)}
              </span>
            )}

            {cycleData.time_remaining > 0 && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="fa-solid fa-hourglass-half" />
                {formatDuration(cycleData.time_remaining)} left
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* ── Last cycle summary chip ── */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
            padding: '8px 14px', borderRadius: 12,
            background: 'var(--light-bg, #f1f5f9)',
            border: '1px solid var(--border-color)',
            fontSize: '0.72rem', color: 'var(--text-secondary)', gap: 3,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Cycle</span>
              <span style={{
                padding: '1px 7px', borderRadius: 10, fontSize: '0.62rem', fontWeight: 800,
                background: MOCK_LAST_CYCLE.result === 'Pass' ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)',
                color: MOCK_LAST_CYCLE.result === 'Pass' ? '#16a34a' : '#ef4444',
                border: `1px solid ${MOCK_LAST_CYCLE.result === 'Pass' ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`,
              }}>
                {MOCK_LAST_CYCLE.result}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{MOCK_LAST_CYCLE.id}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{MOCK_LAST_CYCLE.duration}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{MOCK_LAST_CYCLE.timeAgo}</span>
            </div>
          </div>

          {/* ── Control Buttons ── */}
          <div className={styles.controls}>
            {(isIdle || isCompleted) && (
              <button onClick={handleStart} className={`${styles.btn} ${styles.btnStart}`} disabled={loading} title="Start Cycle">
                <i className="fa-solid fa-play" /><span>Start</span>
              </button>
            )}
            {isRunning && (
              <>
                <button onClick={handlePause} className={`${styles.btn} ${styles.btnPause}`} disabled={loading} title="Pause Cycle">
                  <i className="fa-solid fa-pause" /><span>Pause</span>
                </button>
                <button onClick={handleStop} className={`${styles.btn} ${styles.btnStop}`} disabled={loading} title="Stop Cycle">
                  <i className="fa-solid fa-stop" /><span>Stop</span>
                </button>
              </>
            )}
            {isPaused && (
              <>
                <button onClick={handleResume} className={`${styles.btn} ${styles.btnResume}`} disabled={loading} title="Resume Cycle">
                  <i className="fa-solid fa-play" /><span>Resume</span>
                </button>
                <button onClick={handleStop} className={`${styles.btn} ${styles.btnStop}`} disabled={loading} title="Stop Cycle">
                  <i className="fa-solid fa-stop" /><span>Stop</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <div className={styles.errorBanner}>
          <i className="fa-solid fa-triangle-exclamation" /><span>{error}</span>
        </div>
      )}

      {/* ── Step pipeline ─────────────────────────────────────── */}
      <div style={{ position: 'relative', margin: '8px 0 6px' }}>

        {/* Track line */}
        <div style={{
          position: 'absolute', top: 20, left: '3%', right: '3%', height: 4,
          background: 'var(--border-color, #e5e7eb)', borderRadius: 10,
          overflow: 'hidden',
        }}>
          {/* Progress fill */}
          <div style={{
            height: '100%', borderRadius: 10,
            width: `${filledW}%`,
            background: isRunning
              ? 'linear-gradient(90deg, #3b82f6, #22c55e)'
              : isCompleted
              ? '#22c55e'
              : '#94a3b8',
            transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
            boxShadow: isRunning ? '0 0 10px rgba(59,130,246,.5)' : 'none',
          }} />
        </div>

        {/* Step nodes */}
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          {steps.map((step, idx) => {
            const isStepDone   = !isIdle && idx < currentStepIndex;
            const isStepActive = !isIdle && idx === currentStepIndex;
            const nodeColor    = isStepDone ? '#22c55e' : isStepActive ? step.color : 'var(--border-color, #e5e7eb)';

            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                {/* Circle node */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: isStepDone
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : isStepActive
                    ? `linear-gradient(135deg, ${step.color}cc, ${step.color})`
                    : 'var(--card-bg, #fff)',
                  border: `2.5px solid ${nodeColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isStepDone || isStepActive ? '#fff' : 'var(--text-secondary)',
                  fontSize: isStepDone ? '0.8rem' : '0.85rem',
                  boxShadow: isStepActive
                    ? `0 0 0 5px ${step.color}25, 0 4px 12px ${step.color}35`
                    : isStepDone
                    ? '0 4px 10px rgba(34,197,94,.3)'
                    : '0 2px 6px rgba(0,0,0,.06)',
                  transition: 'all 0.4s cubic-bezier(.4,0,.2,1)',
                  animation: isStepActive ? 'none' : 'none',
                  position: 'relative',
                }}>
                  {isStepDone
                    ? <i className="fa-solid fa-check" />
                    : <i className={`fa-solid ${step.icon}`} />
                  }
                  {/* Active pulse ring */}
                  {isStepActive && (
                    <div style={{
                      position: 'absolute', inset: -6, borderRadius: '50%',
                      border: `2px solid ${step.color}`,
                      opacity: 0.5,
                      animation: 'cp-blink 1.5s ease-in-out infinite',
                    }} />
                  )}
                </div>

                {/* Label */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '0.7rem', fontWeight: isStepActive ? 700 : 600,
                    color: isStepActive ? step.color : isStepDone ? 'var(--text-primary)' : 'var(--text-secondary)',
                    letterSpacing: '-0.01em', lineHeight: 1.2,
                  }}>
                    {step.name}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', opacity: 0.7, marginTop: 2 }}>
                    {Math.floor((step.duration || 0) / 60)}m
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom progress bar + info ────────────────────────── */}
      <div style={{ marginTop: 16 }}>
        <div className={styles.progressInfo}>
          <span className={styles.stepName}>
            {!isIdle && steps[currentStepIndex]
              ? steps[currentStepIndex].name
              : 'Ready to start cycle'}
          </span>
          <span className={styles.percentage}>{progressPercent.toFixed(0)}%</span>
        </div>

        <div className={styles.progressBarBg} role="progressbar" aria-valuenow={progressPercent}>
          <div
            className={styles.progressBarFill}
            style={{
              width: `${progressPercent}%`,
              background: isRunning
                ? 'linear-gradient(90deg, #3b82f6, #22c55e)'
                : isCompleted
                ? '#22c55e'
                : '#94a3b8',
            }}
          />
        </div>
      </div>

    </section>
  );
};

export default CycleProgress;
