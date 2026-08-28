// src/components/SustainabilityCard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import {
    calculateEnergyUsage,
    calculateCosts,
    formatCurrency,
    calculateSustainabilityScore,
    calculateCarbonFootprint,
    COSTS
} from '../utils/resourceCalculations';


const SustainabilityCard = ({ liveData: propLiveData, currency = '$' }) => {
    const { isDarkTheme, liveParameters } = useAppContext();
    const liveData = propLiveData || liveParameters || {};
    const [cumulativeUsage, setCumulativeUsage] = useState({
        waterLiters: 0,
        energyKwh: 0,
        chemicalLiters: 0
    });

    // Update cumulative usage based on live data simulation
    // In a real app, this would aggregate real-time flows
    useEffect(() => {
        if (!liveData) return;

        const updateInterval = setInterval(() => {
            setCumulativeUsage(prev => ({
                waterLiters: prev.waterLiters + (liveData.flowRate > 0 ? liveData.flowRate / 60 : 0),
                energyKwh: prev.energyKwh + calculateEnergyUsage(
                    liveData.flowRate || 0,
                    liveData.temperature || 20,
                    20, // Supply temp
                    1   // 1 second duration
                ),
                chemicalLiters: prev.chemicalLiters + (liveData.conductivity > 20 ? 0.05 : 0) // Mock chemical dosing
            }));
        }, 1000);

        return () => clearInterval(updateInterval);
    }, [liveData]);

    // Calculate derived metrics
    const costs = useMemo(() => {
        const c = calculateCosts(cumulativeUsage);
        c.total = c.water + c.energy + c.chemical;
        return c;
    }, [cumulativeUsage]);

    const score = useMemo(() => calculateSustainabilityScore(cumulativeUsage), [cumulativeUsage]);
    const co2 = useMemo(() => calculateCarbonFootprint(cumulativeUsage), [cumulativeUsage]);
    const costTrend = 0; // Empty state until historical average is fetched

    return (
        <>
            <style>{`
        .sus-card {
            background: ${isDarkTheme ? 'rgba(30, 41, 59, 0.6)' : 'white'};
            border-radius: 12px;
            padding: 20px;
            border: 1px solid ${isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
            color: ${isDarkTheme ? '#f1f5f9' : '#1e293b'};
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .sus-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
        }

        .sus-title-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .sus-title {
            font-size: 16px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .sus-subtitle {
            font-size: 12px;
            color: ${isDarkTheme ? '#94a3b8' : '#64748b'};
        }

        .sus-score-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: rgba(34, 197, 94, 0.15);
            color: #22c55e;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 700;
        }

        .sus-main-metric {
            margin-bottom: 24px;
            padding-bottom: 24px;
            border-bottom: 1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
        }

        .sus-total-cost-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: ${isDarkTheme ? '#94a3b8' : '#64748b'};
            margin-bottom: 4px;
        }

        .sus-total-cost-value {
            font-size: 32px;
            font-weight: 800;
            line-height: 1;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .sus-trend {
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .trend-good { color: #22c55e; }
        .trend-bad { color: #ef4444; }

        .sus-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            flex: 1;
        }

        .sus-metric-item {
            padding: 12px;
            border-radius: 10px;
            background: ${isDarkTheme ? 'rgba(255,255,255,0.03)' : '#f8fafc'};
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .sus-metric-header {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 600;
            color: ${isDarkTheme ? '#cbd5e1' : '#475569'};
        }

        .sus-metric-value {
            font-size: 18px;
            font-weight: 700;
            color: ${isDarkTheme ? '#f1f5f9' : '#0f172a'};
        }

        .sus-metric-sub {
            font-size: 11px;
            color: ${isDarkTheme ? '#94a3b8' : '#64748b'};
        }

        .co2-impact {
            margin-top: 16px;
            padding: 12px;
            border-radius: 8px;
            background: ${isDarkTheme ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb'};
            color: ${isDarkTheme ? '#fbbf24' : '#b45309'};
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .sus-optimizations {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
        }

        .sus-opt-title {
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            color: ${isDarkTheme ? '#f1f5f9' : '#1e293b'};
        }

        .sus-opt-list {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .sus-opt-list li {
            font-size: 12px;
            color: ${isDarkTheme ? '#cbd5e1' : '#475569'};
            display: flex;
            align-items: flex-start;
            gap: 8px;
            line-height: 1.4;
        }

        .sus-opt-list li i {
            color: #10b981;
            margin-top: 3px;
            flex-shrink: 0;
        }

        .sus-opt-list li b {
            color: ${isDarkTheme ? '#10b981' : '#059669'};
        }

      `}</style>

            <div className="sus-card">
                <div className="sus-header">
                    <div className="sus-title-group">
                        <div className="sus-title">
                            <i className="fa-solid fa-leaf" style={{ color: '#22c55e' }} />
                            Sustainability
                        </div>
                        <div className="sus-subtitle">Real-time Efficiency</div>
                    </div>
                    <div className="sus-score-badge">
                        <i className="fa-solid fa-seedling" />
                        {score}/100
                    </div>
                </div>

                <div className="sus-main-metric">
                    <div className="sus-total-cost-label">Total Cycle Cost</div>
                    <div className="sus-total-cost-value">{formatCurrency(costs.total)}</div>
                    <div className={`sus-trend ${costTrend <= 0 ? 'trend-good' : 'trend-bad'}`}>
                        <i className={`fa-solid fa-arrow-${costTrend <= 0 ? 'down' : 'up'}`} />
                        {Math.abs(costTrend).toFixed(1)}% vs avg
                    </div>
                </div>

                <div className="sus-grid">
                    {/* Water */}
                    <div className="sus-metric-item">
                        <div className="sus-metric-header">
                            <i className="fa-solid fa-droplet" style={{ color: '#3b82f6' }} />
                            Water
                        </div>
                        <div className="sus-metric-value">
                            {cumulativeUsage.waterLiters.toFixed(0)} <span style={{ fontSize: '12px' }}>L</span>
                        </div>
                        <div className="sus-metric-sub">
                            {formatCurrency(costs.water)}
                        </div>
                    </div>

                    {/* Energy */}
                    <div className="sus-metric-item">
                        <div className="sus-metric-header">
                            <i className="fa-solid fa-bolt" style={{ color: '#f59e0b' }} />
                            Energy
                        </div>
                        <div className="sus-metric-value">
                            {cumulativeUsage.energyKwh.toFixed(1)} <span style={{ fontSize: '12px' }}>kWh</span>
                        </div>
                        <div className="sus-metric-sub">
                            {formatCurrency(costs.energy)}
                        </div>
                    </div>

                    {/* Chemical */}
                    <div className="sus-metric-item">
                        <div className="sus-metric-header">
                            <i className="fa-solid fa-flask" style={{ color: '#ec4899' }} />
                            Chem
                        </div>
                        <div className="sus-metric-value">
                            {cumulativeUsage.chemicalLiters.toFixed(1)} <span style={{ fontSize: '12px' }}>L</span>
                        </div>
                        <div className="sus-metric-sub">
                            {formatCurrency(costs.chemical)}
                        </div>
                    </div>
                </div>

                <div className="co2-impact">
                    <i className="fa-solid fa-cloud" />
                    <span>Est. Carbon Footprint: <b>{co2.toFixed(2)} kg CO₂</b></span>
                </div>

                <div className="sus-optimizations">
                    <div className="sus-opt-title">
                        <i className="fa-solid fa-lightbulb" style={{ color: '#f59e0b' }} />
                        Optimization Opportunities
                    </div>
                    <ul className="sus-opt-list">
                        <li>
                            <i className="fa-solid fa-satellite-dish" style={{ color: 'var(--text-secondary)' }} />
                            Awaiting sufficient cycle data to generate optimizations.
                        </li>
                    </ul>
                </div>
            </div>
        </>
    );
};


export default SustainabilityCard;
