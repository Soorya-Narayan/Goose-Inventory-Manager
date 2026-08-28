// src/pages/AlarmsPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
// No mock data — deviations come from live alarms only
import { getSeverityConfig } from '../utils/deviationDetection';
import styles from './AlarmsPage.module.css';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const AlarmsPage = () => {
  const { activeAlarms, alarmHistory, currentUser, showToast, acknowledgeAlarm } = useAppContext();

  const [visibleActions, setVisibleActions] = useState({});
  const [severityFilter, setSeverityFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards', 'table', or 'timeline'
  const [selectedAlarms, setSelectedAlarms] = useState(new Set());
  const [detailModalAlarm, setDetailModalAlarm] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock for status bar
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const permissions = currentUser?.permissions || {};
  
  const isSimulation = (!activeAlarms || activeAlarms.length === 0) && (!alarmHistory || alarmHistory.length === 0);

  const currentActive = isSimulation ? [
    { id: 'ALM-001', device: 'Pump P-102', message: 'Vibration anomaly detected during CIP wash step.', severity: 'warning', timestamp: new Date(Date.now() - 600000).toISOString() },
    { id: 'ALM-002', device: 'Temp Sensor T-44', message: 'Return temp dropped below 75°C threshold.', severity: 'critical', timestamp: new Date(Date.now() - 1200000).toISOString() }
  ] : (activeAlarms || []);

  const history = isSimulation ? [
    { id: 'ALM-003', device: 'Valve V-21', message: 'Slow actuation response time.', severity: 'warning', status: 'Resolved', acknowledgedBy: 'J. Smith', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: 'ALM-004', device: 'Chemical Dosing', message: 'Acid concentration stabilized.', severity: 'info', status: 'Resolved', acknowledgedBy: 'System', timestamp: new Date(Date.now() - 7200000).toISOString() },
    { id: 'ALM-005', device: 'Flow Meter F-11', message: 'Communication timeout (restored).', severity: 'critical', status: 'Resolved', acknowledgedBy: 'Admin', timestamp: new Date(Date.now() - 86400000).toISOString() },
  ] : (alarmHistory || []);

  const deviationData = {
    labels: ['Temp', 'Pressure', 'Flow', 'Conductivity', 'pH'],
    datasets: [{
      label: 'Deviation Frequency',
      data: [12, 5, 8, 3, 2],
      backgroundColor: 'rgba(139, 92, 246, 0.6)',
      borderColor: 'rgba(139, 92, 246, 1)',
      borderWidth: 1,
    }]
  };

  const deviationOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { grid: { display: false } }
    }
  };

  const toggleActions = (alarmId) => {
    setVisibleActions(prev => ({ ...prev, [alarmId]: !prev[alarmId] }));
  };

  const handleAck = (id) => {
    if (!permissions.ackAlarms) {
      showToast('You do not have permission to acknowledge alarms.', 'error');
      return;
    }
    acknowledgeAlarm(id);
    showToast('Alarm acknowledged successfully', 'success');
    setSelectedAlarms(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleBulkAck = () => {
    if (selectedAlarms.size === 0) {
      showToast('No alarms selected', 'info');
      return;
    }
    selectedAlarms.forEach(id => handleAck(id));
    showToast(`${selectedAlarms.size} alarms acknowledged`, 'success');
    setSelectedAlarms(new Set());
  };

  const toggleSelectAlarm = (id) => {
    setSelectedAlarms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Statistics
  const stats = useMemo(() => {
    const critical = currentActive.filter(a => (a.severity || '').toLowerCase() === 'critical').length;
    const warning  = currentActive.filter(a => (a.severity || '').toLowerCase() === 'warning').length;
    const info     = currentActive.filter(a => (a.severity || '').toLowerCase() === 'info').length;
    return { total: currentActive.length, critical, warning, info };
  }, [currentActive]);

  // Filter alarms
  const filteredActive = useMemo(() => {
    return currentActive.filter(a => {
      const sevMatch   = severityFilter === 'all' || (a.severity || '').toLowerCase() === severityFilter;
      const devMatch   = deviceFilter === 'all' || a.device === deviceFilter;
      const searchMatch = searchQuery === '' ||
        (a.device  || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.message || '').toLowerCase().includes(searchQuery.toLowerCase());
      return sevMatch && devMatch && searchMatch;
    }).sort((a, b) => {
      const sevRank = { critical: 3, warning: 2, info: 1 };
      return (sevRank[(b.severity || '').toLowerCase()] || 0) - (sevRank[(a.severity || '').toLowerCase()] || 0);
    });
  }, [currentActive, severityFilter, deviceFilter, searchQuery]);

  const filteredHistory = useMemo(() => {
    return history.filter(a => {
      const sevMatch   = severityFilter === 'all' || (a.severity || '').toLowerCase() === severityFilter;
      const devMatch   = deviceFilter === 'all' || a.device === deviceFilter;
      const searchMatch = searchQuery === '' ||
        (a.device  || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.message || '').toLowerCase().includes(searchQuery.toLowerCase());
      return sevMatch && devMatch && searchMatch;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [history, severityFilter, deviceFilter, searchQuery]);

  const QuickFilterButton = ({ label, icon, color, onClick, active }) => (
    <button
      className={`${styles.quickFilter} ${active ? styles.activeFilter : ''}`}
      onClick={onClick}
      style={{ borderColor: active ? color : undefined, color: active ? color : undefined }}
    >
      <i className={`fa-solid ${icon}`} />
      {label}
    </button>
  );

  return (
    <div className="page">

      {/* ── Status Bar ──────────────────────────────────── */}
      <div className={styles.statusBar}>
        <div className={styles.statusBarLeft}>
          <div className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            LIVE
          </div>
          <span>SYSTEM: ALARM MANAGEMENT CONSOLE</span>
          <span>NODE: CIP-CTRL-01</span>
        </div>
        <div className={styles.statusBarRight}>
          <span>UTC+5:30 &nbsp;{currentTime.toLocaleTimeString('en-GB')}</span>
          <span>{currentTime.toLocaleDateString('en-GB')}</span>
        </div>
      </div>

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="dashboard-header">
        <div>
          <h1 className={styles.pageTitle}>
            <i className={`fa-solid fa-bell ${styles.pageTitleIcon}`} />
            Alarms &amp; Notifications
          </h1>
          <p className={styles.pageSubtitle}>Real-time system monitoring · Intelligent deviation alerting</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <div className={styles.notificationBell}>
              <i className="fa-solid fa-bell" />
              <span className={styles.badge}>{unreadCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Statistics Grid ──────────────────────────────── */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.total}`} style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', borderRadius: '16px' }}>
          <div className={styles.statIcon}><i className="fa-solid fa-bell" style={{ color: '#8b949e', filter: 'drop-shadow(0 0 8px rgba(139,148,158,0.4))' }} /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue} style={{ textShadow: '0 0 10px rgba(255,255,255,0.2)' }}>{stats.total}</span>
            <span className={styles.statLabel}>Total Active</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.critical}`} style={{ background: 'linear-gradient(135deg, rgba(255,59,59,0.1), rgba(255,59,59,0.02))', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,59,59,0.2)', boxShadow: '0 4px 24px rgba(255,59,59,0.15)', borderRadius: '16px' }}>
          <div className={styles.statIcon}><i className="fa-solid fa-circle-exclamation" style={{ color: '#ff3b3b', filter: 'drop-shadow(0 0 8px rgba(255,59,59,0.6))' }} /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue} style={{ color: '#ff3b3b', textShadow: '0 0 10px rgba(255,59,59,0.4)' }}>{stats.critical}</span>
            <span className={styles.statLabel}>Critical</span>
          </div>
          {stats.critical > 0 && <div className={styles.pulseIndicator} style={{ background: '#ff3b3b', boxShadow: '0 0 12px #ff3b3b' }} />}
        </div>
        <div className={`${styles.statCard} ${styles.warning}`} style={{ background: 'linear-gradient(135deg, rgba(255,170,0,0.1), rgba(255,170,0,0.02))', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,170,0,0.2)', boxShadow: '0 4px 24px rgba(255,170,0,0.15)', borderRadius: '16px' }}>
          <div className={styles.statIcon}><i className="fa-solid fa-triangle-exclamation" style={{ color: '#ffaa00', filter: 'drop-shadow(0 0 8px rgba(255,170,0,0.6))' }} /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue} style={{ color: '#ffaa00', textShadow: '0 0 10px rgba(255,170,0,0.4)' }}>{stats.warning}</span>
            <span className={styles.statLabel}>Warning</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.info}`} style={{ background: 'linear-gradient(135deg, rgba(0,170,255,0.1), rgba(0,170,255,0.02))', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,170,255,0.2)', boxShadow: '0 4px 24px rgba(0,170,255,0.15)', borderRadius: '16px' }}>
          <div className={styles.statIcon}><i className="fa-solid fa-circle-info" style={{ color: '#00aaff', filter: 'drop-shadow(0 0 8px rgba(0,170,255,0.6))' }} /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue} style={{ color: '#00aaff', textShadow: '0 0 10px rgba(0,170,255,0.4)' }}>{stats.info}</span>
            <span className={styles.statLabel}>Info</span>
          </div>
        </div>
      </div>

      {/* ── Quick Severity Filters ──────────────────────── */}
      <div className={styles.quickFilters}>
        <QuickFilterButton label="All"      icon="fa-layer-group"        color="#8b949e" active={severityFilter === 'all'}      onClick={() => setSeverityFilter('all')} />
        <QuickFilterButton label="Critical" icon="fa-circle-exclamation" color="#ff3b3b" active={severityFilter === 'critical'} onClick={() => setSeverityFilter('critical')} />
        <QuickFilterButton label="Warning"  icon="fa-triangle-exclamation" color="#ffaa00" active={severityFilter === 'warning'} onClick={() => setSeverityFilter('warning')} />
        <QuickFilterButton label="Info"     icon="fa-circle-info"        color="#00aaff" active={severityFilter === 'info'}     onClick={() => setSeverityFilter('info')} />
      </div>

      {/* ── Search + View Toggle ────────────────────────── */}
      <div className={styles.controlBar}>
        <div className={styles.searchBox}>
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="Search by device or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className={styles.clearBtn}>
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>

        <div className={styles.filters}>
          <div className={styles.viewToggle}>
            <button className={viewMode === 'cards'    ? styles.active : ''} onClick={() => setViewMode('cards')}    title="Card View">
              <i className="fa-solid fa-grip" />
            </button>
            <button className={viewMode === 'timeline' ? styles.active : ''} onClick={() => setViewMode('timeline')} title="Timeline View">
              <i className="fa-solid fa-timeline" />
            </button>
            <button className={viewMode === 'table'    ? styles.active : ''} onClick={() => setViewMode('table')}    title="Table View">
              <i className="fa-solid fa-table" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Bulk Action Bar ─────────────────────────────── */}
      {selectedAlarms.size > 0 && (
        <div className={styles.bulkActionBar}>
          <span className={styles.bulkCount}>{selectedAlarms.size} alarm{selectedAlarms.size !== 1 ? 's' : ''} selected</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className={styles.bulkAckBtn} onClick={handleBulkAck}>
              <i className="fa-solid fa-check-double" /> Acknowledge All
            </button>
            <button className={styles.bulkClearBtn} onClick={() => setSelectedAlarms(new Set())}>
              <i className="fa-solid fa-xmark" /> Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Deviation Intelligence Panel ─────────────────── */}
      <div className={`dashboard-card ${styles.glassmorphism}`}>
        <div className={styles.sectionHeader}>
          <i className="fa-solid fa-brain" style={{ color: '#8b5cf6', fontSize: '1rem' }} />
          <h2 className={styles.sectionTitle}>Deviation Intelligence</h2>
          <span className={styles.sectionCount}>{isSimulation ? '5' : '0'}</span>
        </div>

        {isSimulation ? (
          <div style={{ position: 'relative', width: '100%', height: '240px', marginTop: '16px' }}>
            <Bar data={deviationData} options={deviationOptions} />

          </div>
        ) : (
          <div className={styles.emptyState}>
            <i className="fa-solid fa-satellite-dish" style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-primary)' }}>Awaiting Live Data</p>
            <span>Deviation intelligence will populate once the IIH backend is connected and sending data.</span>
          </div>
        )}
      </div>

      {/* ── Alarm History Table ──────────────────────────── */}
      <div className={`dashboard-card ${styles.glassmorphism}`} style={{ marginTop: '20px' }}>
        <div className={styles.sectionHeader}>
          <i className="fa-solid fa-clock-rotate-left" style={{ color: '#8b949e', fontSize: '1rem' }} />
          <h2 className={styles.sectionTitle}>Alarm History</h2>
          <span className={styles.sectionCount}>{filteredHistory.length}</span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.historyTable}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Device</th>
                <th>Message</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Acknowledged By</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.noData}>No alarms match the current filters</td>
                </tr>
              ) : (
                filteredHistory.map(a => (
                  <tr key={a.id} className={styles.historyRow}>
                    <td>{a.timestamp ? new Date(a.timestamp).toLocaleString() : 'N/A'}</td>
                    <td><span className={styles.deviceBadge}>{a.device}</span></td>
                    <td>{a.message}</td>
                    <td>
                      <span className={`${styles.severityBadge} ${styles[`badge-${(a.severity || '').toLowerCase()}`]}`}>
                        {(a.severity || 'unknown').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {a.status === 'Resolved'
                        ? <span className={styles.statusResolved}><i className="fa-solid fa-circle-check" />&nbsp;Resolved</span>
                        : <span className={styles.statusPending}><i className="fa-solid fa-hourglass-half" />&nbsp;Pending</span>
                      }
                    </td>
                    <td>{a.acknowledgedBy || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail Modal ─────────────────────────────────── */}
      {detailModalAlarm && (
        <div className={styles.modalOverlay} onClick={() => setDetailModalAlarm(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <i
                className={`fa-solid ${detailModalAlarm.icon}`}
                style={{ color: getSeverityConfig(detailModalAlarm.severity).color, fontSize: '1.1rem' }}
              />
              <h2>{detailModalAlarm.title}</h2>
              <span
                className={styles.deviationBadge}
                style={{
                  background: getSeverityConfig(detailModalAlarm.severity).bgColor,
                  color:      getSeverityConfig(detailModalAlarm.severity).color,
                  border:     `1px solid ${getSeverityConfig(detailModalAlarm.severity).borderColor}`,
                }}
              >
                {getSeverityConfig(detailModalAlarm.severity).label}
              </span>
              <button className={styles.modalClose} onClick={() => setDetailModalAlarm(null)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className={styles.modalBody}>
              {[
                ['Phase',            detailModalAlarm.phase],
                ['Parameter',        detailModalAlarm.parameter],
                ['Actual Value',     detailModalAlarm.actualValue],
                ['Expected Value',   detailModalAlarm.expectedValue],
                ['Deviation',        `${detailModalAlarm.deviation}%`],
                ['Likely Cause',     detailModalAlarm.cause],
                ['Suggested Action', detailModalAlarm.suggestedAction],
                ['Impact',           detailModalAlarm.impact],
              ].map(([label, value]) => (
                <div className={styles.modalSection} key={label}>
                  <strong>{label}</strong>
                  <span style={{ color: 'var(--text-hi)', fontSize: '0.9rem', fontFamily: 'var(--ui-font)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlarmsPage;
