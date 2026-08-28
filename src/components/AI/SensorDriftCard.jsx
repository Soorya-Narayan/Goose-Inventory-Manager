import React from 'react';
import styles from './SensorDriftCard.module.css';

const SensorDriftCard = ({ data }) => {
    if (!data || !data.sensors) {
        return (
            <div className={styles.driftCard}>
                <div className={styles.header}>
                    <h3><i className="fa-solid fa-wave-square"></i> Sensor Drift</h3>
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8' }}>
                    <span>Analyzing history...</span>
                </div>
            </div>
        );
    }

    const { sensors, overall_system_status } = data;

    const renderSparkline = (trend, isDrifting) => {
        if (!trend || trend.length === 0) return null;

        // Normalize to 0-100 for height
        const min = Math.min(...trend);
        const max = Math.max(...trend);
        const range = max - min || 1;

        return (
            <div className={styles.sparkline}>
                {trend.map((val, idx) => {
                    const height = ((val - min) / range) * 80 + 10; // 10% to 90% height
                    return (
                        <div
                            key={idx}
                            className={`${styles.bar} ${isDrifting ? styles.drift : ''}`}
                            style={{ height: `${height}%` }}
                            title={`Val: ${val}`}
                        ></div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={styles.driftCard}>
            <div className={styles.header}>
                <h3><i className="fa-solid fa-wave-square"></i> Sensor Health</h3>
                <span className={styles.statusBadge} data-status={overall_system_status.split(' ')[0]}>
                    {overall_system_status}
                </span>
            </div>

            <div className={styles.sensorList}>
                {Object.entries(sensors).map(([name, info]) => (
                    <div key={name} className={styles.sensorItem}>
                        <div className={styles.sensorHeader}>
                            <span>{name}</span>
                            <span className={info.status === 'Good' ? '' : styles.calibInfo.urgent}>
                                {info.status}
                            </span>
                        </div>

                        <div className={styles.trendContainer}>
                            <span className={styles.trendLabel}>Trend</span>
                            {renderSparkline(info.trend, info.is_drifting)}
                        </div>

                        <div className={`${styles.calibInfo} ${info.calibration_due_days < 7 ? styles.urgent : ''}`}>
                            <i className="fa-regular fa-calendar"></i> Calibrate in: {info.calibration_due_days} days
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.systemStatus}>
                <div className={`${styles.statusDot} ${overall_system_status === 'Good' ? '' :
                        overall_system_status === 'Warning' ? styles.warning : styles.critical
                    }`}></div>
                <span>System Monitoring Active (30-Day Window)</span>
            </div>
        </div>
    );
};

export default SensorDriftCard;
