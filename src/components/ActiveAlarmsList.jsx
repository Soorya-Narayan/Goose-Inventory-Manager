// src/components/ActiveAlarmsList.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import styles from './ActiveAlarmsList.module.css';

const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  if (typeof v === 'object') {
    try {
      if (v.A || v.B) {
        return [...(Array.isArray(v.A) ? v.A : []), ...(Array.isArray(v.B) ? v.B : [])];
      }
      return Object.values(v).flatMap(x => (Array.isArray(x) ? x : [x])).filter(Boolean);
    } catch (e) {
      return [];
    }
  }
  return [];
};

const getSeverityIcon = (severity) => {
  switch (severity) {
    case 'critical': return 'fa-solid fa-triangle-exclamation';
    case 'warning':  return 'fa-solid fa-circle-exclamation';
    default:         return 'fa-solid fa-circle-info';
  }
};

const formatRelativeTime = (timestamp) => {
  const date = new Date(timestamp || Date.now());
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return date.toLocaleDateString();
};

export default function ActiveAlarmsList({ alarms: propAlarms }) {
  const { selected } = useAppContext();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);

  let raw = propAlarms ?? selected?.activeAlarms ?? [];
  const list = asArray(raw);

  const criticalCount = list.filter(a => (a.severity || a.level || '').toLowerCase() === 'critical').length;
  const warningCount  = list.filter(a => (a.severity || a.level || '').toLowerCase() === 'warning').length;
  const infoCount     = list.filter(a => {
    const s = (a.severity || a.level || '').toLowerCase();
    return s !== 'critical' && s !== 'warning';
  }).length;

  const displayList = list.slice(0, 5);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className={styles.container}>
      {/* ── Header ── */}
      <div className={styles.header} style={criticalCount > 0 ? {
        background: 'linear-gradient(135deg, rgba(239,68,68,.06), var(--card-bg))',
      } : {}}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIconWrap} style={criticalCount > 0 ? {
            background: 'linear-gradient(135deg, rgba(239,68,68,.2), rgba(239,68,68,.08))',
            borderColor: 'rgba(239,68,68,.35)',
            boxShadow: '0 0 12px rgba(239,68,68,.2)',
          } : {}}>
            <i
              className={`fa-solid fa-bell${criticalCount > 0 ? ' fa-beat-fade' : ''}`}
              style={{ color: criticalCount > 0 ? '#ef4444' : undefined }}
            />
          </div>
          <div>
            <h3 className={styles.headerTitle}>Active Alarms</h3>
            <div className={styles.headerSubtitle}>Real-time fault monitor</div>
          </div>
        </div>

        <div className={styles.badges}>
          {list.length === 0 && (
            <span className={styles.allClearBadge}>
              <i className="fa-solid fa-shield-check" />
              Clear
            </span>
          )}
          {criticalCount > 0 && (
            <span className={`${styles.badge} ${styles.badgeCritical}`}>
              <i className="fa-solid fa-triangle-exclamation" />
              {criticalCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className={`${styles.badge} ${styles.badgeWarning}`}>
              <i className="fa-solid fa-circle-exclamation" />
              {warningCount}
            </span>
          )}
          {infoCount > 0 && (
            <span className={`${styles.badge} ${styles.badgeInfo}`}>
              <i className="fa-solid fa-circle-info" />
              {infoCount}
            </span>
          )}
        </div>
      </div>

      {/* ── Alarm list ── */}
      <div className={styles.listContainer}>
        {list.length === 0 ? (
          <div className={styles.allClear}>
            {/* Outer pulsing ring */}
            <div style={{ position: 'relative', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '2px solid rgba(16,185,129,.2)',
                animation: 'pulseGreenOuter 2.5s ease-in-out infinite',
              }} />
              <div className={styles.allClearIconRing}>
                <i className="fa-solid fa-shield-check" />
              </div>
            </div>
            <span className={styles.allClearText}>All Systems Operational</span>
            <span className={styles.allClearSub}>No active faults detected</span>
          </div>
        ) : (
          <div className={styles.alarmList}>
            {displayList.map((alarm, idx) => {
              const severity  = (alarm.severity || alarm.level || 'info').toLowerCase();
              const isExpanded = expandedId === idx;
              const iconClass  = getSeverityIcon(severity);

              return (
                <div
                  key={idx}
                  className={`${styles.alarmRow} ${styles[severity]} ${isExpanded ? styles.expanded : ''}`}
                  onClick={() => toggleExpand(idx)}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Main row */}
                  <div className={styles.alarmMain}>
                    <div className={styles.alarmIconWrap}>
                      <i className={`${iconClass}${severity === 'critical' ? ' fa-beat-fade' : ''}`} />
                    </div>

                    <div className={styles.alarmText}>
                      <span className={styles.alarmTitle}>
                        {alarm.message || alarm.name || 'Unknown Alarm'}
                      </span>
                      <div className={styles.alarmMeta}>
                        <span className={styles.alarmTime}>
                          <i className="fa-regular fa-clock" style={{ marginRight: 3 }} />
                          {formatRelativeTime(alarm.timestamp)}
                        </span>
                        <span className={styles.severityPill}>
                          {severity}
                        </span>
                      </div>
                    </div>

                    <div className={styles.expandChevron}>
                      <i className="fa-solid fa-chevron-down" />
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className={styles.alarmDetails}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Source</span>
                        <span className={styles.detailValue}>{alarm.source || alarm.tag || 'System'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Code</span>
                        <span className={styles.detailValue}>{alarm.code || '—'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Value</span>
                        <span className={styles.detailValue}>
                          {alarm.value !== undefined ? alarm.value : '—'}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Time</span>
                        <span className={styles.detailValue}>
                          {new Date(alarm.timestamp || Date.now()).toLocaleTimeString()}
                        </span>
                      </div>
                      {alarm.description && (
                        <div className={`${styles.detailItem} ${styles.detailItemFull}`}>
                          <span className={styles.detailLabel}>Description</span>
                          <span className={styles.detailValue}>{alarm.description}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {list.length > 5 && (
        <div className={styles.footer}>
          <span className={styles.footerCount}>
            Showing 5 of {list.length} alarms
          </span>
          <button className={styles.viewAllBtn} onClick={() => navigate('/alarms')}>
            View All
            <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
      )}
    </div>
  );
}
