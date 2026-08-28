import json
import random
import os
from datetime import datetime, timedelta

class MaintenancePredictor:
    def __init__(self):
        # Initial "Mock" State - In a real app, this comes from a database
        self.state = {
            "pump_health": 94.5,       # Percentage
            "valve_health": 91.2,      # Percentage
            "last_maintenance": (datetime.now() - timedelta(days=45)).isoformat(),
            "total_cycles": 1240,
            "pump_stress_accumulated": 5400,
            "valve_cycles": 15600
        }
        
    def calculate_health(self, params):
        """
        Calculate hardware health based on current cycle stress
        Input: params (flow, temp, duration)
        """
        # 1. Calculate INSTANTANEOUS Stress Factors
        flow = params.get('flow', 0)
        temp = params.get('supply_temp', 25)
        duration = params.get('remaining_time', 0) / 3600.0 if params.get('remaining_time') else 0.5
        
        # Physics of Failure (Simplified):
        # Stress increases with Flow^2 (Erosion) and Temperature (Material fatigue)
        # Normalizing factor to make degradation slow (it takes months to fail)
        
        stress_factor_pump = (flow / 1000.0)**2 * (1 + (temp - 25)/100.0) * duration * 0.05
        stress_factor_valves = (1 + (temp - 25)/100.0) * duration * 0.02
        
        # 2. Apply degradation (Simulated for demo - normally would persist to DB)
        # We decrement a tiny amount to show "live" effect if polling
        # But to avoid it dropping to 0 too fast in a demo, we clamp it
        
        # For the dashboard demo, we want to return the STATUS, 
        # plus maybe a "Projected Drop" for this cycle.
        
        current_pump_health = self.state["pump_health"] - stress_factor_pump
        current_valve_health = self.state["valve_health"] - stress_factor_valves
        
        # 3. Predict Remaining Useful Life (RUL)
        # Days = (Current Health - Failure Threshold) / Avg Daily Degradation
        avg_degradation_per_day = 0.15 # % per day
        
        rul_pump_days = max(0, (current_pump_health - 20) / avg_degradation_per_day)
        rul_valve_days = max(0, (current_valve_health - 20) / avg_degradation_per_day)
        
        min_rul_days = min(rul_pump_days, rul_valve_days)
        
        # 4. Determine Maintenance Status
        if current_pump_health < 40 or current_valve_health < 40:
            status = "CRITICAL"
        elif current_pump_health < 70 or current_valve_health < 70:
            status = "WARNING"
        else:
            status = "GOOD"
            
        recommendation = "Hardware in good condition."
        if status == "WARNING":
            recommendation = "Plan maintenance for Pump A in next shutdown."
        elif status == "CRITICAL":
            recommendation = "IMMEDIATE MAINTENANCE REQUIRED: Valve seal risk."

        return {
            "components": {
                "pump": {
                    "health": round(current_pump_health, 1),
                    "status": "Good" if current_pump_health > 70 else "Warning",
                    "cycles_since_maint": 1240
                },
                "valves": {
                    "health": round(current_valve_health, 1),
                    "status": "Good" if current_valve_health > 70 else "Warning",
                    "actuations": 15600
                }
            },
            "system_status": status,
            "rul_days": int(min_rul_days),
            "recommendation": recommendation,
            "stress_impact": {
                "pump_stress": round(stress_factor_pump, 4),
                "cycle_severity": "High" if stress_factor_pump > 0.05 else "Normal"
            }
        }
