"""
Model 1: CIP Cycle Failure Predictor
Real-time prediction interface for CIP Dashboard
"""

import pandas as pd
import numpy as np
import pickle
import json
from datetime import datetime

class CIPFailurePredictor:
    """Real-time CIP Cycle Failure Prediction"""
    
    def __init__(self, model_path='model1_cip_failure.pkl', 
                 scaler_path='model1_scaler.pkl',
                 features_path='model1_features.pkl'):
        """Load trained model and preprocessing artifacts"""
        
        print("Loading CIP Failure Prediction Model...")
        
        # Load model
        with open(model_path, 'rb') as f:
            self.model = pickle.load(f)
        
        # Load scaler
        with open(scaler_path, 'rb') as f:
            self.scaler = pickle.load(f)
        
        # Load feature names
        with open(features_path, 'rb') as f:
            self.feature_names = pickle.load(f)
        
        print(f"✓ Model loaded successfully")
        print(f"✓ Expected features: {len(self.feature_names)}")
    
    def predict_single(self, sensor_data):
        """
        Predict failure probability for a single observation
        
        Args:
            sensor_data: dict with sensor values
            
        Returns:
            dict with prediction results
        """
        
        # Prepare feature vector
        features = []
        for feature_name in self.feature_names:
            if feature_name in sensor_data:
                features.append(sensor_data[feature_name])
            else:
                features.append(0)  # Default value for missing features
        
        # Convert to array
        X = np.array(features).reshape(1, -1)
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Predict
        prediction = self.model.predict(X_scaled)[0]
        probability = self.model.predict_proba(X_scaled)[0]
        
        # Determine risk level
        failure_prob = probability[1]
        if failure_prob < 0.3:
            risk_level = "Low"
            risk_color = "green"
        elif failure_prob < 0.7:
            risk_level = "Medium"
            risk_color = "orange"
        else:
            risk_level = "High"
            risk_color = "red"
        
        # Get feature importance if available
        top_factors = []
        if hasattr(self.model, 'feature_importances_'):
            importance_scores = self.model.feature_importances_
            # Get top 3 contributing features
            top_indices = np.argsort(importance_scores)[-3:][::-1]
            for idx in top_indices:
                top_factors.append({
                    'feature': self.feature_names[idx],
                    'importance': float(importance_scores[idx]),
                    'value': float(features[idx])
                })
        
        return {
            'prediction': int(prediction),
            'failure_probability': float(failure_prob * 100),  # As percentage
            'normal_probability': float(probability[0] * 100),
            'risk_level': risk_level,
            'risk_color': risk_color,
            'top_contributing_factors': top_factors,
            'timestamp': datetime.now().isoformat(),
            'recommendation': self._get_recommendation(failure_prob)
        }
    
    def predict_batch(self, df):
        """
        Predict failure probability for multiple observations
        
        Args:
            df: DataFrame with sensor data
            
        Returns:
            DataFrame with predictions
        """
        
        # Prepare features
        X = df[self.feature_names].values
        
        # Scale
        X_scaled = self.scaler.transform(X)
        
        # Predict
        predictions = self.model.predict(X_scaled)
        probabilities = self.model.predict_proba(X_scaled)[:, 1]
        
        # Add to dataframe
        results = df.copy()
        results['prediction'] = predictions
        results['failure_probability'] = probabilities * 100
        results['risk_level'] = results['failure_probability'].apply(
            lambda x: 'High' if x >= 70 else ('Medium' if x >= 30 else 'Low')
        )
        
        return results
    
    def _get_recommendation(self, failure_prob):
        """Get recommendation based on failure probability"""
        
        if failure_prob < 0.3:
            return "System operating normally. Continue monitoring."
        elif failure_prob < 0.7:
            return "Moderate risk detected. Review sensor readings and recent cycle performance."
        else:
            return "HIGH RISK: Immediate attention required! Check temperature, flow, and conductivity. Consider stopping cycle."


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='CIP Failure Prediction')
    parser.add_argument('--test', action='store_true', help='Run test predictions')
    parser.add_argument('--input', type=str, help='Input CSV file for batch prediction')
    parser.add_argument('--output', type=str, help='Output file for predictions')
    
    args = parser.parse_args()
    
    # Initialize predictor
    predictor = CIPFailurePredictor()
    
    if args.test:
        print("\n" + "="*80)
        print("RUNNING TEST PREDICTIONS")
        print("="*80)
        
        # Test case 1: Normal operation
        print("\n[Test 1] Normal Operation:")
        normal_data = {
            'Supply Temp (°C)': 55.0,
            'Return Temp (°C)': 70.0,
            'Temp_Difference': -15.0,
            'Flow                                                (Liter/Hr)': 1000.0,
            'Return Conduct (mS/m)': 0.75,
            'Remaining Time (sec)': 300,
            'Step Status_Encoded': 0,
            'Selected Recipe_Encoded': 0,
            'Return Valve Status_Encoded': 0,
            'Pump Selected_Encoded': 0,
            'Hour': 10,
            'DayOfWeek': 2
        }
        
        result = predictor.predict_single(normal_data)
        print(json.dumps(result, indent=2))
        
        # Test case 2: Anomalous operation
        print("\n[Test 2] Anomalous Operation:")
        anomaly_data = {
            'Supply Temp (°C)': 95.0,  # High temp
            'Return Temp (°C)': 95.0,  # No temp difference
            'Temp_Difference': 0.0,
            'Flow                                                (Liter/Hr)': -5.0,  # Negative flow
            'Return Conduct (mS/m)': 5.0,  # High conductivity
            'Remaining Time (sec)': 1000,
            'Step Status_Encoded': 1,
            'Selected Recipe_Encoded': 0,
            'Return Valve Status_Encoded': 1,
            'Pump Selected_Encoded': 1,
            'Hour': 14,
            'DayOfWeek': 4
        }
        
        result = predictor.predict_single(anomaly_data)
        print(json.dumps(result, indent=2))
        
    elif args.input:
        print(f"\nLoading data from {args.input}...")
        df = pd.read_csv(args.input)
        
        print(f"Making predictions for {len(df)} records...")
        results = predictor.predict_batch(df)
        
        output_file = args.output or 'predictions.csv'
        results.to_csv(output_file, index=False)
        print(f"✓ Predictions saved to {output_file}")
        
        # Summary
        print(f"\nPrediction Summary:")
        print(f"  High Risk: {(results['risk_level']=='High').sum()} ({(results['risk_level']=='High').mean()*100:.2f}%)")
        print(f"  Medium Risk: {(results['risk_level']=='Medium').sum()} ({(results['risk_level']=='Medium').mean()*100:.2f}%)")
        print(f"  Low Risk: {(results['risk_level']=='Low').sum()} ({(results['risk_level']=='Low').mean()*100:.2f}%)")
    
    else:
        print("\nUsage:")
        print("  Test mode: python model1_predictor.py --test")
        print("  Batch prediction: python model1_predictor.py --input data.csv --output results.csv")
