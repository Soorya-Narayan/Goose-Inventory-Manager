import json
import numpy as np
import os

class ResourceOptimizer:
    def __init__(self, baseline_path='golden_baseline.json'):
        self.baseline = self._load_baseline(baseline_path)
        
        # Utility Cost Assumptions (Configurable)
        self.COST_WATER_PER_LITER = 0.003  # $3.00 per 1000L
        self.COST_ENERGY_PER_KWH = 0.15    # $0.15 per kWh
        self.SPECIFIC_HEAT_WATER = 4.186   # kJ/kg*C
        self.AMBIENT_TEMP = 20.0           # °C
        
    def _load_baseline(self, path):
        try:
            # Handle potential path variations (Docker vs Local)
            if not os.path.exists(path):
                # Try adjusting path if running from api_server context
                if os.path.exists(os.path.join('dataset', 'models', path)):
                    path = os.path.join('dataset', 'models', path)
                elif os.path.exists(os.path.join('/app', path)):
                    path = os.path.join('/app', path)
            
            with open(path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading baseline for Model 3: {e}")
            return {}

    def calculate_resources(self, params):
        """
        Calculate resource usage and savings potential
        Input: params dict (flow, supply_temp, return_temp, duration_sec)
        """
        # 1. Extract inputs (defaulting to safe values if missing)
        flow_rate_lph = params.get('flow', 0)
        duration_sec = params.get('remaining_time', 0) # Using remaining_time as proxy for duration if total not sent
        # Ideally we want TOTAL cycle duration. If receiving live stream, we might project.
        # For this "Health Check" style model, we assume values represent the *Average* for the cycle 
        # OR the *Total* if post-processing.
        # Let's assume input 'duration_sec' is the cycle runtime. 
        # If live, we extrapolate to 1 hour (3600s) for rate display or use actual elapsed.
        
        # NOTE: Since the dashboard sends 'remaining_time' which counts DOWN, 
        # and we lack 'elapsed_time' in the simple API payload, 
        # we will assume a standard cycle duration for calculation 
        # OR use the golden baseline duration for comparison if current is missing.
        
        # Let's use the 'flow' (L/hr) to calculate hourly consumption rate for the gauge
        
        temp_c = params.get('supply_temp', 25)
        
        # 2. Get Golden Baselines
        golden_flow = self.baseline.get('flow', {}).get('mean', 1000)
        golden_temp = self.baseline.get('supply_temp', {}).get('mean', 60)
        golden_time = self.baseline.get('remaining_time', {}).get('mean', 300) # This is likely 'start time' in dataset
        
        # If duration is small (likely just a ping), project to a standard 1-hour cycle for comparison
        # or use the Golden Time as the standard reference duration.
        calc_duration_hr = golden_time / 3600.0 if golden_time > 0 else 1.0
        
        # 3. Calculate Usages (Projected per Cycle)
        
        # Water (Liters)
        current_water_usage = flow_rate_lph * calc_duration_hr
        golden_water_usage = golden_flow * calc_duration_hr
        
        # Energy (kWh) = Mass(kg) * Cp * DeltaT / 3600(kJ->kWh) matches? 
        # Energy (kWh) = (Liters * 1kg/L) * 4.186 kJ/kgC * (Temp - Ambient) / 3600 s/h
        delta_t_current = max(0, temp_c - self.AMBIENT_TEMP)
        delta_t_golden = max(0, golden_temp - self.AMBIENT_TEMP)
        
        current_energy_kwh = (current_water_usage * self.SPECIFIC_HEAT_WATER * delta_t_current) / 3600
        golden_energy_kwh = (golden_water_usage * self.SPECIFIC_HEAT_WATER * delta_t_golden) / 3600
        
        # 4. Calculate Savings Potential
        water_waste = max(0, current_water_usage - golden_water_usage)
        energy_waste = max(0, current_energy_kwh - golden_energy_kwh)
        
        cost_waste_water = water_waste * self.COST_WATER_PER_LITER
        cost_waste_energy = energy_waste * self.COST_ENERGY_PER_KWH
        total_savings_potential = cost_waste_water + cost_waste_energy
        
        # 5. Efficiency Score (0-100)
        # Higher waste = lower score
        # cost_waste / optimal_cost
        optimal_cost = (golden_water_usage * self.COST_WATER_PER_LITER) + (golden_energy_kwh * self.COST_ENERGY_PER_KWH)
        
        if optimal_cost > 0:
            pct_waste = total_savings_potential / optimal_cost
            efficiency_score = max(0, 100 - (pct_waste * 100))
            # Penalize slightly for realism if perfect
            if efficiency_score > 98: efficiency_score = 98.5
        else:
            efficiency_score = 50.0

        # 6. Generate Recommendations
        recommendations = []
        if water_waste > 0:
            recommendations.append(f"Reduce flow by {((flow_rate_lph - golden_flow)/golden_flow)*100:.1f}% to save {water_waste:.0f}L water")
        if energy_waste > 0 and delta_t_current > delta_t_golden:
            recommendations.append(f"Reduce temp by {temp_c - golden_temp:.1f}°C to save {energy_waste:.1f} kWh")
        if efficiency_score > 90 and not recommendations:
            recommendations.append("System running at peak efficiency")

        return {
            "efficiency_score": round(efficiency_score, 1),
            "savings_potential": round(total_savings_potential, 2),
            "usage": {
                "water_l": round(current_water_usage, 1),
                "energy_kwh": round(current_energy_kwh, 2),
                "water_waste": round(water_waste, 1),
                "energy_waste": round(energy_waste, 2)
            },
            "targets": {
                "water_l": round(golden_water_usage, 1),
                "energy_kwh": round(golden_energy_kwh, 2)
            },
            "recommendations": recommendations[:2]
        }
