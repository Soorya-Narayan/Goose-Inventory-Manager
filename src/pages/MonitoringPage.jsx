import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import TrendsChart from '../components/Charts/TrendsChart';
import styles from './MonitoringPage.module.css';

const MonitoringPage = () => {
  const { showToast } = useAppContext();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCycle, setSelectedCycle] = useState('live');
  const [isExporting, setIsExporting] = useState(false);

  const cycleOptions = ['live']; // Future: Fetch historical cycles from API

  const handleExportData = async () => {
    if (!startDate || !endDate) {
      showToast('Please select a start and end date for export.', 'error');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      showToast('Start date cannot be after end date.', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch('http://localhost:8080/api/export/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          trendType: 'all' // Changed to export all keys
        })
      });

      if (!response.ok) throw new Error('Export failed');

      const result = await response.json();

      // Create and download CSV file
      const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', result.filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Data exported successfully!', 'success');
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Export failed. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Default to last 7 days
  useEffect(() => {
    const today = new Date();
    const priorDate = new Date(new Date().setDate(today.getDate() - 7));
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(priorDate.toISOString().split('T')[0]);
  }, []);

  return (
    <div className="page">
      <div className="dashboard-header">
        <div>
          <h1>Monitoring Trends</h1>
          <p>Live and historical data trends for key CIP parameters.</p>
        </div>
      </div>

      {/* Enhanced Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label htmlFor="cycle-select">
            <i className="fa-solid fa-flask" /> Cycle
          </label>
          <select
            id="cycle-select"
            value={selectedCycle}
            onChange={(e) => setSelectedCycle(e.target.value)}
            className={styles.select}
          >
            {cycleOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'live' ? '🔴 Live Data' : opt}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>
            <i className="fa-regular fa-calendar" /> Date Range
          </label>
          <div className={styles.dateInputGroup}>
            <div className={styles.dateInput}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <i className="fa-regular fa-calendar-days" />
            </div>
            <span className={styles.dateSeparator}>to</span>
            <div className={styles.dateInput}>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <i className="fa-regular fa-calendar-days" />
            </div>
          </div>
        </div>

        <div className={styles.filterGroup}>
          <button
            type="button"
            onClick={handleExportData}
            className={styles.exportBtn}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                Exporting…
              </>
            ) : (
              <>
                <i className="fa-solid fa-download" />
                Export CSV
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unified Trend Chart (No Tabs) */}
      <div className={`dashboard-card ${styles.chartCard}`}>
        <div className={styles.chartHeader}>
          <h3>
            <i className="fa-solid fa-chart-line" />
            Cycle Parameters Overview
          </h3>
          <div className={styles.chartInfo}>
            {selectedCycle === 'live' && (
              <span className={styles.liveIndicator}>
                <span className={styles.pulse} />
                Live Data
              </span>
            )}
            <span className={styles.infoLabel}>Time-Synchronized Trends</span>
          </div>
        </div>

        <div className={`chart-container large ${styles.chartWrapper}`} style={{ minHeight: '500px', height: 'auto' }}>
          <TrendsChart cycleId={selectedCycle} />
        </div>
      </div>
    </div>
  );
};

export default MonitoringPage;
