import random
import numpy as np
from datetime import datetime, timedelta

class SensorDriftMonitor:
    """
    Model 7: Sensor Drift Prediction (Priority #5)
    Monitors sensor health by analyzing historical trends for drift.
    """

    def __init__(self):
        # Simulation parameters
        self.sensors = ['Conductivity', 'Temperature', 'Flow']
        
    def analyze_drift(self):
        """
        Analyze historical data (Simulated) to detect drift.
        In a real system, this would query InfluxDB for last 30 days of 'Final Rinse' data.
        """
        
        results = {}
        overall_health = "Good"
        
        for sensor in self.sensors:
            # Simulate 30 days of data
            days = 30
            # Base values
            base_val = 0.5 if sensor == 'Conductivity' else 25.0 if sensor == 'Temperature' else 1200
            noise_level = base_val * 0.05
            
            # Simulate Drift
            # Randomly decide if this sensor is drifting
            is_drifting = random.random() < 0.3 # 30% chance of drift
            drift_direction = 1 if random.random() > 0.5 else -1
            drift_slope = (base_val * 0.15) / 30 if is_drifting else 0 # 15% drift over 30 days
            
            history = []
            for i in range(days):
                # t = 0 to 29
                t = i
                val = base_val + (drift_slope * t) + random.uniform(-noise_level, noise_level)
                history.append(val)
            
            # Calibration Logic
            # If drift > 10%, Calibration Needed
            start_val = np.mean(history[:5])
            end_val = np.mean(history[-5:])
            drift_pct = abs((end_val - start_val) / start_val) * 100
            
            status = "Good"
            calib_days = 90
            
            if drift_pct > 10:
                status = "Critical"
                calib_days = 0 
                overall_health = "Action Required"
            elif drift_pct > 5:
                status = "Warning"
                calib_days = 7
                if overall_health != "Action Required": overall_health = "Warning"
            
            # Trend for Chart (Normalize to 0-100 relative to base)
            trend_data = [round(x, 2) for x in history]
            
            results[sensor] = {
                "status": status,
                "drift_pct": round(drift_pct, 1),
                "calibration_due_days": calib_days,
                "trend": trend_data[-10:], # Last 10 points for sparkline
                "is_drifting": is_drifting
            }
            
        return {
            "sensors": results,
            "overall_system_status": overall_health,
            "analysis_timestamp": datetime.now().isoformat()
        }
