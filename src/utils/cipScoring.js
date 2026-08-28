// src/utils/cipScoring.js

/**
 * Calculate compliance score for a single parameter
 * @param {number[]} actualValues - Actual parameter values over time
 * @param {number[]} goldenValues - Golden reference values
 * @param {number} tolerance - Acceptable deviation
 * @returns {number} Compliance score (0-100)
 */
export const calculateParameterScore = (actualValues, goldenValues, tolerance) => {
    if (!actualValues || !goldenValues || actualValues.length === 0) return 0;

    let totalDeviation = 0;
    const count = Math.min(actualValues.length, goldenValues.length);

    for (let i = 0; i < count; i++) {
        const deviation = Math.abs(actualValues[i] - goldenValues[i]);
        const normalizedDev = Math.min(deviation / tolerance, 1); // Cap at 1
        totalDeviation += normalizedDev;
    }

    const avgDeviation = totalDeviation / count;
    const score = Math.max(0, (1 - avgDeviation) * 100);

    return Math.round(score);
};

/**
 * Calculate overall quality score from individual parameter scores
 * @param {Object} parameterScores - Object with scores for each parameter
 * @returns {number} Overall quality score (0-100)
 */
export const calculateOverallScore = (parameterScores) => {
    const weights = {
        temperature: 0.25,
        flow: 0.20,
        time: 0.15,
        conductivity: 0.20,
        pressure: 0.10,
        concentration: 0.10
    };

    let weightedSum = 0;
    let totalWeight = 0;

    Object.entries(parameterScores).forEach(([param, score]) => {
        const weight = weights[param] || 0.1;
        weightedSum += score * weight;
        totalWeight += weight;
    });

    return Math.round(weightedSum / totalWeight);
};

/**
 * Determine status based on overall score
 * @param {number} score - Overall quality score
 * @returns {Object} Status object with label, color, and icon
 */
export const getQualityStatus = (score) => {
    if (score >= 90) {
        return {
            label: 'PASS',
            color: '#22c55e',
            bgColor: 'rgba(34, 197, 94, 0.1)',
            icon: '✓'
        };
    } else if (score >= 70) {
        return {
            label: 'WARNING',
            color: '#f59e0b',
            bgColor: 'rgba(245, 158, 11, 0.1)',
            icon: '⚠'
        };
    } else {
        return {
            label: 'FAIL',
            color: '#ef4444',
            bgColor: 'rgba(239, 68, 68, 0.1)',
            icon: '✗'
        };
    }
};

/**
 * Calculate time deviation percentage
 * @param {number} actualDuration - Actual cycle duration (minutes)
 * @param {number} goldenDuration - Golden cycle duration (minutes)
 * @returns {number} Time deviation percentage
 */
export const calculateTimeDev = (actualDuration, goldenDuration) => {
    if (!goldenDuration) return 0;
    const deviation = ((actualDuration - goldenDuration) / goldenDuration) * 100;
    return Math.round(deviation);
};

/**
 * Calculate all quality metrics for a cycle
 * @param {Object} actualCycle - Actual cycle data
 * @param {Object} goldenProfile - Golden CIP profile
 * @returns {Object} Complete quality assessment
 */
export const assessCycleQuality = (actualCycle, goldenProfile) => {
    // Calculate individual parameter scores
    const paramScores = {
        temperature: calculateParameterScore(
            actualCycle.tempSupply || [],
            goldenProfile.parameters.tempSupply,
            goldenProfile.tolerances.tempSupply
        ),
        flow: calculateParameterScore(
            actualCycle.flowRate || [],
            goldenProfile.parameters.flowRate,
            goldenProfile.tolerances.flowRate
        ),
        conductivity: calculateParameterScore(
            actualCycle.conductivity || [],
            goldenProfile.parameters.conductivity,
            goldenProfile.tolerances.conductivity
        ),
        pressure: calculateParameterScore(
            actualCycle.pressure || [],
            goldenProfile.parameters.pressure,
            goldenProfile.tolerances.pressure
        ),
        concentration: calculateParameterScore(
            actualCycle.concentration || [],
            goldenProfile.parameters.concentration,
            goldenProfile.tolerances.concentration
        )
    };

    // Calculate time deviation
    const totalGoldenDuration = goldenProfile.phaseDurations.reduce((a, b) => a + b, 0);
    const timeDev = calculateTimeDev(actualCycle.duration || 0, totalGoldenDuration);
    const timeScore = Math.max(0, 100 - Math.abs(timeDev) * 2); // 2% penalty per 1% deviation

    paramScores.time = timeScore;

    // Calculate overall score
    const overallScore = calculateOverallScore(paramScores);
    const status = getQualityStatus(overallScore);

    return {
        overallScore,
        status,
        parameterScores: paramScores,
        timeDev
    };
};
