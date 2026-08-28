// src/components/RecentCyclesTable.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import styles from './RecentCyclesTable.module.css';

const RecentCyclesTable = () => {
  const [cycles, setCycles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch recent cycles from backend
  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const data = await api.getRecentCycles?.() || [];
        setCycles(data);
      } catch (err) {
        console.error("Failed to fetch recent cycles", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCycles();
  }, []);


  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (cycles.length === 0) return;

    // CSV headers
    const headers = ['Cycle ID', 'Status', 'Duration', 'Timestamp', 'Avg Temperature (°C)', 'Avg Pressure (bar)'];

    // CSV rows
    const rows = cycles.map(cycle => [
      cycle.id,
      cycle.status,
      cycle.duration,
      cycle.timestamp,
      cycle.temperature,
      cycle.pressure
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `recent_cycles_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>
          <i className="fa-solid fa-clock-rotate-left" />
          Recent Cycles
          {cycles.length > 0 && (
            <span style={{
              marginLeft: 8, fontSize: '0.68rem', fontWeight: 700,
              padding: '2px 8px', borderRadius: 20,
              background: 'rgba(59,130,246,.12)', color: '#3b82f6',
              border: '1px solid rgba(59,130,246,.25)',
            }}>
              {cycles.length}
            </span>
          )}
        </h3>
        <button
          onClick={handleExportCSV}
          className={styles.exportBtn}
          disabled={cycles.length === 0}
          title="Export to CSV"
        >
          <i className="fa-solid fa-download" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className={styles.tableWrapper}>
        {isLoading ? (
          /* ── Skeleton rows ── */
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                height: 40, borderRadius: 8,
                background: 'linear-gradient(90deg, var(--border-color) 25%, var(--card-bg) 50%, var(--border-color) 75%)',
                backgroundSize: '200% 100%',
                animation: `kpi-shimmer ${1.2 + i * 0.1}s infinite`,
              }} />
            ))}
          </div>
        ) : cycles.length === 0 ? (
          /* ── Engaging empty state ── */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '36px 24px', gap: 14, textAlign: 'center',
          }}>
            <div style={{
              width: 70, height: 70, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(59,130,246,.1), rgba(99,102,241,.08))',
              border: '2px dashed rgba(99,102,241,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem', color: '#6366f1', opacity: 0.7,
            }}>
              <i className="fa-solid fa-rotate" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                No cycles recorded yet
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: 220, lineHeight: 1.5 }}>
                Start a CIP cycle to see history, duration and pass/fail results here.
              </div>
            </div>
            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 18px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff', fontSize: '0.8rem', fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
              onClick={() => {}} // Connects to CycleProgress.handleStart when wired
            >
              <i className="fa-solid fa-play" style={{ fontSize: '0.72rem' }} />
              Start First Cycle
            </button>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cycle ID</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Timestamp</th>
                <th>Avg Temp</th>
                <th>Avg Press</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((cycle) => {
                const isPass = cycle.status === 'Pass';
                const statusColor = isPass ? '#22c55e' : cycle.status === 'Running' ? '#3b82f6' : '#ef4444';
                return (
                  <tr key={cycle.id}>
                    <td className={styles.idCell}>
                      <i className="fa-solid fa-hashtag" style={{ opacity: 0.4, marginRight: 4 }} />
                      {cycle.id}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.03em',
                        padding: '3px 10px', borderRadius: 20,
                        background: `${statusColor}15`, color: statusColor,
                        border: `1px solid ${statusColor}30`,
                        boxShadow: `0 0 8px ${statusColor}20`,
                      }}>
                        <i className={`fa-solid ${isPass ? 'fa-circle-check' : cycle.status === 'Running' ? 'fa-spinner fa-spin' : 'fa-circle-xmark'}`}
                          style={{ fontSize: '0.65rem' }} />
                        {cycle.status}
                      </span>
                    </td>
                    <td className={styles.duration}>
                      <i className="fa-regular fa-clock" style={{ opacity: 0.5, marginRight: 4 }} />
                      {cycle.duration}
                    </td>
                    <td className={styles.timestamp}>{cycle.timestamp}</td>
                    <td className={styles.value}>{cycle.temperature}°C</td>
                    <td className={styles.value}>{cycle.pressure} bar</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default RecentCyclesTable;