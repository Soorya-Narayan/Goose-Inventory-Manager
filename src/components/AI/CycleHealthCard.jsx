// src/components/AI/CycleHealthCard.jsx
import React from 'react';
import styles from './CycleHealthCard.module.css';

const CycleHealthCard = ({ healthData }) => {
    if (!healthData) {
        return (
            <div className={styles.card}>
                <h3><i className="fa-solid fa-heartbeat"></i> Cycle Health Score</h3>
                <p className={styles.noData}>No health data available</p>
            </div>
        );
    }

    const { health_score, grade, status, deviations, recommendations } = healthData;

    // Null safety
    const scoreValue = health_score || 0;

    // Determine color based on score
    const getScoreColor = (score) => {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 60) return 'fair';
        return 'poor';
    };

    const scoreColor = getScoreColor(scoreValue);

    return (
        <div className={`${styles.card} ${styles[scoreColor]}`}>
            <h3>
                <i className="fa-solid fa-heartbeat"></i> Cycle Health Score
            </h3>

            {/* Grade Badge */}
            <div className={styles.gradeSection}>
                <div className={`${styles.gradeBadge} ${styles[scoreColor]}`}>
                    {grade || 'N/A'}
                </div>
                <div className={styles.scoreInfo}>
                    <div className={styles.scoreValue}>{scoreValue.toFixed(1)}%</div>
                    <div className={styles.statusLabel}>{status || 'Unknown'}</div>
                </div>
            </div>

            {/* Circular Progress */}
            <div className={styles.progressCircle}>
                <svg viewBox="0 0 100 100" className={styles.progressSvg}>
                    <circle
                        className={styles.progressBackground}
                        cx="50"
                        cy="50"
                        r="45"
                    />
                    <circle
                        className={`${styles.progressForeground} ${styles[scoreColor]}`}
                        cx="50"
                        cy="50"
                        r="45"
                        style={{
                            strokeDasharray: `${scoreValue * 2.827} 282.7`,
                        }}
                    />
                </svg>
            </div>

            {/* Parameter Deviations */}
            {deviations && Object.keys(deviations).length > 0 && (
                <div className={styles.deviationsSection}>
                    <h4>Parameter Health</h4>
                    <div className={styles.deviationsList}>
                        {Object.entries(deviations).map(([param, data]) => (
                            <div key={param} className={styles.deviationItem}>
                                <div className={styles.paramHeader}>
                                    <span className={styles.paramName}>
                                        {param.replace(/_/g, ' ')}
                                    </span>
                                    <span
                                        className={`${styles.statusBadge} ${styles[data.status]}`}
                                    >
                                        {data.status}
                                    </span>
                                </div>
                                <div className={styles.paramValues}>
                                    <span className={styles.currentValue}>
                                        Current: {data.current_value}
                                    </span>
                                    <span className={styles.goldenValue}>
                                        Golden: {data.golden_mean.toFixed(2)}
                                    </span>
                                </div>
                                <div className={styles.deviationBar}>
                                    <div
                                        className={`${styles.deviationFill} ${styles[data.status]}`}
                                        style={{ width: `${Math.min(data.deviation_pct, 100)}%` }}
                                    >
                                        <span className={styles.deviationPct}>
                                            {data.deviation_pct.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
                <div className={styles.recommendations}>
                    <h4>Recommendations</h4>
                    <ul>
                        {recommendations.slice(0, 3).map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default CycleHealthCard;
