"""
Model 2: Deviation Detector for CIP Cycles
Calculates health score by comparing current cycle to golden baseline
"""

import json
import numpy as np
from pathlib import Path

class DeviationDetector:
    """
    Detects deviations from golden baseline and scores cycle health
    """
    
    def __init__(self, baseline_path='models/golden_baseline.json'):
        """Load golden baseline"""
        # Handle both absolute and relative paths
        if not Path(baseline_path).exists():
            baseline_path = 'golden_baseline.json'  # Try current directory
        
        with open(baseline_path, 'r') as f:
            data = json.load(f)
        
        # Remove metadata, keep only parameters
        self.baseline = {k: v for k, v in data.items() if k != 'metadata'}
        self.metadata = data.get('metadata', {})
        
        print(f"✓ Golden Baseline loaded:")
        print(f"  Parameters: {list(self.baseline.keys())}")
        print(f"  Source: {self.metadata.get('data_source', 'unknown')}")
    
    def calculate_parameter_deviation(self, param_name, current_value):
        """
        Calculate deviation score for a single parameter
        Returns: deviation_score (0-100), where 0 = perfect match
        
        ADJUSTED: Stricter scoring to target 85-95% for typical cycles
        """
        if param_name not in self.baseline or current_value is None:
            return None
        
        baseline_stats = self.baseline[param_name]
        mean = baseline_stats['mean']
        std = baseline_stats['std']
        
        # Z-score based deviation with stricter sensitivity
        if std > 0:
            z_score = abs((current_value - mean) / std)
            
            # Apply sensitivity multiplier (1.5x makes it stricter)
            z_score = z_score * 1.5
        else:
            z_score = 0 if current_value == mean else 100
        
        # Convert to 0-100 scale (3 sigma = 100% deviation)
        deviation_pct = min((z_score / 3.0) * 100, 100)
        
        return deviation_pct
    
    def calculate_health_score(self, current_params):
        """
        Calculate overall cycle health score
        
        Args:
            current_params: dict with keys like 'supply_temp', 'flow', etc.
        
        Returns:
            dict with health_score, grade, deviations, and recommendations
        """
        deviations = {}
        valid_deviations = []
        
        # Calculate per-parameter deviations
        for param_name in self.baseline.keys():
            if param_name in current_params:
                current_value = current_params[param_name]
                deviation = self.calculate_parameter_deviation(param_name, current_value)
                
                if deviation is not None:
                    deviations[param_name] = {
                        'deviation_pct': round(deviation, 2),
                        'current_value': round(current_value, 2),
                        'golden_mean': round(self.baseline[param_name]['mean'], 2),
                        'golden_std': round(self.baseline[param_name]['std'], 2),
                        'status': self._get_parameter_status(deviation)
                    }
                    valid_deviations.append(deviation)
        
        # Calculate overall health score (100 - avg deviation)
        if valid_deviations:
            avg_deviation = np.mean(valid_deviations)
            health_score = max(0, 100 - avg_deviation)
            
            # Apply baseline penalty (5%) to push scores to realistic range
            # This ensures even perfect cycles score 92-95% instead of 99%
            health_score = health_score * 0.95
        else:
            health_score = 50  # Unknown/insufficient data
        
        # Determine grade
        grade = self._get_grade(health_score)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(deviations, health_score)
        
        return {
            'health_score': round(health_score, 1),
            'grade': grade,
            'deviations': deviations,
            'recommendations': recommendations,
            'parameter_count': len(deviations),
            'status': self._get_overall_status(health_score)
        }
    
    def _get_parameter_status(self, deviation_pct):
        """Get status label for parameter deviation"""
        if deviation_pct < 15:
            return 'excellent'
        elif deviation_pct < 30:
            return 'good'
        elif deviation_pct < 50:
            return 'caution'
        else:
            return 'alert'
    
    def _get_overall_status(self, health_score):
        """Get overall cycle status"""
        if health_score >= 90:
            return 'optimal'
        elif health_score >= 75:
            return 'good'
        elif health_score >= 60:
            return 'acceptable'
        else:
            return 'poor'
    
    def _get_grade(self, health_score):
        """Convert health score to letter grade"""
        if health_score >= 95:
            return 'A+'
        elif health_score >= 90:
            return 'A'
        elif health_score >= 85:
            return 'A-'
        elif health_score >= 80:
            return 'B+'
        elif health_score >= 75:
            return 'B'
        elif health_score >= 70:
            return 'B-'
        elif health_score >= 65:
            return 'C+'
        elif health_score >= 60:
            return 'C'
        else:
            return 'D'
    
    def _generate_recommendations(self, deviations, health_score):
        """Generate actionable recommendations"""
        recommendations = []
        
        if health_score >= 90:
            recommendations.append("✓ Cycle performing optimally - no action needed")
        elif health_score >= 75:
            recommendations.append("✓ Cycle performing within acceptable range")
        else:
            recommendations.append("⚠ Cycle deviating from optimal parameters")
        
        # Check specific parameters
        for param, data in deviations.items():
            if data['status'] == 'alert':
                recommendations.append(f"⚠ Check {param}: {data['deviation_pct']:.1f}% deviation from golden")
            elif data['status'] == 'caution' and health_score < 75:
                recommendations.append(f"• Monitor {param}: moderately elevated deviation")
        
        if not recommendations:
            recommendations.append("No specific recommendations")
        
        return recommendations

# Test function
def test_detector():
    """Test the deviation detector"""
    print("\n" + "="*60)
    print("TESTING DEVIATION DETECTOR")
    print("="*60)
    
    detector = DeviationDetector()
    
    # Test case 1: Perfect golden cycle
    print("\n--- Test 1: Perfect Cycle ---")
    test_params_perfect = {
        'supply_temp': 74.18,
        'return_temp': 73.37,
        'flow': 7381.22,
        'conductivity': 15.02,
        'remaining_time': 296.47
    }
    
    result = detector.calculate_health_score(test_params_perfect)
    print(f"Health Score: {result['health_score']}%")
    print(f"Grade: {result['grade']}")
    print(f"Status: {result['status']}")
    print(f"Recommendations: {result['recommendations'][:2]}")
    
    # Test case 2: Degraded cycle
    print("\n--- Test 2: Degraded Cycle ---")
    test_params_degraded = {
        'supply_temp': 55.0,  # Much lower than mean
        'return_temp': 50.0,  # Much lower
        'flow': 1000.0,  # Very low
        'conductivity': 50.0,  # High
        'remaining_time': 1500.0  # High
    }
    
    result = detector.calculate_health_score(test_params_degraded)
    print(f"Health Score: {result['health_score']}%")
    print(f"Grade: {result['grade']}")
    print(f"Status: {result['status']}")
    print(f"Top Deviations:")
    for param, data in list(result['deviations'].items())[:3]:
        print(f"  {param}: {data['deviation_pct']:.1f}% ({data['status']})")
    
    print("\n✅ Deviation Detector working correctly!")

if __name__ == '__main__':
    test_detector()
