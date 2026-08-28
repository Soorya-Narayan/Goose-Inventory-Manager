import React from 'react';
import styles from './ChemicalSensorCard.module.css';

const ChemicalSensorCard = ({ data }) => {
    if (!data) {
        return (
            <div className={styles.sensorCard}>
                <div className={styles.header}>
                    <h3><i className="fa-solid fa-flask"></i> Chemical Soft Sensor</h3>
                </div>
                <div className={styles.liquidContainer} style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8' }}>Waiting for flow...</span>
                </div>
            </div>
        );
    }

    const { chemical_type, concentration, unit, status, target_range, alert } = data;

    // Determine height for liquid animation (Max 100%)
    // Assume max supported concentration is 4.0% for visualization scaling
    const maxScale = 4.0;
    const fillHeight = Math.min((concentration / maxScale) * 100, 100);

    // Status Icon
    const getStatusIcon = (statusStr) => {
        if (statusStr === 'Optimal') return 'fa-solid fa-circle-check';
        if (statusStr === 'Neutral') return 'fa-solid fa-water';
        return 'fa-solid fa-triangle-exclamation';
    };

    return (
        <div className={styles.sensorCard}>
            <div className={styles.header}>
                <h3><i className="fa-solid fa-flask"></i> Chemical Concentration</h3>
                <span className={styles.badge} data-status={status.toLowerCase().replace(' ', '-')}>
                    <i className={getStatusIcon(status)}></i> {status}
                </span>
            </div>

            <div className={styles.liquidContainer}>
                {/* Animated Liquid Background */}
                <div
                    className={styles.liquid}
                    style={{ height: `${Math.max(fillHeight, 10)}%` }} // Min 10% for visibility
                    data-chem={chemical_type}
                ></div>

                {/* Value Display */}
                <div className={styles.valueOverlay}>
                    <div className={styles.paramValue}>
                        <span className={styles.percentage}>{concentration}</span>
                        <span className={styles.unit}>{unit}</span>
                    </div>
                    <span className={styles.chemType}>{chemical_type}</span>
                </div>
            </div>

            <div className={styles.footer}>
                <div className={styles.statItem}>
                    <span>Target Range</span>
                    <span className={styles.statVal}>{target_range}%</span>
                </div>
                <div className={styles.statItem}>
                    <span>Conductivity</span>
                    <span className={styles.statVal}>{data.raw_conductivity?.toFixed(1) || '-'} mS/cm</span>
                </div>

                {/* Show Alert if present */}
                {alert && (
                    <div className={styles.statItem} style={{ color: '#ef4444', fontWeight: 'bold' }}>
                        <span>Alert</span>
                        <span>{alert}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChemicalSensorCard;
