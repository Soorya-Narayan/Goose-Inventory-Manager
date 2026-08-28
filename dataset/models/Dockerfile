# Dockerfile for Model 1 API Service
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy model files and API server
COPY model1_cip_failure_improved.pkl .
COPY model1_scaler_improved.pkl .
COPY model1_features_improved.pkl .
COPY golden_baseline.json .
COPY model2_deviation_detector.py model3_resource_optimizer.py model4_maintenance.py model5_recipe_optimizer.py model6_chemical_sensor.py model7_sensor_drift.py ./
COPY api_server.py .

# Expose API port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5001/health')"

# Run API server
CMD ["python", "api_server.py"]
