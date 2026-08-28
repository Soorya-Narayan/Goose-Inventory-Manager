
import random

class RecipeOptimizer:
    def __init__(self):
        self.optimization_rules = [
            {
                "id": "OPT-001",
                "target": "Final Rinse",
                "condition": " Conductivity < 50uS for > 2 mins",
                "action": "Reduce Rinse Duration",
                "value_change": "-120s",
                "savings_type": "Water",
                "savings_amount": 350,  # Liters
                "risk": "Low"
            },
            {
                "id": "OPT-002",
                "target": "Caustic Wash",
                "condition": "Temp > 82°C consistently",
                "action": "Lower Setpoint",
                "value_change": "-2°C",
                "savings_type": "Energy",
                "savings_amount": 15,   # kWh
                "risk": "Low"
            },
            {
                "id": "OPT-003",
                "target": "Flow Velocity",
                "condition": "Velocity > 1.9 m/s (Turbulent+)",
                "action": "Reduce Pump Speed",
                "value_change": "-5%",
                "savings_type": "Energy",
                "savings_amount": 8,    # kWh
                "risk": "Medium"
            }
        ]

    def analyze_cycle(self, cycle_data):
        """
        Analyzes the given cycle data and returns optimization recommendations.
        """
        # Mock logic: Randomly select improvements based on "simulated" data analysis
        # In a real model, this would use historical trends and efficiency frontiers.
        
        recommendations = []
        
        # Simulate finding 1 or 2 optimizations
        num_opts = random.randint(1, 2)
        selected_rules = random.sample(self.optimization_rules, num_opts)
        
        total_savings_cost = 0
        
        for rule in selected_rules:
            # Calculate mock cost savings ($0.05/L Water, $0.15/kWh Energy)
            cost_saving = 0
            if rule['savings_type'] == 'Water':
                cost_saving = rule['savings_amount'] * 0.05
            elif rule['savings_type'] == 'Energy':
                cost_saving = rule['savings_amount'] * 0.15
                
            total_savings_cost += cost_saving
            
            recommendations.append({
                "area": rule['target'],
                "suggestion": f"{rule['action']} ({rule['value_change']})",
                "impact": f"Save {rule['savings_amount']} {rule['savings_type'] == 'Water' and 'L' or 'kWh'}",
                "annual_savings": f"${int(cost_saving * 200)}", # Assuming 200 cycles/year
                "risk": rule['risk']
            })
            
        result = {
            "status": "Optimization Available",
            "current_efficiency_score": random.randint(75, 88),
            "potential_efficiency_score": random.randint(92, 98),
            "confidence_score": f"{random.randint(950, 999)/10}%", # e.g. 98.5%
            "recommendations": recommendations,
            "total_annual_savings_potential": f"${int(total_savings_cost * 200)}"
        }
        
        return result
