// src/utils/resourceCalculations.js

/**
 * Resource Calculation Engine
 * Calculates metrics based on standard physics and typical industrial costs
 */

// Constants (Configurable in real app)
export const COSTS = {
    WATER_PER_LITER: 0.25,     // ₹0.25 per L
    ENERGY_PER_KWH: 12.50,     // ₹12.50 per kWh
    CHEM_PER_LITER: 290.00,    // ₹290 per L
    CO2_KG_PER_KWH: 0.82,      // India Grid carbon intensity (approx)
    CO2_KG_PER_LITER_WATER: 0.001
};

// Physics Constants
const SPECIFIC_HEAT_WATER = 4.186; // kJ/kg·°C

/**
 * Calculate Energy Usage (Thermodynamic estimation)
 * @param {number} flowRateLpm - Flow rate in Liters/min
 * @param {number} currentTemp - Current temperature in °C
 * @param {number} supplyTemp - Supply water temperature (default 20°C)
 * @param {number} durationSeconds - Duration of this state in seconds
 * @returns {number} Energy in kWh
 */
export const calculateEnergyUsage = (flowRateLpm, currentTemp, supplyTemp = 20, durationSeconds = 1) => {
    if (currentTemp <= supplyTemp || flowRateLpm <= 0) return 0;

    const massFlowKgPerSec = (flowRateLpm / 60); // 1L approx 1kg
    const tempDelta = currentTemp - supplyTemp;
    const powerKw = massFlowKgPerSec * SPECIFIC_HEAT_WATER * tempDelta;

    return (powerKw * durationSeconds) / 3600;
};

/**
 * Calculate Total Costs
 * @param {Object} usage - Cumulative usage object
 * @returns {Object} Cost breakdown
 */
export const calculateCosts = (usage) => {
    return {
        water: (usage.waterLiters || 0) * COSTS.WATER_PER_LITER,
        energy: (usage.energyKwh || 0) * COSTS.ENERGY_PER_KWH,
        chemical: (usage.chemicalLiters || 0) * COSTS.CHEM_PER_LITER,
        total: 0 // Calculated below
    };
};

/**
 * Calculate Carbon Footprint
 * @param {Object} usage - Cumulative usage object
 * @returns {number} Total CO2 kg
 */
export const calculateCarbonFootprint = (usage) => {
    const energyCO2 = (usage.energyKwh || 0) * COSTS.CO2_KG_PER_KWH;
    const waterCO2 = (usage.waterLiters || 0) * COSTS.CO2_KG_PER_LITER_WATER;
    return energyCO2 + waterCO2;
};

/**
 * Calculate Sustainability Score (0-100)
 * Higher is better. Based on efficiency vs standard benchmarks.
 */
export const calculateSustainabilityScore = (usage, benchmarks) => {
    // Simple scoring logic for MVP
    // In real app, would compare against golden cycle benchmarks
    let score = 100;

    // Penalize for excessive usage (mock logic)
    if (usage.waterLiters > 1000) score -= 5;
    if (usage.energyKwh > 50) score -= 5;
    if (usage.chemicalLiters > 20) score -= 10;

    return Math.max(0, Math.round(score));
};

export const formatCurrency = (amount, currency = 'INR', locale = 'en-IN') => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(amount);
};
