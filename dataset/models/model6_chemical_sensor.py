import random
import numpy as np

class ChemicalSoftSensor:
    """
    Model 6: Chemical Concentration Soft Sensor (Priority #3)
    Estimates % Concentration of Caustic/Acid based on Conductivity & Temperature.
    Replaces physical analyzers.
    """

    def __init__(self):
        # Base coefficients for Caustic (NaOH) and Acid (HNO3)
        # Simplified linear approximation for demo purposes
        # Real curves are polynomial and temp-dependent
        self.chemicals = {
            "Caustic": {
                "factor": 0.20,  # 1 mS/cm approx 0.2% (mock)
                "temp_coeff": -0.01, # Conductivity rises with temp, so conc factor drops? 
                                     # Actually: Cond increases ~2% per deg C. 
                                     # So specific conductance (at 25C) = Cond / (1 + 0.02*(T-25)).
                                     # Then Conc = f(Specific_Cond).
                                     # We will implement a simplified physics-based lookup.
                "target_min": 1.5,
                "target_max": 2.5
            },
            "Acid": {
                "factor": 0.15,
                "temp_coeff": -0.01,
                "target_min": 1.0,
                "target_max": 1.5
            }
        }

    def predict(self, conductivity, temperature, step_status):
        """
        Estimate concentration based on sensor data.
        """
        # Determine chemical type based on step
        # Step 0: Pre-Rinse (Water)
        # Step 1: Caustic Wash
        # Step 2: Intermediate Rinse
        # Step 3: Acid Wash
        # Step 4: Final Rinse
        
        chemical_type = "Water"
        if step_status == 1:
            chemical_type = "Caustic"
        elif step_status == 3:
            chemical_type = "Acid"
        
        if chemical_type == "Water":
             return {
                "chemical_type": "Water",
                "concentration": 0.0,
                "unit": "%",
                "status": "Neutral",
                "target_range": "0.0",
                "alert": None
            }

        params = self.chemicals[chemical_type]
        
        # 1. Temperature Correction to 25°C Reference
        # Standard compensation is usually 2% per degree C
        ref_temp = 25.0
        temp_diff = temperature - ref_temp
        comp_factor = 1.0 + (0.02 * temp_diff)
        
        # Avoid division by zero
        if comp_factor <= 0: comp_factor = 1.0
            
        specific_conductivity = conductivity / comp_factor
        
        # 2. Estimate Concentration from Specific Conductivity
        # Linear approx: Conc = k * Spec_Cond + Noise
        estimated_conc = specific_conductivity * params["factor"]
        
        # Add slight noise to simulate sensor jitter
        estimated_conc += random.uniform(-0.05, 0.05)
        
        # Clamp to 0
        if estimated_conc < 0: estimated_conc = 0.0
        
        # 3. Determine Status
        status = "Optimal"
        alert = None
        
        if estimated_conc < params["target_min"]:
            status = "Under-Dosing"
            alert = "Low Concentration"
        elif estimated_conc > params["target_max"]:
            status = "Over-Dosing"
            alert = "High Concentration"
            
        return {
            "chemical_type": chemical_type,
            "concentration": round(estimated_conc, 2),
            "unit": "%",
            "status": status,
            "target_range": f"{params['target_min']} - {params['target_max']}",
            "alert": alert,
            "raw_conductivity": conductivity,
            "specific_conductivity": round(specific_conductivity, 2)
        }
