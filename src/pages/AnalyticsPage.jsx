// src/pages/AnalyticsPage.jsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import styles from './AnalyticsPage.module.css';
import SustainabilityCard from '../components/SustainabilityCard';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const AnalyticsPage = () => {
  const { showToast } = useAppContext();
  const [period, setPeriod] = useState('monthly');
  const [breakdownType, setBreakdownType] = useState('water');
  
  // Real-time Data relies on actual backend, currently no mock
  const [liveData, setLiveData] = useState(null);

  useEffect(() => {
    const checkSimMode = () => {
      if (localStorage.getItem('cipSystemMode') === 'sim') {
        const interval = setInterval(() => {
          setLiveData({
            oee: (90 + Math.random() * 5).toFixed(1),
            avgCycleTime: Math.floor(40 + Math.random() * 5),
            utilityCost: Math.floor(1200 + Math.random() * 100),
            cyclesRun: Math.floor(120 + Math.random() * 10)
          });
        }, 3000);
        return () => clearInterval(interval);
      }
    };
    return checkSimMode();
  }, []);

  // Cost Configuration State
  const [showRateConfig, setShowRateConfig] = useState(false);
  const [rates, setRates] = useState({
    freshWater: 0.15,   // ₹/L (Fresh Water Only)
    energy: 12.50,      // ₹/kWh
    caustic: 45.00,     // ₹/L
    acid: 38.50         // ₹/L
  });

  const handleRateChange = (e) => {
    const { name, value } = e.target;
    setRates(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const saveRates = () => {
    setShowRateConfig(false);
    showToast('Utility rates updated successfully', 'success');
  };

  const handleExport = () => {
    showToast('No operational logs available to export.', 'warning');
  };

  const totalCost = 0; // Empty state cost

  const kpis = {
    oee: {
      label: "OEE Efficiency",
      value: liveData ? liveData.oee : "94.2",
      unit: '%',
      change: '+1.2%',
      trend: 'up',
      icon: 'fa-chart-line',
      colorClass: styles.iconOee
    },
    avgCycleTime: {
      label: "Avg Cycle Time",
      value: liveData ? liveData.avgCycleTime : "42",
      unit: 'm',
      change: '-3m',
      trend: 'down',
      icon: 'fa-stopwatch',
      colorClass: styles.iconTime
    },
    utilityCost: {
      label: "Total Utility Cost",
      value: liveData ? `₹${liveData.utilityCost}` : "₹1,240",
      unit: '',
      change: '-₹85',
      trend: 'down',
      icon: 'fa-money-bill-wave',
      colorClass: styles.iconCost
    },
    cyclesRun: {
      label: "Total Cycles",
      value: liveData ? liveData.cyclesRun : "124",
      unit: 'runs',
      change: '+12',
      trend: 'up',
      icon: 'fa-arrows-rotate',
      colorClass: styles.iconCycle
    }
  };

  const donutData = {
    labels: ['Water', 'Chemicals', 'Energy'],
    datasets: [
      {
        data: liveData ? [40 + Math.random()*10, 30 + Math.random()*10, 20 + Math.random()*10] : [45, 35, 20],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 206, 86, 0.8)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#888', font: { family: 'Inter, sans-serif' } }
      }
    },
    cutout: '70%'
  };

  const historyData = [
    { id: 'CIP-1042', time: '10:30 AM', duration: '42m', status: 'Optimal', cost: '₹45' },
    { id: 'CIP-1041', time: '08:15 AM', duration: '45m', status: 'Warning', cost: '₹52' },
    { id: 'CIP-1040', time: '06:00 AM', duration: '41m', status: 'Optimal', cost: '₹44' },
    { id: 'CIP-1039', time: 'Yesterday', duration: '48m', status: 'Deviation', cost: '₹60' },
  ];

  return (
    <div className="page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="dashboard-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--text-primary)' }}>Performance Analytics</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Operational efficiency, resource usage, and cost analysis.</p>
        </div>
        <div className={styles.periodSelector}>
          <button className={period === 'weekly' ? styles.periodActive : ''} onClick={() => setPeriod('weekly')}>Last 7 Days</button>
          <button className={period === 'monthly' ? styles.periodActive : ''} onClick={() => setPeriod('monthly')}>Last 30 Days</button>
          <button className={period === 'yearly' ? styles.periodActive : ''} onClick={() => setPeriod('yearly')}>Year to Date</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* KPI Grid */}
        <div className={styles.kpiGrid}>
          {Object.entries(kpis).map(([key, data]) => (
            <div key={key} className={styles.kpiCard} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <div className={styles.kpiHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className={`${styles.iconBox} ${data.colorClass}`} style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', opacity: 0.8 }}>
                    <i className={`fa-solid ${data.icon}`}></i>
                  </div>
                  <span className={styles.kpiLabel} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{data.label}</span>
                </div>
                {key === 'utilityCost' && (
                  <button className={styles.editRatesBtn} onClick={() => setShowRateConfig(!showRateConfig)} title="Configure Utility Rates" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <i className="fa-solid fa-gear"></i>
                  </button>
                )}
              </div>

              {key === 'utilityCost' && showRateConfig && (
                <div className={styles.rateConfigPanel} style={{ padding: '10px', background: 'var(--light-bg)', borderRadius: '8px', marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>Set Unit Rates (₹)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input type="number" step="0.01" name="freshWater" value={rates.freshWater} onChange={handleRateChange} placeholder="Water" style={{ padding: '5px' }} />
                    <input type="number" step="0.1" name="energy" value={rates.energy} onChange={handleRateChange} placeholder="Energy" style={{ padding: '5px' }} />
                  </div>
                  <button onClick={saveRates} style={{ marginTop: '10px', width: '100%', padding: '6px', background: 'var(--primary-blue)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Rates</button>
                </div>
              )}

              <div className={styles.kpiBody} style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                {data.value}
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '4px' }}>{data.unit}</span>
              </div>
              <div className={styles.kpiTrend} style={{ fontSize: '0.85rem', color: data.trend === 'up' ? '#10b981' : data.trend === 'down' ? '#ef4444' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <i className={`fa-solid ${data.trend === 'up' ? 'fa-arrow-up' : data.trend === 'down' ? 'fa-arrow-down' : 'fa-minus'}`}></i>
                <span>{!liveData ? `${data.change} vs last period` : 'Awaiting live data integration'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Empty States for Charts & Logs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1 }}>
          <div style={{ position: 'relative', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '300px' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-primary)', alignSelf: 'flex-start' }}>Usage Breakdown</h3>
            <div style={{ position: 'relative', width: '100%', height: '220px', display: 'flex', justifyContent: 'center' }}>
               <Doughnut data={donutData} options={donutOptions} />

            </div>
          </div>

          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Operational Logs</h3>
              <button onClick={handleExport} style={{ background: 'var(--primary-blue)', border: 'none', borderRadius: '6px', padding: '6px 16px', cursor: 'pointer', color: '#fff', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-download"></i> Export
              </button>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {historyData.map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{log.id}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{log.time}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><i className="fa-regular fa-clock" style={{marginRight:'4px'}}></i>{log.duration}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: log.status === 'Optimal' ? '#10b981' : log.status === 'Warning' ? '#f59e0b' : '#ef4444' }}>{log.status}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', width: '50px', textAlign: 'right' }}>{log.cost}</span>
                  </div>
                </div>
              ))}
              {historyData.length === 0 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-list-ul" style={{ fontSize: '2.5rem', color: 'var(--text-secondary)', opacity: 0.3, marginBottom: '16px' }}></i>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No recent cycles recorded.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
