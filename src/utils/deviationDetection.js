// src/utils/deviationDetection.js

/**
 * Deviation type definitions with context
 */
export const DEVIATION_TYPES = {
    LOW_FLOW_CAUSTIC: {
        type: 'low_flow_caustic',
        title: 'Low Flow During Caustic',
        severity: 'warning',
        cause: 'Pump degradation or valve partially closed',
        action: 'Check pump performance curve and verify all valve positions are fully open',
        impact: 'Reduced cleaning effectiveness - may require extended cycle time',
        icon: 'fa-droplet'
    },
    SLOW_TEMP_RAMP: {
        type: 'slow_temp_ramp',
        title: 'Slow Temperature Ramp',
        severity: 'warning',
        cause: 'Heat exchanger fouling or insufficient steam supply',
        action: 'Inspect heat exchanger for fouling, verify steam supply pressure',
        impact: 'Extended heating time increases cycle duration',
        icon: 'fa-temperature-high'
    },
    CONDUCTIVITY_INSTABILITY: {
        type: 'conductivity_instability',
        title: 'Conductivity Instability',
        severity: 'critical',
        cause: 'Chemical mixing issue or dosing pump fault',
        action: 'Verify chemical tank levels and dosing pump operation',
        impact: 'Inconsistent chemical concentration may compromise cleaning',
        icon: 'fa-wave-square'
    },
    OVER_DOSING: {
        type: 'over_dosing',
        title: 'Chemical Over-Dosing',
        severity: 'warning',
        cause: 'Dosing pump calibration drift or flow meter error',
        action: 'Recalibrate dosing pumps and verify flow meter accuracy',
        impact: 'Wasted chemicals and potential equipment damage',
        icon: 'fa-flask'
    },
    UNDER_DOSING: {
        type: 'under_dosing',
        title: 'Chemical Under-Dosing',
        severity: 'critical',
        cause: 'Dosing pump failure or chemical tank empty',
        action: 'Check chemical tank levels and dosing pump operation',
        impact: 'Insufficient cleaning - cycle may fail quality check',
        icon: 'fa-flask'
    },
    HIGH_PRESSURE: {
        type: 'high_pressure',
        title: 'Abnormal Pressure Spike',
        severity: 'critical',
        cause: 'Line blockage or valve malfunction',
        action: 'Inspect for blockages and check valve operation immediately',
        impact: 'System safety risk - may trigger emergency shutdown',
        icon: 'fa-gauge-high'
    }
};

/**
 * Detect deviations from current cycle parameters
 * @param {Object} currentParams - Current cycle parameters
 * @param {Object} goldenProfile - Golden CIP reference
 * @param {string} currentPhase - Current phase name
 * @returns {Array} Array of detected deviations
 */
export const detectDeviations = (currentParams, goldenProfile, currentPhase) => {
    const deviations = [];
    const now = new Date().toISOString();

    // 1. LOW FLOW DURING CAUSTIC
    if (currentPhase === 'Caustic' && currentParams.flowRate) {
        const expectedFlow = 150; // From golden profile
        const actualFlow = currentParams.flowRate;
        const deviation = ((actualFlow - expectedFlow) / expectedFlow) * 100;

        if (deviation < -5) { // 5% below expected
            deviations.push(createDeviation(
                DEVIATION_TYPES.LOW_FLOW_CAUSTIC,
                currentPhase,
                'Flow Rate',
                actualFlow,
                expectedFlow,
                deviation,
                now
            ));
        }
    }

    // 2. SLOW TEMPERATURE RAMP
    if (currentParams.tempRampRate) {
        const expectedRate = 2.0; // °C per minute
        const actualRate = currentParams.tempRampRate;

        if (actualRate < 1.0) {
            const deviation = ((actualRate - expectedRate) / expectedRate) * 100;
            deviations.push(createDeviation(
                DEVIATION_TYPES.SLOW_TEMP_RAMP,
                currentPhase,
                'Temperature Ramp Rate',
                actualRate,
                expectedRate,
                deviation,
                now
            ));
        }
    }

    // 3. CONDUCTIVITY INSTABILITY
    if (currentParams.conductivityStdDev && currentPhase === 'Caustic') {
        const threshold = 3.0; // mS/cm standard deviation
        if (currentParams.conductivityStdDev > threshold) {
            deviations.push(createDeviation(
                DEVIATION_TYPES.CONDUCTIVITY_INSTABILITY,
                currentPhase,
                'Conductivity Std Dev',
                currentParams.conductivityStdDev,
                threshold,
                ((currentParams.conductivityStdDev - threshold) / threshold) * 100,
                now
            ));
        }
    }

    // 4. OVER/UNDER DOSING
    if (currentParams.concentration) {
        const expectedConc = 2.5; // %
        const actualConc = currentParams.concentration;
        const deviation = ((actualConc - expectedConc) / expectedConc) * 100;

        if (deviation > 15) {
            deviations.push(createDeviation(
                DEVIATION_TYPES.OVER_DOSING,
                currentPhase,
                'Chemical Concentration',
                actualConc,
                expectedConc,
                deviation,
                now
            ));
        } else if (deviation < -15) {
            deviations.push(createDeviation(
                DEVIATION_TYPES.UNDER_DOSING,
                currentPhase,
                'Chemical Concentration',
                actualConc,
                expectedConc,
                deviation,
                now
            ));
        }
    }

    // 5. HIGH PRESSURE
    if (currentParams.pressure) {
        const maxPressure = 3.0; // bar
        if (currentParams.pressure > maxPressure) {
            const deviation = ((currentParams.pressure - maxPressure) / maxPressure) * 100;
            deviations.push(createDeviation(
                DEVIATION_TYPES.HIGH_PRESSURE,
                currentPhase,
                'Pressure',
                currentParams.pressure,
                maxPressure,
                deviation,
                now
            ));
        }
    }

    return deviations;
};

/**
 * Create a deviation object
 */
const createDeviation = (typeConfig, phase, parameter, actual, expected, deviation, timestamp) => {
    return {
        id: `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: typeConfig.type,
        title: typeConfig.title,
        severity: typeConfig.severity,
        phase,
        parameter,
        actualValue: Math.round(actual * 10) / 10,
        expectedValue: Math.round(expected * 10) / 10,
        deviation: Math.round(deviation * 10) / 10,
        cause: typeConfig.cause,
        suggestedAction: typeConfig.action,
        impact: typeConfig.impact,
        icon: typeConfig.icon,
        timestamp
    };
};

/**
 * Get severity configuration
 */
export const getSeverityConfig = (severity) => {
    const configs = {
        critical: {
            color: '#ef4444',
            bgColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            icon: '⚠️',
            label: 'CRITICAL'
        },
        warning: {
            color: '#f59e0b',
            bgColor: 'rgba(245, 158, 11, 0.1)',
            borderColor: 'rgba(245, 158, 11, 0.3)',
            icon: '⚡',
            label: 'WARNING'
        },
        info: {
            color: '#3b82f6',
            bgColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgba(59, 130, 246, 0.3)',
            icon: 'ℹ️',
            label: 'INFO'
        }
    };

    return configs[severity] || configs.info;
};
