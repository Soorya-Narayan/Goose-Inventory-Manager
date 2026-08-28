"""
Flask API Server for Model 1 CIP Failure Prediction
Serves real-time predictions to the React dashboard
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import numpy as np
import random
from datetime import datetime, timedelta
import os

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from React

# Load model artifacts at startup
MODEL_PATH = 'model1_cip_failure_improved.pkl'
SCALER_PATH = 'model1_scaler_improved.pkl'
FEATURES_PATH = 'model1_features_improved.pkl'

print("Loading Model 1 CIP Failure Prediction...")

try:
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    with open(SCALER_PATH, 'rb') as f:
        scaler = pickle.load(f)
    with open(FEATURES_PATH, 'rb') as f:
        feature_names = pickle.load(f)
    print(f"✓ Model loaded successfully")
    print(f"✓ Expected features: {len(feature_names)}")
except Exception as e:
    print(f"ERROR loading model: {e}")
    model = None
    scaler = None
    feature_names = []

# Load Model 2: Deviation Detector
try:
    from model2_deviation_detector import DeviationDetector
    deviation_detector = DeviationDetector('golden_baseline.json')
    print("✓ Model 2: Deviation Detector LOADED")
except Exception as e:
    print(f"ERROR loading Model 2: {e}")
    deviation_detector = None

# Load Model 3: Resource Optimizer
try:
    from model3_resource_optimizer import ResourceOptimizer
    resource_optimizer = ResourceOptimizer('golden_baseline.json')
    print("✓ Model 3: Resource Optimizer LOADED")
except Exception as e:
    print(f"ERROR loading Model 3: {e}")
    resource_optimizer = None

# Load Model 4: Maintenance Predictor
try:
    from model4_maintenance import MaintenancePredictor
    maintenance_predictor = MaintenancePredictor()
    print("✓ Model 4: Maintenance Predictor LOADED")
except Exception as e:
    print(f"ERROR loading Model 4: {e}")
    maintenance_predictor = None

# Load Model 5: Recipe Optimizer
try:
    from model5_recipe_optimizer import RecipeOptimizer
    recipe_optimizer = RecipeOptimizer()
    print("✓ Model 5: Recipe Optimizer LOADED")
except Exception as e:
    print(f"ERROR loading Model 5: {e}")
    recipe_optimizer = None

# Load Model 6: Chemical Soft Sensor
try:
    from model6_chemical_sensor import ChemicalSoftSensor
    chemical_sensor = ChemicalSoftSensor()
    print("✓ Model 6: Chemical Soft Sensor LOADED")
except Exception as e:
    print(f"ERROR loading Model 6: {e}")
    chemical_sensor = None

# Load Model 7: Sensor Drift
try:
    from model7_sensor_drift import SensorDriftMonitor
    sensor_monitor = SensorDriftMonitor()
    print("✓ Model 7: Sensor Drift Monitor LOADED")
except Exception as e:
    print(f"ERROR loading Model 7: {e}")
    sensor_monitor = None

# Feature name mapping for dashboard
FEATURE_MAP = {
    'supply_temp': 'Supply Temp (°C)',
    'return_temp': 'Return Temp (°C)',
    'temp_difference': 'Temp_Difference',
    'flow': 'Flow                                                (Liter/Hr)',
    'conductivity': 'Return Conduct (mS/m)',
    'remaining_time': 'Remaining Time (sec)',
    'step_status': 'Step Status_Encoded',
    'recipe': 'Selected Recipe_Encoded',
    'valve_status': 'Return Valve Status_Encoded',
    'pump': 'Pump Selected_Encoded',
    'hour': 'Hour',
    'day_of_week': 'DayOfWeek'
}

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/predict-failure', methods=['POST'])
def predict_failure():
    """
    Predict CIP cycle failure probability
    
    Request body:
    {
        "supply_temp": float,
        "return_temp": float,
        "flow": float,
        "conductivity": float,
        "remaining_time": int,
        "step_status": int,
        "recipe": int,
        "valve_status": int,
        "pump": int,
        "hour": int,
        "day_of_week": int
    }
    """
    
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        data = request.get_json()
        
        # Build feature vector in correct order
        features = []
        for dashboard_key, model_feature in FEATURE_MAP.items():
            if dashboard_key in data:
                features.append(float(data[dashboard_key]))
            else:
                # Use default values if missing
                features.append(0.0)
        
        # Add temp_difference if not provided (calculate from supply and return)
        if 'temp_difference' not in data and 'supply_temp' in data and 'return_temp' in data:
            temp_diff = float(data['supply_temp']) - float(data['return_temp'])
            # Find index of temp_difference and update
            for i, (key, feat) in enumerate(FEATURE_MAP.items()):
                if key == 'temp_difference':
                    features[i] = temp_diff
        
        # Convert to numpy array
        X = np.array(features).reshape(1, -1)
        
        # Scale features
        X_scaled = scaler.transform(X)
        
        # Make prediction
        prediction = int(model.predict(X_scaled)[0])
        probabilities = model.predict_proba(X_scaled)[0]
        failure_prob = float(probabilities[1] * 100)  # Convert to percentage
        
        # Determine risk level
        if failure_prob < 30:
            risk_level = "Low"
            risk_color = "green"
        elif failure_prob < 70:
            risk_level = "Medium"
            risk_color = "orange"
        else:
            risk_level = "High"
            risk_color = "red"
        
        # Get feature importance
        top_factors = []
        if hasattr(model, 'feature_importances_'):
            importance_scores = model.feature_importances_
            # Get top 5 features
            top_indices = np.argsort(importance_scores)[-5:][::-1]
            for idx in top_indices:
                feature_name = list(FEATURE_MAP.values())[idx]
                top_factors.append({
                    'feature': feature_name.replace('                                                ', '').strip(),
                    'importance': float(importance_scores[idx]),
                    'value': float(features[idx])
                })
        
        # Generate recommendation
        if failure_prob < 30:
            recommendation = "System operating normally. Continue monitoring sensor readings."
        elif failure_prob < 70:
            recommendation = "Moderate risk detected. Review temperature, flow, and conductivity readings. Verify all sensors are functioning correctly."
        else:
            recommendation = "HIGH RISK: Immediate attention required! Check temperature differentials, flow rates, and conductivity. Consider pausing cycle for inspection."
        
        # Response
        response = {
            'prediction': prediction,
            'failure_probability': round(failure_prob, 2),
            'normal_probability': round(probabilities[0] * 100, 2),
            'risk_level': risk_level,
            'risk_color': risk_color,
            'top_factors': top_factors,
            'recommendation': recommendation,
            'timestamp': datetime.now().isoformat(),
            'model_version': 'v1.0-improved'
        }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({
            'error': str(e),
            'message': 'Failed to make prediction'
        }), 500

@app.route('/api/cycle-health', methods=['POST'])
def calculate_cycle_health():
    """Model 2: Detect deviations from golden baseline"""
    try:
        if not deviation_detector:
            return jsonify({'error': 'Model 2 not active'}), 503
        
        data = request.json
        # Filter None values
        current_params = {k: v for k, v in data.items() if v is not None}
        
        result = deviation_detector.calculate_health_score(current_params)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/resource-optimization', methods=['POST'])
def calculate_resources():
    """Model 3: Resource Optimization & Sustainability"""
    try:
        if not resource_optimizer:
            return jsonify({'error': 'Model 3 not active'}), 503
            
        data = request.json
        result = resource_optimizer.calculate_resources(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/hardware-health', methods=['POST'])
def calculate_hardware_health():
    """Model 4: Predictive Maintenance"""
    try:
        if not maintenance_predictor:
            return jsonify({'error': 'Model 4 not active'}), 503
            
        data = request.json
        result = maintenance_predictor.calculate_health(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chemical-concentration', methods=['POST'])
def calculate_chemical():
    """Model 6: Chemical Concentration Soft Sensor"""
    try:
        if not chemical_sensor:
            return jsonify({'error': 'Model 6 not active'}), 503
            
        data = request.json
        # Extract required parameters
        conductivity = float(data.get('conductivity', 0))
        temperature = float(data.get('supply_temp', 0)) # Using Supply Temp as proxy if in pipe
        step_status = int(data.get('step_status', 0))
        
        result = chemical_sensor.predict(conductivity, temperature, step_status)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/model-info', methods=['GET'])
def model_info_endpoint():
    """Get model information"""
    return jsonify({
        'models_active': {
            'model1_failure_pred': model is not None,
            'model2_deviation': deviation_detector is not None,
            'model3_optimizer': resource_optimizer is not None,
            'model3_optimizer': resource_optimizer is not None,
            'model4_maintenance': maintenance_predictor is not None,
            'model5_recipe': recipe_optimizer is not None,
            'model6_chemical': chemical_sensor is not None,
            'model7_drift': sensor_monitor is not None
        },
        'model_type': 'Random Forest (Regularized)',
        'features': [k for k in FEATURE_MAP.keys()],
        'feature_count': len(feature_names),
        'version': 'v1.0-improved',
        'accuracy': '99.96%',
        'description': 'CIP Cycle Failure Prediction - Predicts mid-cycle failures based on sensor data'
    })

# --- History API (Mock) ---

def generate_mock_history():
    history = []
    recipes = ['Tank A - CAustic', 'Line 1 - Acid', 'Filler - Sanitize', 'Tank B - Rinse']
    statuses = ['Completed', 'Completed', 'Completed', 'Warning', 'Completed']
    
    base_time = datetime.now()
    
    for i in range(20):
        cycle_time = base_time - timedelta(hours=i*4 + random.randint(0, 2))
        recipe = random.choice(recipes)
        duration = random.randint(1800, 3600)
        
        # Simulate AI Scores
        health_score = random.uniform(80, 99)
        if random.random() < 0.1: health_score = random.uniform(50, 75) # Occasional bad cycle
        
        sustain_score = random.uniform(70, 95)
        
        status = 'Completed'
        if health_score < 70: status = 'Critical'
        elif health_score < 85: status = 'Warning'
        
        history.append({
            'id': f'CIP-{10230-i}',
            'timestamp': cycle_time.isoformat(),
            'recipe': recipe,
            'duration_sec': duration,
            'health_score': round(health_score, 1),
            'sustainability_score': round(sustain_score, 1),
            'status': status,
            'operator': f'Operator {random.randint(1, 5)}'
        })
    return history

@app.route('/api/history', methods=['GET'])
def get_history():
    """Get list of past CIP cycles"""
    return jsonify(generate_mock_history())

@app.route('/api/history/<cycle_id>', methods=['GET'])
def get_history_detail(cycle_id):
    """Get details for a specific cycle"""
    # Mock data for detail view
    return jsonify({
        'id': cycle_id,
        'timestamp': datetime.now().isoformat(), # Placeholder
        'recipe': 'Tank A - Caustic',
        'duration_sec': 2400,
        'stages': [
            {'name': 'Pre-Rinse', 'duration': 300, 'temp': 45, 'flow': 1200},
            {'name': 'Caustic Circ', 'duration': 1200, 'temp': 80, 'flow': 1500},
            {'name': 'Inter-Rinse', 'duration': 300, 'temp': 45, 'flow': 1200},
            {'name': 'Acid Circ', 'duration': 600, 'temp': 65, 'flow': 1500},
            {'name': 'Final Rinse', 'duration': 300, 'temp': 25, 'flow': 1200}
        ],
        'ai_analysis': {
            'health_score': 92.5,
            'sustainability_score': 88.0,
            'failure_risk': 'Low',
            'hardware_impact': 'Normal'
        }
    })

if __name__ == '__main__':
    print("\n" + "="*60)
    print("Model 1 API Server Starting...")
    print("="*60)
    print(f"Endpoints:")
    print(f"  GET  /health - Health check")
    print(f"  POST /api/predict-failure - Model 1 (Failure Prediction)")
    print(f"  POST /api/cycle-health    - Model 2 (Deviation Scoring)")
    print(f"  POST /api/resource-opt    - Model 3 (Resource Optimizer)")
    print(f"  POST /api/hardware-health - Model 4 (Maintenance)")
    print(f"  POST /api/optimize-recipe - Model 5 (Recipe Optimizer)")
    print(f"  POST /api/chemical-concentration - Model 6 (Chemical Sensor)")
    print(f"  GET  /api/sensor-health   - Model 7 (Drift Monitor)")
    print(f"  GET  /api/history         - Cycle History")
    print(f"  GET  /api/model-info      - System Status")
    print("="*60)
    print("\nServer running on http://localhost:5001")
    print("Press Ctrl+C to stop\n")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
