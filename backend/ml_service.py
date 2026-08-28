import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
import threading
import time
import random

class MLService:
    def __init__(self):
        self.anomaly_model = None
        self.forecast_model = None
        self.is_ready = False
        
        # Threat-safe storage for latest predictions
        self.latest_anomaly_score = 0.5  # 1.0 = Normal, -1.0 = Anomaly
        self.is_anomaly = False
        self.forecast_data = {}
        
        # Start background training
        self.train_thread = threading.Thread(target=self._train_models, daemon=True)
        self.train_thread.start()

    def _generate_synthetic_data(self, n_samples=1000):
        """Generate 'normal' CIP operation data for training"""
        # Features: [Temperature, Pressure, Flow, Conductivity]
        X = []
        for _ in range(n_samples):
            # Normal operating ranges
            temp = random.normalvariate(75, 2)  # Mean 75, std 2
            pressure = random.normalvariate(3.5, 0.2)
            flow = random.normalvariate(100, 5)
            cond = random.normalvariate(1200, 50)
            X.append([temp, pressure, flow, cond])
        return np.array(X)

    def _train_models(self):
        print("🤖 ML Service: Training models...")
        
        # 1. Anomaly Detection (Isolation Forest)
        X_train = self._generate_synthetic_data()
        self.anomaly_model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
        self.anomaly_model.fit(X_train)
        
        # 2. Forecasting (Simple Trend - usually retrained on live history)
        # For now, we init a dummy regressor or just use simple extrapolation
        self.forecast_model = LinearRegression()
        
        self.is_ready = True
        print("✅ ML Service: Models trained and ready.")

    def analyze_anomaly(self, features):
        """
        Analyze a single data point for anomalies.
        features: [temp, pressure, flow, conductivity]
        """
        if not self.is_ready:
            return {"score": 0, "is_anomaly": False}

        # Reshape for sklearn
        X = np.array([features])
        
        # Decision function: < 0 is anomaly
        score = self.anomaly_model.decision_function(X)[0]
        prediction = self.anomaly_model.predict(X)[0] # 1 for normal, -1 for anomaly
        
        self.latest_anomaly_score = score
        self.is_anomaly = (prediction == -1)
        
        return {
            "score": float(score),
            "is_anomaly": bool(self.is_anomaly),
            "status": "Critical" if self.is_anomaly else "Optimal"
        }

    def predict_forecast(self, current_val, steps=10):
        """
        Simple linear projection for demonstration.
        In a real app, this would use sliding window history.
        """
        # Create a synthetic trend
        future = []
        val = current_val
        for i in range(steps):
            # Add some random drift
            drift = random.uniform(-0.5, 0.5)
            val += drift
            future.append(round(val, 2))
            
        return future

# Singleton
ml_service = MLService()
