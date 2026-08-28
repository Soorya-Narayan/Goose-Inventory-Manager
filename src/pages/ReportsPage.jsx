// src/pages/ReportsPage.jsx
import React, { useState, useEffect } from 'react';
import styles from './ReportsPage.module.css';

const ReportsPage = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCycle, setSelectedCycle] = useState(null);
    const [filter, setFilter] = useState('All');

    const MODEL_API_URL = window.location.origin.includes('localhost:5173')
        ? 'http://localhost:5002'
        : '/ml-api';

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${MODEL_API_URL}/api/history`);
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            } else {
                // Fallback mock
                setHistory(generateMockData());
            }
        } catch (e) {
            console.error(e);
            setHistory(generateMockData());
        } finally {
            setLoading(false);
        }
    };

    const generateMockData = () => {
        const statuses = ['Completed', 'Completed', 'Completed', 'Warning', 'Completed', 'Critical', 'Completed'];
        return Array(10).fill(0).map((_, i) => ({
            id: `CIP-${1000 + i}`,
            timestamp: new Date(Date.now() - i * 86400000).toISOString(),
            recipe: 'Standard Clean',
            health_score: 95 - (i % 3) * 12,
            sustainability_score: 88 - (i % 2) * 5,
            status: statuses[i % statuses.length]
        }));
    };

    const handleExport = (cycle) => {
        alert(`Downloading Report for ${cycle.id}...\n(Demo: PDF generation would happen here)`);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'success';
            case 'Warning': return 'warning';
            case 'Critical': return 'danger';
            default: return 'neutral';
        }
    };

    const getGrade = (score) => {
        if (score >= 90) return { grade: 'A', color: '#10b981' };
        if (score >= 80) return { grade: 'B', color: '#3b82f6' };
        if (score >= 70) return { grade: 'C', color: '#f59e0b' };
        return { grade: 'F', color: '#ef4444' };
    };

    const filteredHistory = filter === 'All'
        ? history
        : history.filter(h => h.status === filter);

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <div>
                    <h1><i className="fa-solid fa-file-contract"></i> Compliance Reports</h1>
                    <p>Historical CIP cycles analyzed by AI Models</p>
                </div>
                <div className={styles.controls} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <i className="fa-solid fa-filter" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.9rem', pointerEvents: 'none' }}></i>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className={styles.filterSelect}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 36px', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', appearance: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', minWidth: '160px' }}
                        >
                            <option value="All" style={{ background: '#1e293b' }}>All Statuses</option>
                            <option value="Completed" style={{ background: '#1e293b' }}>Passed</option>
                            <option value="Warning" style={{ background: '#1e293b' }}>Warnings</option>
                            <option value="Critical" style={{ background: '#1e293b' }}>Critical</option>
                        </select>
                        <i className="fa-solid fa-chevron-down" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.8rem', pointerEvents: 'none' }}></i>
                    </div>
                    <button className={styles.exportBtn} style={{ background: 'var(--primary-blue)', border: 'none', padding: '10px 20px', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }} onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'} onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}>
                        <i className="fa-solid fa-download"></i> Export Log
                    </button>
                </div>
            </header>

            <div className={styles.content}>
                <div className={styles.tableCard}>
                    <table className={styles.reportTable}>
                        <thead>
                            <tr>
                                <th>Cycle ID</th>
                                <th>Date / Time</th>
                                <th>Recipe</th>
                                <th>Health Score</th>
                                <th>Sustain. Score</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>Loading history...</td></tr>
                            ) : filteredHistory.map(cycle => {
                                const healthGrade = getGrade(cycle.health_score);
                                const sustGrade = getGrade(cycle.sustainability_score);
                                return (
                                    <tr key={cycle.id} style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', transition: 'all 0.2s', borderBottom: '1px solid rgba(255,255,255,0.05)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
                                        <td style={{ padding: '16px' }}><span className={styles.idBadge} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cycle.id}</span></td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{new Date(cycle.timestamp).toLocaleString()}</td>
                                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{cycle.recipe}</td>
                                        <td>
                                            <div className={styles.scoreCell} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className={styles.gradeBadge} style={{ backgroundColor: `${healthGrade.color}20`, color: healthGrade.color, padding: '4px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}>
                                                    {healthGrade.grade}
                                                </span>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cycle.health_score}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.scoreCell} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <i className="fa-solid fa-leaf" style={{ color: '#10b981' }}></i>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cycle.sustainability_score}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.5px', boxShadow: cycle.status === 'Completed' ? '0 0 10px rgba(16,185,129,0.3)' : cycle.status === 'Warning' ? '0 0 10px rgba(245,158,11,0.3)' : cycle.status === 'Critical' ? '0 0 10px rgba(239,68,68,0.3)' : 'none', color: cycle.status === 'Completed' ? '#10b981' : cycle.status === 'Warning' ? '#f59e0b' : cycle.status === 'Critical' ? '#ef4444' : '#fff', background: cycle.status === 'Completed' ? 'rgba(16,185,129,0.1)' : cycle.status === 'Warning' ? 'rgba(245,158,11,0.1)' : cycle.status === 'Critical' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.1)', border: `1px solid ${cycle.status === 'Completed' ? 'rgba(16,185,129,0.2)' : cycle.status === 'Warning' ? 'rgba(245,158,11,0.2)' : cycle.status === 'Critical' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.2)'}` }}>
                                                {cycle.status === 'Completed' && <i className="fa-solid fa-check-circle" style={{marginRight: '6px'}}></i>}
                                                {cycle.status === 'Warning' && <i className="fa-solid fa-triangle-exclamation" style={{marginRight: '6px'}}></i>}
                                                {cycle.status === 'Critical' && <i className="fa-solid fa-circle-exclamation" style={{marginRight: '6px'}}></i>}
                                                {cycle.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={styles.actionBtn}
                                                onClick={() => handleExport(cycle)}
                                                title="Download PDF"
                                            >
                                                <i className="fa-solid fa-file-pdf"></i>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
