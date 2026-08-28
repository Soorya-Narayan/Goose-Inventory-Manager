// src/components/CipQualityCard.jsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { assessCycleQuality } from '../utils/cipScoring';
import { getGoldenProfile } from '../data/goldenCipProfiles';

const CipQualityCard = () => {
    const { isDarkTheme, circuit } = useAppContext();
    const [qualityData, setQualityData] = useState(null);

    useEffect(() => {
        // Simulate fetching current cycle data and comparing to golden
        const goldenProfile = getGoldenProfile(`C${circuit}`);

        // Mock current cycle data (in real app, this would come from API)
        const mockCurrentCycle = {
            cycleId: 'CIP-86753',
            duration: 88,
            tempSupply: [24, 80, 81, 42, 67, 69, 38, 23],
            flowRate: [0, 148, 152, 151, 149, 150, 151, 0],
            pressure: [0, 2.4, 2.6, 2.5, 2.5, 2.6, 2.4, 0],
            conductivity: [0.6, 44, 46, 0.7, 17, 19, 0.6, 0.5],
            concentration: [0, 2.4, 2.6, 0, 1.7, 1.9, 0, 0]
        };

        const assessment = assessCycleQuality(mockCurrentCycle, goldenProfile);
        setQualityData(assessment);
    }, [circuit]);

    if (!qualityData) return null;

    const { overallScore, status, parameterScores, timeDev } = qualityData;

    // Helper to get parameter display info
    const getParamInfo = (key) => {
        const configs = {
            temperature: { label: 'Temperature', icon: 'fa-temperature-high', unit: '%' },
            flow: { label: 'Flow Rate', icon: 'fa-droplet', unit: '%' },
            time: { label: 'Time Deviation', icon: 'fa-clock', unit: '' },
            concentration: { label: 'Chem. Stability', icon: 'fa-flask', unit: '%' }
        };
        return configs[key] || { label: key, icon: 'fa-circle', unit: '%' };
    };

    return (
        <>
            <style>{`
        .quality-card {
          position: relative;
          border-radius: 16px;
          border: 1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
          background: ${isDarkTheme
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)'
                };
          backdrop-filter: blur(10px);
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .quality-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .quality-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .quality-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: ${isDarkTheme ? '#f1f5f9' : '#1e293b'};
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 700;
          background: ${status.bgColor};
          color: ${status.color};
          border: 1px solid ${status.color};
          animation: badgePulse 2s ease-in-out infinite;
        }

        @keyframes badgePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .quality-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 32px;
        }

        .circular-progress {
          position: relative;
          width: 180px;
          height: 180px;
          margin-bottom: 16px;
        }

        .progress-ring {
          transform: rotate(-90deg);
        }

        .progress-ring-bg {
          fill: none;
          stroke: ${isDarkTheme ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)'};
          stroke-width: 12;
        }

        .progress-ring-fill {
          fill: none;
          stroke: ${status.color};
          stroke-width: 12;
          stroke-linecap: round;
          stroke-dasharray: ${2 * Math.PI * 70};
          stroke-dashoffset: ${2 * Math.PI * 70 * (1 - overallScore / 100)};
          transition: stroke-dashoffset 1.5s ease-in-out;
          filter: drop-shadow(0 0 8px ${status.color}40);
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .progress-score {
          font-size: 48px;
          font-weight: 800;
          color: ${status.color};
          line-height: 1;
          margin-bottom: 4px;
        }

        .progress-label {
          font-size: 14px;
          color: ${isDarkTheme ? '#94a3b8' : '#64748b'};
          font-weight: 500;
        }

        .quality-subtitle {
          font-size: 13px;
          color: ${isDarkTheme ? '#94a3b8' : '#64748b'};
          text-align: center;
        }

        .param-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .param-card {
          position: relative;
          padding: 14px;
          border-radius: 12px;
          background: ${isDarkTheme ? 'rgba(51, 65, 85, 0.4)' : 'rgba(241, 245, 249, 0.6)'};
          border: 1px solid ${isDarkTheme ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)'};
          transition: all 0.2s ease;
        }

        .param-card:hover {
          transform: translateY(-2px);
          border-color: ${status.color}60;
          background: ${isDarkTheme ? 'rgba(51, 65, 85, 0.6)' : 'rgba(241, 245, 249, 0.8)'};
        }

        .param-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .param-icon {
          font-size: 14px;
          color: ${isDarkTheme ? '#94a3b8' : '#64748b'};
        }

        .param-label {
          font-size: 12px;
          color: ${isDarkTheme ? '#94a3b8' : '#64748b'};
          font-weight: 500;
        }

        .param-value {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .param-score {
          font-size: 24px;
          font-weight: 700;
          color: ${isDarkTheme ? '#f1f5f9' : '#1e293b'};
        }

        .param-status {
          font-size: 16px;
        }

        .quality-footer {
          padding-top: 16px;
          border-top: 1px solid ${isDarkTheme ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)'};
          font-size: 12px;
          color: ${isDarkTheme ? '#94a3b8' : '#64748b'};
          text-align: center;
        }
      `}</style>

            <div className="quality-card">
                <div className="quality-header">
                    <h3>CIP Quality Score</h3>
                    <div className="status-badge">
                        <span>{status.icon}</span>
                        <span>{status.label}</span>
                    </div>
                </div>

                <div className="quality-center">
                    <div className="circular-progress">
                        <svg className="progress-ring" width="180" height="180">
                            <circle className="progress-ring-bg" cx="90" cy="90" r="70" />
                            <circle className="progress-ring-fill" cx="90" cy="90" r="70" />
                        </svg>
                        <div className="progress-text">
                            <div className="progress-score">{overallScore}%</div>
                            <div className="progress-label">Quality</div>
                        </div>
                    </div>
                    <div className="quality-subtitle">vs Golden CIP Reference</div>
                </div>

                <div className="param-grid">
                    {Object.entries(parameterScores).slice(0, 4).map(([key, score]) => {
                        const info = getParamInfo(key);
                        const paramStatus = score >= 90 ? '✓' : score >= 70 ? '⚠' : '✗';
                        const paramColor = score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';

                        return (
                            <div key={key} className="param-card">
                                <div className="param-header">
                                    <i className={`fa-solid ${info.icon} param-icon`} />
                                    <span className="param-label">{info.label}</span>
                                </div>
                                <div className="param-value">
                                    <span className="param-score">
                                        {key === 'time' ? `${timeDev > 0 ? '+' : ''}${timeDev}%` : `${score}${info.unit}`}
                                    </span>
                                    <span className="param-status" style={{ color: paramColor }}>
                                        {paramStatus}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="quality-footer">
                    Last Cycle: CIP-86753 | Circuit {circuit}
                </div>
            </div>
        </>
    );
};

export default CipQualityCard;
