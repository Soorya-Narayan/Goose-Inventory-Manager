// src/components/AI/SustainabilityCard.jsx
import React from 'react';
import styles from './SustainabilityCard.module.css';

const SustainabilityCard = ({ data }) => {
    if (!data) {
        return (
            <div className={styles.card}>
                <h3><i className="fa-solid fa-leaf"></i> Sustainability Metrics</h3>
                <p className={styles.noData}>Getting sustainability data...</p>
            </div>
        );
    }

    const { efficiency_score, savings_potential, usage, recommendations } = data;

    // Visualizing water waste
    const waterSaved = usage.water_waste === 0;
    const energySaved = usage.energy_waste === 0;

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3><i className="fa-solid fa-leaf"></i> Sustainability Impact</h3>
                <div className={styles.badge} data-efficient={efficiency_score >= 90}>
                    {efficiency_score}% Efficient
                </div>
            </div>

            <div className={styles.metricsGrid}>
                {/* Savings Potential */}
                <div className={styles.mainMetric}>
                    <span className={styles.label}>Potential Savings</span>
                    <div className={styles.value}>${savings_potential.toFixed(2)}</div>
                    <span className={styles.subtext}>per cycle</span>
                </div>

                {/* Water Usage */}
                <div className={styles.metricItem} data-type="water">
                    <div className={styles.iconBox}>
                        <i className="fa-solid fa-droplet"></i>
                    </div>
                    <div className={styles.metricInfo}>
                        <span className={styles.metricLabel}>Water Excess</span>
                        <span className={styles.metricValue}>
                            {waterSaved ? 'None' : `+${usage.water_waste} L`}
                        </span>
                    </div>
                </div>

                {/* Energy Usage */}
                <div className={styles.metricItem} data-type="energy">
                    <div className={styles.iconBox}>
                        <i className="fa-solid fa-bolt"></i>
                    </div>
                    <div className={styles.metricInfo}>
                        <span className={styles.metricLabel}>Energy Excess</span>
                        <span className={styles.metricValue}>
                            {energySaved ? 'None' : `+${usage.energy_waste} kWh`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
                <div className={styles.optimizations}>
                    <h4><i className="fa-solid fa-wand-magic-sparkles"></i> Optimization Opportunities</h4>
                    <ul>
                        {recommendations.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SustainabilityCard;
