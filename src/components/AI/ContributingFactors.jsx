// src/components/AI/ContributingFactors.jsx
import React from 'react';
import styles from './ContributingFactors.module.css';

const ContributingFactors = ({ factors = [] }) => {
    if (!factors || factors.length === 0) {
        return (
            <div className={styles.contributingFactors}>
                <h3><i className="fa-solid fa-ranking-star"></i> Contributing Factors</h3>
                <p className={styles.noData}>Loading sensor analysis...</p>
            </div>
        );
    }

    // Get top 5 factors
    const topFactors = factors.slice(0, 5);
    const maxImportance = Math.max(...topFactors.map(f => f.importance));

    const formatFeatureName = (name) => {
        if (!name) return 'Unknown';
        return name
            .replace('(°C)', '')
            .replace('(Liter/Hr)', '')
            .replace('(mS/m)', '')
            .replace('(sec)', '')
            .trim();
    };

    const formatValue = (feature, value) => {
        if (!feature || value === undefined || value === null) return 'N/A';
        if (feature.includes('Temp')) return `${value.toFixed(1)}°C`;
        if (feature.includes('Flow')) return `${value.toFixed(0)} L/hr`;
        if (feature.includes('Conduct')) return `${value.toFixed(2)} mS/m`;
        if (feature.includes('Time')) return `${value.toFixed(0)}s`;
        if (feature.includes('Hour')) return `${value.toFixed(0)}:00`;
        if (feature.includes('DayOfWeek')) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return days[Math.floor(value) % 7];
        }
        return value.toFixed(2);
    };

    return (
        <div className={styles.contributingFactors}>
            <h3><i className="fa-solid fa-ranking-star"></i> Contributing Factors</h3>
            <p className={styles.subtitle}>Top sensors influencing failure prediction</p>

            <div className={styles.factorsList}>
                {topFactors.map((factor, index) => {
                    const barWidth = (factor.importance / maxImportance) * 100;

                    return (
                        <div key={index} className={styles.factorItem}>
                            <div className={styles.factorHeader}>
                                <span className={styles.factorRank}>#{index + 1}</span>
                                <span className={styles.factorName}>{formatFeatureName(factor.feature)}</span>
                                <span className={styles.factorValue}>{formatValue(factor.feature, factor.value)}</span>
                            </div>

                            <div className={styles.factorBar}>
                                <div
                                    className={styles.factorBarFill}
                                    style={{ width: `${barWidth}%` }}
                                    data-rank={index < 3 ? 'top' : 'normal'}
                                >
                                    <span className={styles.importance}>{(factor.importance * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ContributingFactors;
