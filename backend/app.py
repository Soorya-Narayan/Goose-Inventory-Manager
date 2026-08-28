import os
import json
import random
import time
import math
import threading
import io
import smtplib
import secrets
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta

# ======================================================
# APP INITIALIZATION
# ======================================================
app = Flask(__name__)

CORS(
    app,
    supports_credentials=True,
    origins="*",
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)

# ======================================================
# IIH ESSENTIALS SIMULATION - TAG DATABASE
# ======================================================

# Simulated PLC Tags (mimics IIH Essentials tag structure)
IIH_TAGS = [
    # CIP Process Tags
    {"id": "ns=3;s=CIP.Temperature.Tank1", "name": "Tank1_Temperature", "dataType": "Float", "unit": "°C", "description": "Caustic tank temperature", "min": 60, "max": 85, "type": "sine"},
    {"id": "ns=3;s=CIP.Temperature.Tank2", "name": "Tank2_Temperature", "dataType": "Float", "unit": "°C", "description": "Acid tank temperature", "min": 65, "max": 75, "type": "sine"},
    {"id": "ns=3;s=CIP.Pressure.Main", "name": "Main_Pressure", "dataType": "Float", "unit": "bar", "description": "Main line pressure", "min": 2.0, "max": 5.5, "type": "random"},
    {"id": "ns=3;s=CIP.Flow.Rate", "name": "Flow_Rate", "dataType": "Float", "unit": "L/min", "description": "Water flow rate", "min": 50, "max": 150, "type": "step"},
    {"id": "ns=3;s=CIP.Conductivity", "name": "Conductivity", "dataType": "Float", "unit": "µS/cm", "description": "Water conductivity", "min": 800, "max": 1500, "type": "random"},
    {"id": "ns=3;s=CIP.pH.Level", "name": "pH_Level", "dataType": "Float", "unit": "pH", "description": "Solution pH level", "min": 6.5, "max": 8.5, "type": "sine"},
    
    # Tank Levels
    {"id": "ns=3;s=CIP.Tank.Caustic.Level", "name": "Caustic_Level", "dataType": "Float", "unit": "%", "description": "Caustic tank level", "min": 40, "max": 95, "type": "random"},
    {"id": "ns=3;s=CIP.Tank.Acid.Level", "name": "Acid_Level", "dataType": "Float", "unit": "%", "description": "Acid tank level", "min": 40, "max": 95, "type": "random"},
    {"id": "ns=3;s=CIP.Tank.Water.Level", "name": "Water_Level", "dataType": "Float", "unit": "%", "description": "Water tank level", "min": 60, "max": 100, "type": "random"},
    
    # Motor Status
    {"id": "ns=3;s=CIP.Motor.Pump1.Speed", "name": "Pump1_Speed", "dataType": "Integer", "unit": "RPM", "description": "Pump 1 speed", "min": 0, "max": 1500, "type": "step"},
    {"id": "ns=3;s=CIP.Motor.Pump2.Speed", "name": "Pump2_Speed", "dataType": "Integer", "unit": "RPM", "description": "Pump 2 speed", "min": 0, "max": 1500, "type": "step"},
    
    # Digital Signals
    {"id": "ns=3;s=CIP.Valve.Inlet", "name": "Inlet_Valve", "dataType": "Boolean", "unit": "", "description": "Inlet valve status", "type": "boolean"},
    {"id": "ns=3;s=CIP.Valve.Outlet", "name": "Outlet_Valve", "dataType": "Boolean", "unit": "", "description": "Outlet valve status", "type": "boolean"},
    {"id": "aa78062e-4864-4825-8243-7b9ee8421236", "name": "System_Running", "dataType": "Boolean", "unit": "", "description": "System running status from Edge", "type": "boolean"},
]

# Active alarms storage
ACTIVE_ALARMS = []
ALARM_HISTORY = []

# Active alarms storage
ACTIVE_ALARMS = []
ALARM_HISTORY = []

# ======================================================
# GLOBAL STATE & CIRCUIT MANAGEMENT
# ======================================================

# Settings File
SETTINGS_FILE = 'settings.json'
DEFAULT_SETTINGS = {
    "users": [],
    "system": {"max_temp": 85, "max_pressure": 5.5, "min_flow": 50},
    "permissions": {"allow_remote_control": True}
}

