// src/data/goldenCipProfiles.js

/**
 * Golden CIP Reference Profiles
 * These define the "ideal" or "perfect" CIP cycle for each circuit/recipe
 */

export const GOLDEN_CIP_PROFILES = {
    C1: {
        circuit: 'C1',
        recipe: 'Standard_Dairy',
        description: 'Standard dairy CIP cycle with caustic and acid phases',

        // Ideal parameter values for each phase (in order)
        // Phases: Pre-Rinse, Caustic, Rinse 1, Acid, Rinse 2, Sanitize
        parameters: {
            tempSupply: [25, 82, 82, 40, 68, 68, 40, 22],      // °C
            tempReturn: [22, 78, 78, 38, 65, 65, 38, 20],      // °C
            flowRate: [0, 150, 150, 150, 150, 150, 150, 0],    // L/min
            pressure: [0, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 0],    // bar
            conductivity: [0.5, 45, 45, 0.5, 18, 18, 0.5, 0.5], // mS/cm
            concentration: [0, 2.5, 2.5, 0, 1.8, 1.8, 0, 0]    // %
        },

        // Acceptable tolerance ranges for scoring
        tolerances: {
            tempSupply: 5,      // ±5°C
            tempReturn: 5,      // ±5°C
            flowRate: 10,       // ±10 L/min
            pressure: 0.3,      // ±0.3 bar
            conductivity: 5,    // ±5 mS/cm
            concentration: 0.3  // ±0.3%
        },

        // Ideal duration for each phase (minutes)
        phaseDurations: [5, 30, 10, 25, 10, 10], // Total: 90 minutes

        // Phase names
        phaseNames: ['Pre-Rinse', 'Caustic', 'Rinse 1', 'Acid', 'Rinse 2', 'Sanitize']
    },

    C2: {
        circuit: 'C2',
        recipe: 'Heavy_Duty_Clean',
        description: 'Extended CIP cycle for heavy soiling',

        parameters: {
            tempSupply: [25, 85, 85, 85, 40, 70, 70, 70, 40, 22],
            tempReturn: [22, 80, 80, 80, 38, 68, 68, 68, 38, 20],
            flowRate: [0, 160, 160, 160, 160, 160, 160, 160, 160, 0],
            pressure: [0, 2.8, 2.8, 2.8, 2.8, 2.8, 2.8, 2.8, 2.8, 0],
            conductivity: [0.5, 50, 50, 50, 0.5, 20, 20, 20, 0.5, 0.5],
            concentration: [0, 3.0, 3.0, 3.0, 0, 2.0, 2.0, 2.0, 0, 0]
        },

        tolerances: {
            tempSupply: 5,
            tempReturn: 5,
            flowRate: 10,
            pressure: 0.3,
            conductivity: 5,
            concentration: 0.3
        },

        phaseDurations: [5, 40, 10, 30, 10, 30, 10, 15], // Total: 120 minutes

        phaseNames: ['Pre-Rinse', 'Caustic 1', 'Rinse 1', 'Caustic 2', 'Rinse 2', 'Acid', 'Rinse 3', 'Sanitize']
    }
};

/**
 * Get golden profile for a specific circuit
 * @param {string} circuit - Circuit identifier (e.g., 'C1', 'C2')
 * @returns {Object} Golden CIP profile or default
 */
export const getGoldenProfile = (circuit) => {
    return GOLDEN_CIP_PROFILES[circuit] || GOLDEN_CIP_PROFILES.C1;
};

/**
 * Get all available golden profiles
 * @returns {Object} All golden CIP profiles
 */
export const getAllGoldenProfiles = () => {
    return GOLDEN_CIP_PROFILES;
};
