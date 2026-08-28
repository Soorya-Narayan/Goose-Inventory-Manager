// src/components/AI/HardwareHealthCard.jsx
import React from 'react';
import styles from './HardwareHealthCard.module.css';

const HardwareHealthCard = ({ data }) => {
    if (!data) {
        return (
            <div className={styles.card}>
                <h3><i className="fa-solid fa-wrench"></i> Hardware Prognostics</h3>
                <p className={styles.noData}>Analyzing hardware stress...</p>
            </div>
        );
    }

    const { components, system_status, rul_days, recommendation } = data;
    const { pump, valves } = components;

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'good': return '#10b981';
            case 'warning': return '#f59e0b';
            case 'critical': return '#ef4444';
            default: return '#64748b';
        }
    };

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3><i className="fa-solid fa-wrench"></i> Hardware Prognostics</h3>
                <div className={styles.statusBadge} style={{ backgroundColor: `${getStatusColor(system_status)}20`, color: getStatusColor(system_status) }}>
                    {system_status}
                </div>
            </div>

            <div className={styles.content}>
                {/* RUL Prediction */}
                <div className={styles.rulSection}>
                    <div className={styles.rulValue}>
                        <span className={styles.days}>{rul_days}</span>
                        <span className={styles.label}>Days RUL</span>
                    </div>
                    <div className={styles.rulText}>
                        Estimated Remaining Useful Life based on current stress
                    </div>
                </div>

                {/* Component Health Bars */}
                <div className={styles.componentsGrid}>
                    {/* Pump */}
                    <div className={styles.componentRow}>
                        <div className={styles.compHeader}>
                            <span><i className="fa-solid fa-fan"></i> Pump A</span>
                            <span style={{ color: getStatusColor(pump.status) }}>{pump.health}%</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{
                                    width: `${pump.health}%`,
                                    backgroundColor: getStatusColor(pump.status)
                                }}
                            ></div>
                        </div>
                        <div className={styles.compMeta}>
                            {pump.cycles_since_maint} cycles since service
                        </div>
                    </div>

                    {/* Valves */}
                    <div className={styles.componentRow}>
                        <div className={styles.compHeader}>
                            <span><i className="fa-solid fa-faucet"></i> Valve Block</span>
                            <span style={{ color: getStatusColor(valves.status) }}>{valves.health}%</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{
                                    width: `${valves.health}%`,
                                    backgroundColor: getStatusColor(valves.status)
                                }}
                            ></div>
                        </div>
                        <div className={styles.compMeta}>
                            {valves.actuations} actuations
                        </div>
                    </div>
                </div>

                {/* Action Item */}
                <div className={styles.recommendation}>
                    <i className="fa-solid fa-clipboard-check"></i>
                    <span>{recommendation}</span>
                </div>
            </div>
        </div>
    );
};

export default HardwareHealthCard;
