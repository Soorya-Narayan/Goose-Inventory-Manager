
import React, { useState } from 'react';
import styles from './RecipeOptimizerCard.module.css';

const RecipeOptimizerCard = ({ data }) => {
    const [applied, setApplied] = useState(false);

    // Default / Loading State
    if (!data) return (
        <div className={styles.loading}>
            <i className="fa-solid fa-wand-magic-sparkles fa-spin"></i> Analyzing Recipe...
        </div>
    );

    const { recommendations, total_annual_savings_potential, current_efficiency_score, potential_efficiency_score, confidence_score } = data;

    const handleApply = () => {
        setApplied(true);
        // In a real app, this would send a PATCH request to the PLC/Recipe Manager
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3><i className="fa-solid fa-wand-magic-sparkles"></i> AI Recipe Optimizer</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span className={styles.badgePrescriptive}>Prescriptive Check</span>
                    {confidence_score && (
                        <span className={styles.badgePrescriptive} style={{ borderColor: '#10b981', color: '#10b981' }}>
                            <i className="fa-solid fa-shield-halved"></i> {confidence_score} Conf.
                        </span>
                    )}
                </div>
            </div>

            <div className={styles.scoreComparison}>
                <div className={styles.scoreBox}>
                    <span className={styles.label}>Current Efficiency</span>
                    <span className={styles.value}>{current_efficiency_score}%</span>
                </div>
                <div className={styles.arrow}><i className="fa-solid fa-arrow-right"></i></div>
                <div className={styles.scoreBox} data-type="optimized">
                    <span className={styles.label}>Potential</span>
                    <span className={styles.value}>{potential_efficiency_score}%</span>
                </div>
            </div>

            <div className={styles.recommendationsList}>
                {recommendations && recommendations.map((rec, index) => (
                    <div key={index} className={styles.recItem}>
                        <div className={styles.recIcon}>
                            <i className="fa-solid fa-sliders"></i>
                        </div>
                        <div className={styles.recDetails}>
                            <span className={styles.recTarget}>{rec.area}</span>
                            <span className={styles.recAction}>{rec.suggestion}</span>
                            <span className={styles.recImpact}>{rec.impact}</span>
                        </div>
                        <div className={styles.recRisk} data-level={rec.risk?.toLowerCase()}>
                            {rec.risk} Risk
                        </div>
                    </div>
                ))}
                {(!recommendations || recommendations.length === 0) && (
                    <div className={styles.noRecs}>
                        <i className="fa-solid fa-check-circle"></i> Recipe is fully optimized!
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                <div className={styles.savings}>
                    <span className={styles.savingsLabel}>Annual Opportunity</span>
                    <span className={styles.savingsValue}>{total_annual_savings_potential}</span>
                </div>
                <button
                    className={`${styles.applyBtn} ${applied ? styles.applied : ''}`}
                    onClick={handleApply}
                    disabled={applied || !recommendations?.length}
                >
                    {applied ? <><i className="fa-solid fa-check"></i> Applied</> : 'Apply Optimization'}
                </button>
            </div>
        </div>
    );
};

export default RecipeOptimizerCard;