def load_settings():
    """Load settings from JSON file"""
    if not os.path.exists(SETTINGS_FILE):
        return DEFAULT_SETTINGS
    try:
        with open(SETTINGS_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading settings: {e}")
        return DEFAULT_SETTINGS

def save_settings(new_settings):
    """Save settings to JSON file"""
    try:
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(new_settings, f, indent=4)
        return True
    except Exception as e:
        print(f"Error saving settings: {e}")
        return False

# Initialize Settings
CURRENT_SETTINGS = load_settings()

# Store current selected circuit (A or B)
CURRENT_CIRCUIT = "A"

# ======================================================
# CYCLE STATE MANAGEMENT
# ======================================================
CYCLE_STATE = {
    "status": "idle",  # idle, running, paused, completed
    "current_step": 0,
    "progress_percent": 0,
    "time_remaining": 0,
    "start_time": None,
    "paused_time": 0,  # Track time spent paused
    "steps": [
        {"name": "Pre-Rinse", "duration": 300},
        {"name": "Caustic Wash", "duration": 600},
        {"name": "Post-Rinse", "duration": 300},
        {"name": "Acid Wash", "duration": 400},
        {"name": "Final Rinse", "duration": 200}
    ]
}

def update_cycle_progress():
    """Background thread to update cycle progress"""
    global CYCLE_STATE
    
    while True:
        time.sleep(1)  # Update every second
        
        if CYCLE_STATE["status"] == "running":
            # Calculate total duration
            total_duration = sum(step["duration"] for step in CYCLE_STATE["steps"])
            
            # Calculate elapsed time (excluding paused time)
            elapsed = time.time() - CYCLE_STATE["start_time"] - CYCLE_STATE["paused_time"]
            
            # Update time remaining
            CYCLE_STATE["time_remaining"] = max(0, total_duration - int(elapsed))
            
            # Update progress percentage
            CYCLE_STATE["progress_percent"] = min(100, (elapsed / total_duration) * 100)
            
            # Determine current step
            step_elapsed = 0
            for i, step in enumerate(CYCLE_STATE["steps"]):
                step_elapsed += step["duration"]
                if elapsed < step_elapsed:
                    CYCLE_STATE["current_step"] = i
                    break
            else:
                # Cycle completed
                CYCLE_STATE["current_step"] = len(CYCLE_STATE["steps"]) - 1
            
            # Mark as completed when done
            if CYCLE_STATE["time_remaining"] <= 0:
                CYCLE_STATE["status"] = "completed"
                CYCLE_STATE["progress_percent"] = 100

# Start background thread
cycle_thread = threading.Thread(target=update_cycle_progress, daemon=True)
cycle_thread.start()

@app.route('/api/cycle/status', methods=['GET'])
def get_cycle_status():
    """Get current cycle status"""
    return jsonify({
        "status": CYCLE_STATE["status"],
        "current_step": CYCLE_STATE["current_step"],
        "progress_percent": CYCLE_STATE["progress_percent"],
        "time_remaining": CYCLE_STATE["time_remaining"],
        "steps": CYCLE_STATE["steps"]
    }), 200

@app.route('/api/cycle/control', methods=['POST'])
def cycle_control():
    """Control cycle execution (start, pause, resume, stop)"""
    global CYCLE_STATE
    
    data = request.json
    action = data.get('action', '').lower()
    
    if action == 'start':
        if CYCLE_STATE["status"] in ["idle", "completed"]:
            CYCLE_STATE["status"] = "running"
            CYCLE_STATE["current_step"] = 0
            CYCLE_STATE["progress_percent"] = 0
            CYCLE_STATE["start_time"] = time.time()
            CYCLE_STATE["paused_time"] = 0
            # Calculate total duration
            total_duration = sum(step["duration"] for step in CYCLE_STATE["steps"])
            CYCLE_STATE["time_remaining"] = total_duration
            return jsonify({"message": "Cycle started", "status": CYCLE_STATE["status"]}), 200
        else:
            return jsonify({"error": "Cycle already running or paused"}), 400
            
    elif action == 'pause':
        if CYCLE_STATE["status"] == "running":
            CYCLE_STATE["status"] = "paused"
            CYCLE_STATE["pause_start"] = time.time()
            return jsonify({"message": "Cycle paused", "status": CYCLE_STATE["status"]}), 200
        else:
            return jsonify({"error": "Cycle is not running"}), 400
            
    elif action == 'resume':
        if CYCLE_STATE["status"] == "paused":
            CYCLE_STATE["status"] = "running"
            # Add paused duration to total paused time
            if "pause_start" in CYCLE_STATE:
                CYCLE_STATE["paused_time"] += time.time() - CYCLE_STATE["pause_start"]
                del CYCLE_STATE["pause_start"]
            return jsonify({"message": "Cycle resumed", "status": CYCLE_STATE["status"]}), 200
        else:
            return jsonify({"error": "Cycle is not paused"}), 400
            
    elif action == 'stop':
        if CYCLE_STATE["status"] in ["running", "paused"]:
            CYCLE_STATE["status"] = "idle"
            CYCLE_STATE["current_step"] = 0
            CYCLE_STATE["progress_percent"] = 0
            CYCLE_STATE["time_remaining"] = 0
            CYCLE_STATE["paused_time"] = 0
            if "pause_start" in CYCLE_STATE:
                del CYCLE_STATE["pause_start"]
            return jsonify({"message": "Cycle stopped", "status": CYCLE_STATE["status"]}), 200
        else:
            return jsonify({"error": "No cycle to stop"}), 400
    else:
        return jsonify({"error": "Invalid action. Use: start, pause, resume, stop"}), 400

@app.route('/api/system/circuit', methods=['GET', 'POST'])
def handle_circuit():
    """Get or Set the current active circuit"""
    global CURRENT_CIRCUIT
    
    if request.method == 'POST':
        data = request.json
        circuit = data.get('circuit', 'A').upper()
        if circuit in ['A', 'B']:
            CURRENT_CIRCUIT = circuit
            return jsonify({"message": f"Circuit switched to {circuit}", "circuit": CURRENT_CIRCUIT}), 200
        else:
            return jsonify({"error": "Invalid circuit. Use 'A' or 'B'"}), 400
    else:
        return jsonify({"circuit": CURRENT_CIRCUIT}), 200

@app.route('/api/export/trends', methods=['POST'])
def export_trends():
    """Export trend data as CSV"""
    try:
        data = request.json
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        trend_type = data.get('trendType', 'conductivity')
        
        # Generate historical data points
        
        output = io.StringIO()
        output.write("Timestamp,Value,Unit\n")
        
        # Generate sample data between dates
        start = datetime.fromisoformat(start_date) if start_date else datetime.now() - timedelta(days=7)
        end = datetime.fromisoformat(end_date) if end_date else datetime.now()
        
        # Generate hourly data points
        current = start
        while current <= end:
            if trend_type == 'conductivity':
                value = random.uniform(800, 1500)
                unit = "µS/cm"
            elif trend_type == 'flowRate':
                value = random.uniform(50, 150)
                unit = "L/min"
            elif trend_type == 'pressure':
                value = random.uniform(2.0, 5.5)
                unit = "bar"
            else:
                value = random.uniform(0, 100)
                unit = ""
            
            output.write(f"{current.isoformat()},{value:.2f},{unit}\n")
            current += timedelta(hours=1)
        
        csv_data = output.getvalue()
        output.close()
        
        return jsonify({
            "filename": f"trends_{trend_type}_{start_date}_{end_date}.csv",
            "data": csv_data
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ======================================================
# DATA GENERATION / RETRIEVAL FUNCTIONS
# ======================================================

# Configuration for IIH Essentials Connection via Siemens Edge
IIH_MODE = os.environ.get("IIH_MODE", "REAL") # Options: SIMULATION, REAL
EDGE_API_BASE_URL = os.environ.get("EDGE_API_URL", "http://edgeappdataservice:4203")

# Edge App Data Service - Attribute IDs
EDGE_SYSTEM_STATUS_ATTRIBUTE = "aa78062e-4864-4825-8243-7b9ee8421236"  # System running status

# Tag to Attribute ID mapping
# Add your other attribute IDs here as you configure them
TAG_TO_ATTRIBUTE_MAP = {
    "System_Running": EDGE_SYSTEM_STATUS_ATTRIBUTE,
    # Add more mappings: "Tank1_Temperature": "uuid-here",
}

def fetch_from_edge_dataservice(attribute_id):
    """
    Fetch data from Siemens Edge App Data Service.
    URL format: http://edgeappdataservice:4203/DataService/anchor/v1/attributes/{attribute_id}?details=false
    No authentication required (internal network only).
    """
    try:
        url = f"{EDGE_API_BASE_URL}/DataService/anchor/v1/attributes/{attribute_id}?details=false"
        print(f"[EDGE] Fetching from: {url}")
        
        response = requests.get(url, timeout=2)  # 2 second timeout
        
        if response.status_code == 200:
            data = response.json()
            print(f"[EDGE] Response: {data}")
            
            # Edge API returns attribute value - can be boolean, number, string, etc.
            # For system status: true = running, false = idle
            value = data.get("value") if isinstance(data, dict) else data
            return value
        else:
            print(f"[EDGE Error] Failed to fetch attribute {attribute_id}: {response.status_code}")
            return None
    except Exception as e:
        print(f"[EDGE Exception] Connection failed for {attribute_id}: {e}")
        return None

def fetch_from_iih_essentials(tag_name):
    """
    Fetch data from IIH via Edge App Data Service.
    Maps tag names to Edge attribute IDs.
    """
    # Check if we have an attribute mapping for this tag
    attribute_id = TAG_TO_ATTRIBUTE_MAP.get(tag_name)
    
    if attribute_id:
        return fetch_from_edge_dataservice(attribute_id)
    
    # If no mapping, try tag_name as attribute_id directly
    print(f"[WARNING] No attribute mapping for tag '{tag_name}', trying as attribute ID")
    return fetch_from_edge_dataservice(tag_name)

def get_real_tag_value(tag_key, default_min=0, default_max=100):
    """
    Get value from IIH Essentials ONLY - NO simulation fallback.
    Raises exception if IIH connection fails.
    """
    # Always try to fetch from IIH Essentials
    real_value = fetch_from_iih_essentials(tag_key)
    if real_value is not None:
        return float(real_value)
    
    # NO FALLBACK - Raise error if IIH fails
    raise ConnectionError(f"Failed to fetch '{tag_key}' from IIH Essential. Check IIH_API_URL ({IIH_API_BASE_URL}) and ensure IIH is running.")

def generate_tag_value(tag, timestamp=None):
    """
    Fetch value from Edge/IIH Essentials.
    Returns placeholder values if Edge is not connected (for UI rendering).
    """
    # Always fetch from IIH Essentials
    tag_name = tag.get("name")
    tag_id = tag.get("id")
    
    # Try to fetch from IIH/Edge
    real_value = fetch_from_iih_essentials(tag_id)
    
    if real_value is not None:
        return real_value
    
    # If Edge not connected, return default placeholder values so dashboard renders
    print(f"[WARNING] Edge not connected for tag '{tag_name}', returning placeholder")
    
    data_type = tag.get("dataType", "Float")
    
    # Return sensible defaults based on data type
    if data_type == "Boolean":
        return False  # System idle/off by default
    elif data_type == "Integer":
        return 0
    else:  # Float
        # Return midpoint of min/max range
        min_val = tag.get("min", 0)
        max_val = tag.get("max", 100)
        return round((min_val + max_val) / 2, 2)


def generate_historical_data(tag, start_time, end_time, interval_seconds=60):
    """Generate time-series data for trending"""
    data_points = []
    current_time = start_time
    
    while current_time <= end_time:
        value = generate_tag_value(tag, current_time.timestamp())
        data_points.append({
            "timestamp": current_time.isoformat() + "Z",
            "value": value,
            "quality": "Good"
        })
        current_time += timedelta(seconds=interval_seconds)
    
    return data_points


def check_alarms():
    """Check for alarm conditions - NO SIMULATION, will be populated by IIH"""
    global ACTIVE_ALARMS, ALARM_HISTORY
    
    # Clear old alarms (auto-acknowledge after 5 minutes)
    current_time = datetime.utcnow()
    ACTIVE_ALARMS = [a for a in ACTIVE_ALARMS if (current_time - datetime.fromisoformat(a["timestamp"].replace("Z", ""))).total_seconds() < 300]
    
    # NO SIMULATION - Alarms should come from IIH Essentials alarm service
    # When IIH is connected, fetch alarms from IIH API here
    pass

# ======================================================
# IIH ESSENTIALS API ENDPOINTS
# ======================================================

@app.route("/api/iih/tags", methods=["GET"])
def get_tags():
    """Get all available PLC tags (IIH DataService/Tags endpoint)"""
    return jsonify({
        "tags": IIH_TAGS,
        "count": len(IIH_TAGS),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }), 200


@app.route("/api/iih/tags/<path:tag_id>/current", methods=["GET"])
def get_tag_current_value(tag_id):
    """Get current value of a specific tag"""
    tag = next((t for t in IIH_TAGS if t["id"] == tag_id), None)
    
    if not tag:
        return jsonify({"error": "Tag not found"}), 404
    
    value = generate_tag_value(tag)
    
    return jsonify({
        "tagId": tag_id,
        "name": tag["name"],
        "value": value,
        "unit": tag.get("unit", ""),
        "quality": "Good",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }), 200


@app.route("/api/iih/tags/current", methods=["POST"])
def get_multiple_tags_current():
    """Get current values for multiple tags (bulk request)"""
    data = request.get_json()
    tag_ids = data.get("tagIds", [])
    
    results = []
    for tag_id in tag_ids:
        tag = next((t for t in IIH_TAGS if t["id"] == tag_id), None)
        if tag:
            value = generate_tag_value(tag)
            results.append({
                "tagId": tag_id,
                "name": tag["name"],
                "value": value,
                "unit": tag.get("unit", ""),
                "quality": "Good",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            })
    
    return jsonify({
        "values": results,
        "count": len(results),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }), 200


@app.route("/api/iih/tags/<path:tag_id>/history", methods=["GET"])
def get_tag_history(tag_id):
    """Get historical data for a tag (IIH HistorianService endpoint)"""
    tag = next((t for t in IIH_TAGS if t["id"] == tag_id), None)
    
    if not tag:
        return jsonify({"error": "Tag not found"}), 404
    
    # Parse query parameters
    start_time_str = request.args.get("startTime")
    end_time_str = request.args.get("endTime")
    interval = int(request.args.get("interval", 60))  # seconds
    
    # Default: last 1 hour
    if not end_time_str:
        end_time = datetime.utcnow()
    else:
        end_time = datetime.fromisoformat(end_time_str.replace("Z", ""))
    
    if not start_time_str:
        start_time = end_time - timedelta(hours=1)
    else:
        start_time = datetime.fromisoformat(start_time_str.replace("Z", ""))
    
    # Generate historical data
    data_points = generate_historical_data(tag, start_time, end_time, interval)
    
    return jsonify({
        "tagId": tag_id,
        "name": tag["name"],
        "unit": tag.get("unit", ""),
        "startTime": start_time.isoformat() + "Z",
        "endTime": end_time.isoformat() + "Z",
        "interval": interval,
        "data": data_points,
        "count": len(data_points)
    }), 200


@app.route("/api/iih/alarms/active", methods=["GET"])
def get_active_alarms():
    """Get all active alarms"""
    check_alarms()  # Update alarm state
    
    return jsonify({
        "alarms": ACTIVE_ALARMS,
        "count": len(ACTIVE_ALARMS),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }), 200


@app.route("/api/iih/alarms/history", methods=["GET"])
def get_alarm_history():
    """Get alarm history"""
    limit = int(request.args.get("limit", 50))
    
    return jsonify({
        "alarms": ALARM_HISTORY[-limit:],
        "count": len(ALARM_HISTORY[-limit:]),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }), 200



@app.route("/api/iih/alarms/<alarm_id>/acknowledge", methods=["POST"])
def acknowledge_alarm(alarm_id):
    """Acknowledge an alarm"""
    global ACTIVE_ALARMS
    
    alarm = next((a for a in ACTIVE_ALARMS if a["id"] == alarm_id), None)
    
    if not alarm:
        return jsonify({"error": "Alarm not found"}), 404
    
    alarm["acknowledged"] = True
    alarm["acknowledgedAt"] = datetime.utcnow().isoformat() + "Z"
    alarm["status"] = "Acknowledged"
    
    return jsonify({
        "message": "Alarm acknowledged successfully",
        "alarm": alarm
    }), 200


@app.route("/api/system/status", methods=["GET"])
def get_system_status():
    """
    Get system running status from Edge App Data Service.
    Returns 'running' if attribute value is true, 'idle' if false.
    """
    try:
        # Fetch system status from Edge
        status_value = fetch_from_edge_dataservice(EDGE_SYSTEM_STATUS_ATTRIBUTE)
        
        if status_value is None:
            return jsonify({
                "status": "unknown",
                "message": "Failed to fetch status from Edge device",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }), 503
        
        # Convert boolean to running/idle
        status = "running" if status_value else "idle"
        
        return jsonify({
            "status": status,
            "raw_value": status_value,
            "attribute_id": EDGE_SYSTEM_STATUS_ATTRIBUTE,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Failed to get system status: {e}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 500



# ======================================================
# IIH EXTERNAL PROXY ROUTES (bypass self-signed SSL)
# ======================================================

# Server-side token / session storage
_iih_access_token = None
_iih_token_expiry = 0
_iih_session = requests.Session()

IIH_DEVICE_BASE = "https://192.168.1.150"
IIH_ATTRIBUTE_ID = "4d484290-01e2-4eb2-8cf4-c6d32a719ac5"

import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def _ensure_iih_login():
    global _iih_access_token, _iih_token_expiry, _iih_session
    import time
    now = time.time()
    if not _iih_access_token or now >= (_iih_token_expiry - 300):
        print("[IIH Proxy] Token missing/expired, auto-logging in...")
        credentials = {
            "username": "surya@goosesolutions.in",
            "password": "Goose@#$12345"
        }
        # Use the session to capture any cookies set by the edge gateway
        resp = _iih_session.post(
            f"{IIH_DEVICE_BASE}/device/edge/api/v2/login/direct",
            json=credentials,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            verify=False,
            timeout=10
        )
        if resp.ok and "application/json" in resp.headers.get("Content-Type", ""):
            token_data = resp.json()
            _iih_access_token = token_data.get("accessToken")
            _iih_token_expiry = token_data.get("expiresAt", 0)
            print(f"[IIH Proxy] Auto-login OK. Token: {_iih_access_token[:8] if _iih_access_token else 'None'}... Cookies: {_iih_session.cookies.get_dict()}")
            return True, token_data
        else:
            print(f"[IIH Proxy] Login failed with status: {resp.status_code}")
            return False, None
    return True, None

@app.route("/api/iih/proxy/login", methods=["POST"])
def iih_proxy_login():
    success, data = _ensure_iih_login()
    if success:
        return jsonify(data or {"status": "Already logged in"}), 200
    return jsonify({"error": "Failed to login to IIH"}), 502

@app.route("/api/iih/proxy/datapoint", methods=["GET"])
def iih_proxy_datapoint():
    global _iih_access_token, _iih_session
    try:
        success, _ = _ensure_iih_login()
        if not success:
            return jsonify({"error": "Auto-relogin to IIH failed"}), 503

        url = f"{IIH_DEVICE_BASE}/iih-essentials/DataService/anchor/v1/attributes/{IIH_ATTRIBUTE_ID}?details=false"
        print(f"[IIH Proxy] Fetching from {url} with token={_iih_access_token[:8]}...", flush=True)

        base_headers = {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "PostmanRuntime/7.32.3",
            "Origin": IIH_DEVICE_BASE,
            "Referer": f"{IIH_DEVICE_BASE}/",
            "Connection": "keep-alive"
        }

        # Siemens IIH Essentials requires specific headers/cookies to bypass gateway redirects
        # Status 200 SUCCESS confirmed with 'authToken' cookie and 'X-Requested-With'
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {_iih_access_token}",
            "Cookie": f"authToken={_iih_access_token}",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "PostmanRuntime/7.32.3",
            "Origin": IIH_DEVICE_BASE,
            "Referer": f"{IIH_DEVICE_BASE}/",
            "Connection": "keep-alive"
        }
        
        resp = _iih_session.get(url, headers=headers, verify=False, timeout=10)
        content_type = resp.headers.get("Content-Type", "")

        if resp.status_code == 200 and "text/html" not in content_type:
            print(f"[IIH Proxy] Datapoint fetch SUCCESS", flush=True)
            return jsonify(resp.json()), 200
        
        print(f"[IIH Proxy] Fetch failed with status {resp.status_code}. Content-Type: {content_type}", flush=True)
        _iih_access_token = None
        return jsonify({"error": "IIH returned unauthorized or invalid content type"}), 401


    except Exception as e:
        print(f"[IIH Proxy] Error: {e}")
        return jsonify({"error": str(e)}), 500



@app.route("/api/chat", methods=["POST"])

def chat():
    """AI Chatbot Endpoint - Comprehensive Knowledge Base"""
    try:
        data = request.json
        if not data:
            return jsonify({"answer": "Invalid request format."}), 400

        question = data.get("message", "")
        context = data.get("context", {})
        
        if not question:
            return jsonify({" error": "No message provided"}), 400

        q_lower = question.lower()
        
        # ===== CONSUMPTION & COST QUERIES =====
        if any(word in q_lower for word in ["cost", "price", "spend", "expense"]):
            return jsonify({
                "answer": """**💰 Cost Per Cycle: $42.50 (average)**

**Breakdown:**
• Water: 850L @ ~$0.02/L = $17
• Energy: 32 kWh @ ~$0.12/kWh = $3.84
• Chemicals: 8.5L @ ~$2.50/L = $21.25

**Range:** $38.80 - $48.50 depending on efficiency

**💡 Cost Reduction Tips:**
• Reduce Final Rinse duration by 2min → Save $1.20/cycle
• Optimize Caustic temp → Save $0.96/cycle (8% energy)
• Fix dosing pump calibration → Prevent chemical waste"""
            }), 200
            
        if any(word in q_lower for word in ["water", "consumption", "usage"]) and not "cost" in q_lower:
            return jsonify({
                "answer": """**💧 Water Consumption: 850L per cycle (average)**

**Recent History:**
• Best: 790L (2026-01-22, 95% efficiency)
• Worst: 920L (2026-01-24, 85% efficiency)  
• Range: 790-920L

**💡 Optimization:**
Reduce Final Rinse duration by 2 min → Save 300L water/day"""
            }), 200
            
        if "energy" in q_lower and not "cost" in q_lower:
            return jsonify({
                "answer": """**⚡ Energy Consumption: 32 kWh per cycle (average)**

**Range:** 28-38 kWh depending on temperature setpoints

**Recent History:**
• Best: 28 kWh (optimal temp control)
• Average: 32 kWh
• Peak: 38 kWh (high temp cycles)

**💡 Optimization:**
Lower Caustic temperature from 78°C to 75°C → Save 2.3 kWh/cycle (7% reduction)"""
            }), 200
            
        if "chemical" in q_lower and not any(x in q_lower for word in ["sensor","trend","chart"]):
            return jsonify({
                "answer": """**🧪 Chemical Usage: 8.5L per cycle (average)**

**Chemicals Used:**
• NaOH (Caustic): ~4.5L per cycle
• HNO3 (Acid): ~4.0L per cycle

**Concentration Monitoring:**
• Caustic: 1.5-2.5% (optimal)
• Acid: 1.0-2.0% (optimal)

**💡 Optimization:**
Check dosing pump calibration to prevent waste → Save ~$50/week"""
            }), 200
        
        # ===== EQUIPMENT & COMPONENTS =====
        if any(word in q_lower for word in ["equipment", "component", "pump", "valve", "tank", "material", "specification", "spec"]):
            return jsonify({
                "answer": """**⚙️ CIP System Equipment**

**Storage Tanks:**
• Caustic Tank: 2,500L (Insulated, 80°C max)
• Acid Tank: 2,000L (Corrosion resistant)
• Recovery Tank: 3,000L (Water reclamation)
• Fresh Water: 5,000L (RO treated, <5µS/cm)

**Main Components:**
• Supply Pump: Hyginox SE-28 (7.5kW, 150 L/min, 5.5 bar)
• Return Pump: Liquid Ring (4.0kW, 120 L/min)
• Heat Exchanger: Steam Shell & Tube (45kW, 20-85°C)
• Control Valves: Pneumatic DN50-65 (<3s response)

**Materials:**
• Contact Parts: AISI 316L stainless steel
• Structure: AISI 304 stainless steel  
• Seals: EPDM/Viton (FDA approved)
• Surface Finish: Ra < 0.8µm (electro-polished)

💡 All components pharmaceutical-grade certified"""
            }), 200
        
        # ===== CYCLE INFORMATION QUERIES =====
        if any(word in q_lower for word in ["cycle", "step", "duration", "how long"]):
            if "status" in q_lower or "running" in q_lower:
                status = context.get('status', 'Unknown')
                step_num = context.get('current_step', 0)
                steps = ["Pre-Rinse", "Caustic Wash", "Post-Rinse", "Acid Wash", "Final Rinse"]
                step_name = steps[step_num] if step_num < len(steps) else "Unknown"
                time_left = context.get('time_remaining', 0)
                
                return jsonify({
                    "answer": f"""**🔄 Cycle Status: {status.upper()}**

**Current Step:** {step_name} (Step {step_num + 1}/5)
**Time Remaining:** {time_left // 60} min {time_left % 60} sec
**Progress:** {context.get('progress_percent', 0):.0f}%

**All Steps:**
1. Pre-Rinse (5 min)
2. Caustic Wash (10 min)  
3. Post-Rinse (5 min)
4. Acid Wash (7 min)
5. Final Rinse (3 min)"""
                }), 200
            else:
                return jsonify({
                    "answer": """**🔄 CIP Cycle Information**

**Total Duration:** ~30 minutes

**Steps:**
1. **Pre-Rinse** - 5 min (Remove debris with water)
2. **Caustic Wash** - 10 min (NaOH at 75-80°C)
3. **Post-Rinse** - 5 min (Rinse caustic)  
4. **Acid Wash** - 7 min (HNO3 for mineral deposits)
5. **Final Rinse** - 3 min (Final water rinse)

**Control:** Use "Start cycle", "Pause", "Resume", "Stop cycle" commands"""
                }), 200
        
        # ===== AI MODELS & DIAGNOSTICS =====
        if any(word in q_lower for word in ["ai", "model", "ml", "machine learning", "diagnostic"]):
           return jsonify({
                "answer": """**🤖 AI Diagnostics - 9 Models Available**

**1. Failure Risk Predictor** - Predicts failure probability (99.96% accuracy)
**2. Anomaly Detector** - Real-time pattern detection
**3. Recipe Optimizer** - Optimizes cleaning recipes  
**4. Performance Forecaster** - Forecasts system performance
**5. Cleaning Efficacy Predictor** - Predicts cleaning effectiveness
**6. Root Cause Analyzer** - Identifies root causes
**7. Chemical Sensor Monitoring** - Chemical concentration tracking
**8. Sensor Drift Detection** - Calibration drift detection
**9. Energy Optimizer** - Energy usage optimization

Try: "Show AI diagnostics" or "Navigate to ai-diagnostics"
"""
            }), 200
            
        if "sustainability" in q_lower or "efficiency" in q_lower or "score" in q_lower:
            return jsonify({
                "answer": """**🌱 Sustainability Score: 90%**

**Performance:**
• Water Efficiency: 92%
• Energy Efficiency: 88%  
• Chemical Optimization: 90%

**Savings Potential:** $8,450 annually

**Top Recommendations:**
1. Reduce Pre-Rinse duration (38s vs 45s) → Save 156L water/day
2. Lower Caustic temp (75°C vs 78°C) → Save 2.3 kWh/cycle
3. Check dosing pump calibration → Prevent chemical waste"""
            }), 200
        
        # ===== METRIC TREND CHARTS =====
        if "trend" in q_lower or "chart" in q_lower or "plot" in q_lower or "graph" in q_lower:
            metric = "conductivity"
            
            if any(word in q_lower for word in ["temp", "temperature"]):
                metric = "temperature"
            elif any(word in q_lower for word in ["pressure", "bar"]):
                metric = "pressure"
            elif any(word in q_lower for word in ["flow", "rate"]):
                metric = "flowRate"
            elif any(word in q_lower for word in ["level", "tank"]):
                metric = "tankLevel"
            elif any(word in q_lower for word in ["ph", "acidity", "alkalinity"]):
                metric = "pH"
            elif any(word in q_lower for word in ["conductivity", "conductance"]):
                metric = "conductivity"
            
            return jsonify({
                "answer": f"Here is the {metric} trend for the last hour.",
                "actions": [{
                    "tool": "RENDER_CHART",
                    "args": {
                        "title": f"Live {metric.replace('Rate', ' Rate').replace('Level', ' Level').capitalize()} Trend",
                        "type": "line",
                        "data_source": "query_historical_data",
                        "params": { "metric": metric, "range": "1h" }
                    }
                }]
            }), 200

        # ===== ALARMS =====
        if "alarm" in q_lower or "alert" in q_lower or "warning" in q_lower:
             return jsonify({
                "answer": "Here are the currently active alarms.",
                "actions": [{
                    "tool": "RENDER_TABLE",
                    "args": {
                        "title": "Active Critical Alarms",
                        "columns": ["id", "timestamp", "message", "severity"],
                        "data_source": "get_active_alarms"
                    }
                }]
            }), 200

        # ===== NAVIGATION (FIXED) =====
        if "go to" in q_lower or "navigate" in q_lower or "open" in q_lower or "show me" in q_lower:
            target = "/dashboard"
            
            # Check for specific pages
            if any(word in q_lower for word in ["alarm", "alert"]):
                target = "/alarms"
            elif "settings" in q_lower or "config" in q_lower:
                target = "/settings"
            elif any(word in q_lower for word in ["ai", "diagnostic", "model", "ml"]):
                target = "/ai-diagnostics"
            elif "analytics" in q_lower or "analysis" in q_lower or "stats" in q_lower:
                target = "/analytics"
            elif "monitor" in q_lower or "live" in q_lower:
                target = "/monitoring"
            elif "report" in q_lower:
                target = "/reports"
            elif "help" in q_lower:
                target = "/help"
            elif "profile" in q_lower or "account" in q_lower:
                target = "/profile"
            elif "setpoint" in q_lower:
                target = "/setpoints"
            elif "dashboard" in q_lower or "main" in q_lower or "home" in q_lower:
                target = "/dashboard"
            
            return jsonify({
                "answer": f"Navigating to {target.replace('/', '').replace('-', ' ').title()} page...",
                "actions": [{
                    "tool": "NAVIGATE",
                    "args": { "path": target }
                }]
            }), 200
        
        # ===== DASHBOARD OVERVIEW (DEFAULT) =====
        if any(word in q_lower for word in ["what", "tell me", "info", "data", "about", "help", "capabilities"]):
            return jsonify({
                "answer": """**🏭 CIP Dashboard - Complete Overview**

**📊 Live Monitoring:**
• Temperature: 60-85°C | Pressure: 2.0-5.5 bar
• Flow Rate: 50-150 L/min | pH: 6.5-8.5
• Conductivity: 800-1500 µS/cm

**💰 Consumption (per cycle):**
• Cost: $42.50 | Water: 850L | Energy: 32 kWh

**🔄 CIP Cycle:** 30 min (5 steps)  
**🌱 Sustainability:** 90% score
**🤖 AI Models:** 9 models active

**Available Pages:**
/dashboard, /ai-diagnostics, /analytics, /alarms, /settings, /monitoring, /reports, /help

**Try asking:**
• "What is the cost per cycle?"
• "Show temperature trends"
• "Go to AI diagnostics"
• "Active alarms"
• "How long does a cycle take?"
"""
            }), 200
        
        # ===== FALLBACK: RAG SERVICE ===== 
        # This is for questions we don't explicitly handle
        try:
            from rag_service import rag_service
            
            status = context.get('status', 'Unknown')
            step = context.get('step', 'Unknown')
            alarms_count = len(context.get('alarms', []))
            
            system_state_str = f"Cycle Status: {status}\nCurrent Step: {step}\nActive Alarms: {alarms_count}"
            api_base_url = context.get('api_base_url', 'http://localhost:8080/api')
               
            response = rag_service.query(question, system_state_str, api_base_url)
            return jsonify({"answer": response}), 200

        except ImportError:
            print("RAG Service Import Failed - providing helpful fallback")
            # Fallback for unrecognized questions
            return jsonify({
                "answer": """🤔 **I'm not quite sure about that question.**

**Here's what I can help with:**

💰 **Costs & Consumption:**
• "What is the cost per cycle?"
• "Water consumption" / "Energy usage"

🔄 **Cycle Information:**
• "How long does a cycle take?"
• "Cycle status" / "What step are we on?"

📊 **Charts & Data:**  
• "Show temperature trends"
• "Show pressure chart"

⚙️ **Equipment:**
• "Equipment details" / "Tank capacities"

🤖 **AI Models:**
• "What AI models do you have?"
• "Sustainability score"

🧭 **Navigation:**
• "Go to AI diagnostics" / "Navigate to alarms"

💡 Try asking one of these or type your question differently!
"""
            }), 200
        except Exception as e:
            print(f"RAG Execution Error: {e}")
            return jsonify({
                "answer": """😅 **Something went wrong processing that.**

Try asking about:
• Costs ("cost per cycle")
• Consumption ("water usage")
• Cycles ("how long")
• Charts ("show trends")
• Navigation ("go to alarms")
"""
            }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"answer": f"System Error: {str(e)}. Please check backend logs."}), 200



@app.route("/api/ml/anomaly", methods=["POST"])
def check_anomaly():
    """Check if current sensor data is anomalous"""
    try:
        from ml_service import ml_service
        data = request.json
        # Expecting [temp, pressure, flow, cond]
        features = data.get('features', [])
        
        if len(features) != 4:
            return jsonify({"error": "Invalid features. Expected 4."}), 400
            
        result = ml_service.analyze_anomaly(features)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/ml/forecast", methods=["POST"])
def get_forecast():
    """Get forecast for a parameter"""
    try:
        from ml_service import ml_service
        data = request.json
        current_val = data.get('value', 0)
        
        forecast = ml_service.predict_forecast(current_val)
        return jsonify({"forecast": forecast}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/settings", methods=["GET", "POST"])
def handle_settings():
    """Get or Update System Settings"""
    global CURRENT_SETTINGS
    
    if request.method == "POST":
        new_settings = request.json
        if save_settings(new_settings):
            CURRENT_SETTINGS = new_settings
            return jsonify({"message": "Settings saved successfully", "settings": CURRENT_SETTINGS}), 200
        else:
            return jsonify({"error": "Failed to save settings"}), 500
            
    return jsonify(CURRENT_SETTINGS), 200

@app.route("/api/profile", methods=["GET", "PUT"])
def handle_profile():
    """Get or Update User Profile"""
    global CURRENT_SETTINGS
    
    if request.method == "PUT":
        data = request.json
        user_id = data.get('id')
        
        # Update user in settings
        users = CURRENT_SETTINGS.get('users', [])
        user_found = False
        
        for user in users:
            if user.get('id') == user_id:
                user['name'] = data.get('name', user.get('name'))
                user['email'] = data.get('email', user.get('email'))
                user['bio'] = data.get('bio', user.get('bio', ''))
                user['avatar'] = data.get('avatar', user.get('avatar', ''))
                user_found = True
                break
        
        if user_found:
            if save_settings(CURRENT_SETTINGS):
                return jsonify({"message": "Profile updated successfully", "user": next(u for u in users if u.get('id') == user_id)}), 200
            else:
                return jsonify({"error": "Failed to save profile"}), 500
        else:
            return jsonify({"error": "User not found"}), 404
    
    # GET request - return first admin or first user
    users = CURRENT_SETTINGS.get('users', [])
    active_user = next((u for u in users if u.get('role') == 'Administrator'), users[0] if users else None)
    
    if active_user:
        # Enrich with stats
        profile = {
            **active_user,
            'stats': {
                'cyclesInitiated': random.randint(120, 450),
                'alarmsAcknowledged': random.randint(30, 150),
                'avgSuccessRate': f"{random.randint(92, 99)}%",
                'lastLogin': (datetime.utcnow() - timedelta(hours=random.randint(1, 12))).isoformat() + "Z"
            },
            'session': {
                'ip': '192.168.1.' + str(random.randint(100, 250)),
                'device': 'Windows Desktop',
                'loginTime': (datetime.utcnow() - timedelta(hours=2)).isoformat() + "Z"
            }
        }
        return jsonify(profile), 200
    
    return jsonify({"error": "No user found"}), 404

@app.route("/api/profile/activity", methods=["GET"])
def get_profile_activity():
    """Get user activity feed"""
    # Generate sample activity
    activities = []
    activity_types = [
        {"icon": "fa-play-circle", "action": "Started CIP cycle", "detail": "Pre-Rinse → Caustic Wash"},
        {"icon": "fa-check-circle", "action": "Acknowledged alarm", "detail": "High Temperature Warning"},
        {"icon": "fa-chart-line", "action": "Viewed analytics", "detail": "Water consumption trends"},
        {"icon": "fa-sign-in-alt", "action": "Logged in", "detail": "From 192.168.1.105"},
        {"icon": "fa-cog", "action": "Updated settings", "detail": "Max temperature threshold"},
    ]
    
    for i in range(10):
        activity = random.choice(activity_types)
        time_ago = datetime.utcnow() - timedelta(hours=random.randint(1, 48))
        activities.append({
            "id": f"activity_{i}",
            "icon": activity["icon"],
            "action": activity["action"],
            "detail": activity["detail"],
            "timestamp": time_ago.isoformat() + "Z"
        })
    
    # Sort by timestamp descending
    activities.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return jsonify({"activities": activities}), 200

# Password reset token storage (in production, use Redis or database)
PASSWORD_RESET_TOKENS = {}

@app.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    """Send password reset email"""
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    # Check if user exists in settings
    users = CURRENT_SETTINGS.get('users', [])
    user = next((u for u in users if u.get('email') == email), None)
    
    if not user:
        # For security, don't reveal if email exists
        return jsonify({"message": "If the email exists, a reset link has been sent"}), 200
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    PASSWORD_RESET_TOKENS[reset_token] = {
        'email': email,
        'user_id': user.get('id'),
        'expires': (datetime.utcnow() + timedelta(hours=1)).isoformat()
    }
    
    # Send email
    try:
        email_user = os.getenv('EMAIL_USER')
        email_pass = os.getenv('EMAIL_PASS')
        
        if not email_user or not email_pass:
            print("WARNING: EMAIL_USER or EMAIL_PASS not configured")
            return jsonify({"message": "Email service not configured"}), 500
        
        # Create reset link (use your actual domain in production)
        reset_link = f"http://localhost/reset-password?token={reset_token}"
        
        # Email content
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'CIP Dashboard - Password Reset Request'
        msg['From'] = email_user
        msg['To'] = email
        
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #3b82f6;">Password Reset Request</h2>
                    <p>Hello {user.get('name', 'User')},</p>
                    <p>We received a request to reset your password for the CIP Dashboard.</p>
                    <p>Click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" 
                           style="background: #3b82f6; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="background: #f3f4f6; padding: 10px; border-radius: 5px; word-break: break-all;">
                        {reset_link}
                    </p>
                    <p style="color: #666; font-size: 0.9em;">
                        This link will expire in 1 hour. If you didn't request this, please ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="color: #666; font-size: 0.8em;">
                        © {datetime.utcnow().year} Goose Industrial Solutions
                    </p>
                </div>
            </body>
        </html>
        """
        
        part = MIMEText(html, 'html')
        msg.attach(part)
        
        # Send via SMTP
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(email_user, email_pass)
            server.send_message(msg)
        
        return jsonify({"message": "Password reset email sent successfully"}), 200
        
    except Exception as e:
        print(f"Error sending email: {e}")
        return jsonify({"error": "Failed to send email"}), 500

@app.route("/api/reset-password", methods=["POST"])
def reset_password():
    """Reset password using token"""
    data = request.json
    token = data.get('token')
    new_password = data.get('password')
    
    if not token or not new_password:
        return jsonify({"error": "Token and password are required"}), 400
    
    # Validate token
    token_data = PASSWORD_RESET_TOKENS.get(token)
    if not token_data:
        return jsonify({"error": "Invalid or expired token"}), 400
    
    # Check expiration
    expires = datetime.fromisoformat(token_data['expires'])
    if datetime.utcnow() > expires:
        del PASSWORD_RESET_TOKENS[token]
        return jsonify({"error": "Token has expired"}), 400
    
    # Update password (in production, hash the password)
    users = CURRENT_SETTINGS.get('users', [])
    for user in users:
        if user.get('id') == token_data['user_id']:
            user['password'] = new_password  # In production: hash this!
            break
    
    if save_settings(CURRENT_SETTINGS):
        # Invalidate token
        del PASSWORD_RESET_TOKENS[token]
        return jsonify({"message": "Password reset successfully"}), 200
    
    return jsonify({"error": "Failed to reset password"}), 500

@app.route("/api/login", methods=["POST"])
def login():
    """Authenticate user with username and password"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"success": False, "error": "Username and password are required"}), 400
    
    # Check credentials against users in settings
    users = CURRENT_SETTINGS.get('users', [])
    user = next((u for u in users if u.get('username') == username and u.get('password') == password), None)
    
    if not user:
        return jsonify({"success": False, "error": "Invalid username or password"}), 401
    
    # Generate token (in production, use JWT)
    token = secrets.token_urlsafe(32)
    
    # Return success with user info (excluding password)
    user_data = {k: v for k, v in user.items() if k != 'password'}
    
    return jsonify({
        "success": True,
        "token": token,
        "user": user_data
    }), 200

# ======================================================
# LEGACY ENDPOINT (BACKWARD COMPATIBILITY)
# ======================================================

@app.route("/api/live_data", methods=["GET"])
def live_data():
    """
    CIP Dashboard live data - ONLY FETCHES FROM IIH ESSENTIAL
    NO MOCK DATA - Returns 503 error if IIH unavailable
    """
    try:
        # Attempt to fetch ALL data from IIH Essential API
        circuit = request.args.get('circuit', CURRENT_CIRCUIT)
        # Map to IIH tag names with CA/CB prefix
        # Example: CA_Temperature, CB_Pressure
        tag_prefix = f"C{circuit}_"
        
        # Fetch live values from IIH - will throw ConnectionError if fails
        # Passing min/max args though they are ignored by the strict fetcher now
        temperature = get_real_tag_value(f"{tag_prefix}Temperature", 60, 85)
        pressure = get_real_tag_value(f"{tag_prefix}Pressure", 2, 5)  
        flow_rate = get_real_tag_value(f"{tag_prefix}FlowRate", 80, 120)
        conductivity = get_real_tag_value(f"{tag_prefix}Conductivity", 800, 1500)
        water_usage = get_real_tag_value(f"{tag_prefix}WaterUsage", 500, 2000)
        ph_level = get_real_tag_value(f"{tag_prefix}PH", 6, 9)
        
        # System state
        step_index = int(get_real_tag_value(f"{tag_prefix}CurrentStep", 0, 5))
        states = ['Idle', 'Pre-Rinse', 'Caustic Wash', 'Post-Rinse', 'Acid Wash', 'Final Rinse']
        current_state = states[step_index] if 0 <= step_index < len(states) else "Idle"
        
        check_alarms()
        
        return jsonify({
            "state": current_state,
            "elapsed": int(get_real_tag_value(f"{tag_prefix}Elapsed", 0, 3600)),
            "step_index": step_index,
            "step_name": current_state,
            "progress_percent": int(get_real_tag_value(f"{tag_prefix}Progress", 0, 100)),
            "time_remaining": int(get_real_tag_value(f"{tag_prefix}TimeRemaining", 0, 1800)),
            "cycle_steps": [{"name": s, "duration": 300, "status": "active" if s == current_state else "pending"} for s in states],
            "live_params": {
                "temperature": temperature,
                "pressure": pressure,
                "flow_rate": flow_rate,
                "conductivity": conductivity,
                "water_usage": water_usage,
                "ph_level": ph_level,
            },
            "tanks": {
                "caustic": {"level": get_real_tag_value(f"{tag_prefix}CausticLevel", 40, 95), "temperature": temperature, "concentration": 2.0},
                "acid": {"level": get_real_tag_value(f"{tag_prefix}AcidLevel", 40, 95), "temperature": temperature-5, "concentration": 1.0},
                "water": {"level": get_real_tag_value(f"{tag_prefix}WaterLevel", 60, 100), "temperature": 20}
            },
            "alarms": ACTIVE_ALARMS,
            "ai_prediction": {"status": "Optimal", "value": 95.0, "message": "System operating normally"},
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "circuit": circuit,
            "iih_mode": "REAL"
        }), 200
        
    except ConnectionError as e:
        return jsonify({
            "error": "IIH Connection Failed",
            "message": str(e),
            "iih_url": IIH_API_BASE_URL,
            "status": "degraded"
        }), 503
    except Exception as e:
        # Fallback error
        return jsonify({"error": "Failed to fetch live data", "message": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "OK",
        "mode": "IIH_SIMULATION",
        "tags_count": len(IIH_TAGS),
        "active_alarms": len(ACTIVE_ALARMS),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }), 200


# ======================================================
# SECURITY HEADERS
# ======================================================
@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cache-Control"] = "no-store"
    return response


# ======================================================
# RUN SERVER
# ======================================================
if __name__ == "__main__":
    print("=" * 60)
    print("CIP DASHBOARD BACKEND - IIH ESSENTIALS COMPATIBLE")
    print("MODE: IIH SIMULATION")
    print("PORT: 8080")
    print("=" * 60)
    print("\nAvailable Endpoints:")
    print("  GET  /api/iih/tags - List all tags")
    print("  GET  /api/iih/tags/<id>/current - Current tag value")
    print("  POST /api/iih/tags/current - Bulk current values")
    print("  GET  /api/iih/tags/<id>/history - Historical data")
    print("  GET  /api/iih/alarms/active - Active alarms")
    print("  GET  /api/iih/alarms/history - Alarm history")
    print("  POST /api/iih/alarms/<id>/acknowledge - Ack alarm")
    print("  GET  /api/live_data - Legacy endpoint")
    print("  GET  /api/health - Health check")
    print("=" * 60)
    
    app.run(host="0.0.0.0", port=8080, debug=False)