# backend_service.py

import os
import io
import csv
from functools import wraps
from flask import Flask, jsonify, request, Response, send_from_directory, session
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_session import Session
import random
import time
import threading
from datetime import datetime, timedelta
import secrets
from flask_mail import Mail, Message


# --- PERMISSIONS DICTIONARY (SINGLE SOURCE OF TRUTH) ---
PERMISSIONS = {
    'Administrator': {
        'viewDashboard': True, 'cycleControl': True, 'viewTrends': True,
        'viewAnalytics': True, 'viewAlarms': True, 'ackAlarms': True,
        'viewHelp': True, 'accessSettings': True, 'manageUsers': True,
        'editSetpoints': True
    },
    'Operator': {
        'viewDashboard': True, 'cycleControl': True, 'viewTrends': True,
        'viewAnalytics': False, 'viewAlarms': True, 'ackAlarms': True,
        'viewHelp': True, 'accessSettings': False, 'manageUsers': False,
        'editSetpoints': False
    },
    'QA/Supervisor': {
        'viewDashboard': True, 'cycleControl': False, 'viewTrends': True,
        'viewAnalytics': True, 'viewAlarms': True, 'ackAlarms': False,
        'viewHelp': True, 'accessSettings': False, 'manageUsers': False,
        'editSetpoints': False
    }
}

# --- App Initialization & Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__) # Removed static folder handling for now

instance_path = os.path.join(basedir, 'instance')
if not os.path.exists(instance_path):
    os.makedirs(instance_path)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(instance_path, 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'a-very-secret-and-secure-key-change-me') # Use env var if possible


# Session Configuration
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax' # 'Lax' is generally fine for dev
app.config['SESSION_COOKIE_HTTPONLY'] = True
# app.config['SESSION_COOKIE_SECURE'] = True # Use True in production with HTTPS
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8) # Increased lifetime slightly

# Flask-Mail Configuration (Ensure ENV variables are set)
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'true').lower() == 'true'
app.config['MAIL_USERNAME'] = os.environ.get('EMAIL_USER') # MUST BE SET
app.config['MAIL_PASSWORD'] = os.environ.get('EMAIL_PASS') # MUST BE SET
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('EMAIL_USER') # MUST BE SET

# --- Extensions Initialization ---
# ⭐ MODIFIED: Added Vite's default port (5173) to origins
# Ensure your React frontend's actual URL/port is listed here.
CORS(app,
     supports_credentials=True,
     origins=[
         'http://localhost:5000', # Backend itself (optional)
         'http://127.0.0.1:5000', # Backend itself (optional)
         'http://localhost:5173', # Vite default dev server
         'http://127.0.0.1:5173', # Vite default dev server
         # Add other origins if needed (e.g., your production frontend URL)
     ]
)

db = SQLAlchemy(app)
migrate = Migrate(app, db)
bcrypt = Bcrypt(app)
sess = Session(app)
mail = Mail(app)

# --- Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    theme = db.Column(db.String(10), nullable=False, default='light')
    status = db.Column(db.String(20), nullable=False, default='Active')
    lastActive = db.Column(db.DateTime, nullable=True) # Changed to DateTime
    avatar = db.Column(db.String(200), nullable=True)
    pin_hash = db.Column(db.String(128), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=True) # Added email field
    reset_token = db.Column(db.String(100), unique=True, nullable=True)
    reset_token_expiration = db.Column(db.DateTime, nullable=True)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf8')

    def check_password(self, password):
        # Handle cases where password_hash might be None unexpectedly
        if not self.password_hash:
            return False
        return bcrypt.check_password_hash(self.password_hash, password)

    def set_pin(self, pin):
        self.pin_hash = bcrypt.generate_password_hash(pin).decode('utf8')

    def check_pin(self, pin):
        if not self.pin_hash:
            # Maybe default check against '1234' if no pin set? Or just return False.
            # For now, if no pin is set, it's considered incorrect.
            return False
        return bcrypt.check_password_hash(self.pin_hash, pin)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'username': self.username,
            'role': self.role,
            'status': self.status,
            'lastActive': self.lastActive.isoformat() if self.lastActive else None, # Use ISO format
            'avatar': self.avatar,
            'email': self.email, # Include email
            # Securely add permissions based on the user's role
            'permissions': PERMISSIONS.get(self.role, {}),
            'theme': self.theme
            # DO NOT include password_hash, pin_hash, or reset tokens here
        }

class CycleLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    start_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    status = db.Column(db.String(50), nullable=False)
    duration_seconds = db.Column(db.Integer)
    # Add relation back to sensor data if needed for easy querying
    sensor_data = db.relationship('SensorData', backref='cycle_log', lazy=True)

class SensorData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True) # Added index
    cycle_log_id = db.Column(db.Integer, db.ForeignKey('cycle_log.id'), nullable=True) # Allow null if not in cycle
    step_name = db.Column(db.String(50))
    temperature = db.Column(db.Float)
    conductivity = db.Column(db.Float)
    flow_rate = db.Column(db.Float)
    pressure = db.Column(db.Float)

# --- CIP SIMULATION ENGINE (Largely unchanged, ensure db operations use app_context) ---
class CIPSystem:
    def __init__(self):
        self.state = {}
        self.simulation_thread = None
        self.stop_event = threading.Event() # For cleaner stopping
        self.state_lock = threading.Lock()
        self.CYCLE_STEPS = [
            {"name": "Pre-Rinse", "duration": 45, "temp": 30, "flow": 8.5, "pressure": 2.5, "cond": 200},
            {"name": "Caustic Wash", "duration": 90, "temp": 80, "flow": 7.0, "pressure": 2.2, "cond": 15000},
            {"name": "Rinse", "duration": 60, "temp": 35, "flow": 8.0, "pressure": 2.4, "cond": 500},
            {"name": "Hot Water Wash", "duration": 75, "temp": 65, "flow": 7.2, "pressure": 2.3, "cond": 100},
            {"name": "Final Rinse", "duration": 50, "temp": 25, "flow": 8.5, "pressure": 2.5, "cond": 50},
        ]
        self.TOTAL_CYCLE_DURATION = sum(step['duration'] for step in self.CYCLE_STEPS)
        self.reset_cycle()

    def reset_cycle(self):
        with self.state_lock:
            self.state = {
                "cycle_status": "Idle",
                "current_step_name": "N/A",
                "current_step_index": -1,
                "elapsed_time": 0,
                "total_progress_percent": 0,
                "step_time_remaining": 0,
                "live_parameters": {
                    "temperature": 25.0, "conductivity": 10.0,
                    "flow_rate": 0.0, "pressure": 0.0, "water_usage": 0
                },
                "tank_levels": {
                    "caustic_tank": 95.0, "hot_water_tank": 98.0,
                    "recovery_tank": 15.0, "fresh_water_tank": 100.0,
                    "caustic_temp": 60.0, "hot_water_temp": 25.0,
                    "recovery_temp": 28.0, "fresh_temp": 22.0
                },
                "total_water_usage": 0,
                "active_alarms": [], # Store alarms as dicts: {'id': 1, 'device': 'Pump', 'message': 'Low Flow', 'severity': 'High', 'timestamp': isoformat}
                "current_log_id": None
            }
            self.stop_event.clear() # Reset stop event

    def _tick_loop(self):
        """Runs the simulation loop in a separate thread."""
        while not self.stop_event.is_set():
            time.sleep(1.0) # Wait for 1 second
            if self.state["cycle_status"] == "Running":
                self._process_tick()

    def _process_tick(self):
         """Processes a single second tick of the simulation."""
         with app.app_context(): # Ensure db operations happen within app context
            with self.state_lock:
                if self.state["cycle_status"] != "Running": return # Double check status

                self.state["elapsed_time"] += 1
                elapsed = self.state["elapsed_time"]

                # --- Determine current step ---
                time_accumulator = 0
                current_step_index = -1
                step_start_time = 0
                for i, step in enumerate(self.CYCLE_STEPS):
                    step_end_time = time_accumulator + step['duration']
                    if elapsed <= step_end_time:
                        current_step_index = i
                        step_start_time = time_accumulator
                        break
                    time_accumulator = step_end_time

                # --- Update step info ---
                if current_step_index != -1:
                    current_step = self.CYCLE_STEPS[current_step_index]
                    self.state["step_time_remaining"] = (step_start_time + current_step['duration']) - elapsed
                    if current_step_index != self.state["current_step_index"]:
                        self.state["current_step_index"] = current_step_index
                        self.state["current_step_name"] = current_step["name"]
                        print(f"[CIP Tick] Entering Step: {self.state['current_step_name']}") # Log step change
                else:
                     # Cycle finished condition handled below
                    current_step = None
                    self.state["step_time_remaining"] = 0
                    if self.state["current_step_index"] != -1: # Log only once when past last step
                        self.state["current_step_index"] = -1
                        self.state["current_step_name"] = "Finishing"
                        print(f"[CIP Tick] Finishing...")


                # --- Simulate parameters ---
                if current_step:
                    target_step = current_step
                    live_params = self.state["live_parameters"]
                    ease_factor = 0.2
                    for param, target_key in [("temperature", "temp"), ("flow_rate", "flow"),
                                            ("pressure", "pressure"), ("conductivity", "cond")]:
                        if param in live_params and target_key in target_step:
                            current_val = live_params[param]
                            target_val = target_step[target_key]
                            # Approach target value smoothly with noise
                            noise = (random.random() - 0.5) * (target_val * 0.02 if target_val != 0 else 0.1)
                            live_params[param] += (target_val - current_val) * ease_factor + noise
                            live_params[param] = max(0, live_params[param]) # Prevent negative values


                    # Update water usage
                    live_params["water_usage"] += live_params["flow_rate"] / 60 # Assuming flow_rate is L/min
                    self.state["total_water_usage"] = live_params["water_usage"]

                    # Simulate tank temperatures
                    tank_state = self.state["tank_levels"] # Using this dict for temps too
                    if target_step["name"] == "Caustic Wash":
                        tank_state["caustic_temp"] = min(target_step['temp'] + 2, tank_state["caustic_temp"] + random.uniform(0.2, 0.6))
                    elif target_step["name"] == "Hot Water Wash":
                        tank_state["hot_water_temp"] = min(target_step['temp'] + 2, tank_state["hot_water_temp"] + random.uniform(0.2, 0.6))
                    else: # Gradual cooling
                        tank_state["caustic_temp"] = max(55.0, tank_state["caustic_temp"] - random.uniform(0.05, 0.1))
                        tank_state["hot_water_temp"] = max(20.0, tank_state["hot_water_temp"] - random.uniform(0.05, 0.1))

                    tank_state["recovery_temp"] = max(20.0, min(45.0, tank_state["recovery_temp"] + random.uniform(-0.2, 0.2)))
                    tank_state["fresh_temp"] = max(15.0, min(30.0, tank_state["fresh_temp"] + random.uniform(-0.1, 0.1)))

                    # Simulate tank level changes
                    if target_step["name"] == "Caustic Wash":
                        tank_state["caustic_tank"] = max(10.0, tank_state["caustic_tank"] - 0.05)
                    elif target_step["name"] == "Hot Water Wash":
                        tank_state["hot_water_tank"] = max(10.0, tank_state["hot_water_tank"] - 0.06)
                    elif "Rinse" in target_step["name"]:
                        tank_state["fresh_water_tank"] = max(10.0, tank_state["fresh_water_tank"] - 0.08)
                        tank_state["recovery_tank"] = min(95.0, tank_state["recovery_tank"] + 0.1)

                    # --- Simulate Alarms ---
                    # Example: Low flow alarm
                    alarm_id_low_flow = 101
                    if live_params["flow_rate"] < target_step["flow"] * 0.85: # If flow is < 85% of target
                         if not any(a['id'] == alarm_id_low_flow for a in self.state["active_alarms"]):
                              print("[ALARM] Low Flow Rate Detected!")
                              self.state["active_alarms"].append({
                                  'id': alarm_id_low_flow, 'device': 'Supply Pump', 'message': 'Flow rate significantly below target',
                                  'severity': 'Medium', 'timestamp': datetime.utcnow().isoformat() + 'Z'
                              })
                    else: # Clear alarm if condition is met
                        self.state["active_alarms"] = [a for a in self.state["active_alarms"] if a['id'] != alarm_id_low_flow]

                    # --- Save sensor data ---
                    current_log_id = self.state.get("current_log_id")
                    if current_log_id:
                        try:
                             new_data_point = SensorData(
                                cycle_log_id=current_log_id, step_name=self.state["current_step_name"],
                                temperature=live_params["temperature"], conductivity=live_params["conductivity"],
                                flow_rate=live_params["flow_rate"], pressure=live_params["pressure"]
                             )
                             db.session.add(new_data_point)
                             # Commit more frequently? Maybe every 10 seconds?
                             if elapsed % 10 == 0:
                                db.session.commit()
                        except Exception as e:
                             print(f"Error saving sensor data: {e}")
                             db.session.rollback()

                # --- Update total progress ---
                self.state["total_progress_percent"] = min(100.0, (elapsed / self.TOTAL_CYCLE_DURATION) * 100.0)

                # --- Check for cycle completion ---
                if elapsed >= self.TOTAL_CYCLE_DURATION:
                    print("[CIP Tick] Cycle duration reached.")
                    self._end_cycle_in_context(final_status="Completed")
                    # Stop the loop by setting the event (handled in start_cycle)
                    return # Exit tick processing

    def start_cycle(self):
        with self.state_lock:
            current_status = self.state["cycle_status"]

        if current_status == "Idle":
            self.reset_cycle() # Ensure clean state before starting
            with app.app_context(): # Create log entry within context
                new_log = CycleLog(status="Running")
                try:
                    db.session.add(new_log)
                    db.session.commit()
                    log_id = new_log.id
                except Exception as e:
                    print(f"Error creating cycle log: {e}")
                    db.session.rollback()
                    return {"error": "Failed to start cycle log"}, 500

            with self.state_lock:
                self.state["cycle_status"] = "Running"
                self.state["current_log_id"] = log_id

            # Start the simulation thread if it's not already running
            if self.simulation_thread is None or not self.simulation_thread.is_alive():
                 self.stop_event.clear()
                 self.simulation_thread = threading.Thread(target=self._tick_loop, daemon=True)
                 self.simulation_thread.start()
                 print(f"[CIP] Simulation thread started. Cycle Log ID: {log_id}")

            return {"message": "Cycle started successfully", "state": self.get_state()}, 200

        elif current_status == "Paused":
            with self.state_lock:
                self.state["cycle_status"] = "Running"
            # The loop in _tick_loop will resume processing ticks
            print("[CIP] Cycle resumed")
            return {"message": "Cycle resumed", "state": self.get_state()}, 200

        return {"error": "Cycle is already running or cannot be started"}, 400

    def pause_cycle(self):
        with self.state_lock:
            if self.state["cycle_status"] == "Running":
                self.state["cycle_status"] = "Paused"
                print("[CIP] Cycle paused")
                # The loop in _tick_loop will stop processing ticks
                return {"message": "Cycle paused", "state": self.get_state()}, 200
            else:
                return {"error": "Cycle is not running"}, 400

    def stop_cycle(self, final_status="Stopped"):
        with self.state_lock:
             if self.state["cycle_status"] in ["Running", "Paused"]:
                self.stop_event.set() # Signal the thread loop to stop
                print("[CIP] Stop event set.")
             else:
                return {"error": "Cycle is not active"}, 400

        # Wait briefly for the thread to potentially finish its last tick
        if self.simulation_thread and self.simulation_thread.is_alive():
             print("[CIP] Waiting for simulation thread to acknowledge stop...")
             # self.simulation_thread.join(timeout=2.0) # Wait max 2 seconds
             # Note: Joining daemon threads can be tricky, relying on stop_event might be safer

        # Finalize state update and DB log within app context
        result = self._end_cycle_in_context(final_status)
        return result


    def _end_cycle_in_context(self, final_status):
         """Helper to update DB and reset state, MUST be called within app_context"""
         with self.state_lock:
            current_log_id = self.state.get("current_log_id")
            elapsed = self.state["elapsed_time"]
            current_status = self.state["cycle_status"] # Get status before reset

            # Only proceed if it was running or paused
            if current_status not in ["Running", "Paused", "Finishing"] and elapsed == 0:
                 print("[CIP] Cycle already idle or reset.")
                 # Reset anyway to be sure
                 self.reset_cycle()
                 return {"message": f"Cycle {final_status.lower()}", "state": self.get_state()}, 200

            # Reset internal state *before* db commit to prevent race conditions if tick runs again
            print(f"[CIP] Resetting cycle state. Final status: {final_status}")
            self.reset_cycle()
            final_state_snapshot = self.state.copy() # Get state *after* reset

         # Update database log entry outside the lock but within app context
         if current_log_id:
            log_to_update = db.session.get(CycleLog, current_log_id)
            if log_to_update:
                log_to_update.status = final_status
                log_to_update.end_time = datetime.utcnow()
                log_to_update.duration_seconds = elapsed
                try:
                    # Final commit for any remaining sensor data and the log update
                    db.session.commit()
                    print(f"[CIP DB] Cycle log {current_log_id} updated. Status: {final_status}, Duration: {elapsed}s")
                except Exception as e:
                    print(f"Error updating cycle log {current_log_id}: {e}")
                    db.session.rollback()
                    # Return error state? Or just log? For now, log and return success message.

         return {"message": f"Cycle {final_status.lower()}", "state": final_state_snapshot}, 200


    def get_state(self):
        with self.state_lock:
            # Maybe add some calculated fields if needed by frontend
            return self.state.copy()

# --- Global CIP system instance ---
cip_system = CIPSystem()

# --- Login Required Decorator ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"error": "Authentication required", "code": "NO_SESSION"}), 401

        user = db.session.get(User, user_id)
        if not user or user.status != 'Active':
            session.clear()
            return jsonify({"error": "Authentication required", "code": "INVALID_USER"}), 401

        # Optionally, refresh session expiry on activity
        # session.modified = True
        return f(*args, **kwargs)
    return decorated_function

# --- API Endpoints ---

# ⭐ REMOVED: Static file serving - Handled by Vite dev server or production web server
# @app.route('/')
# def serve_index(): ...
# @app.route('/<path:path>')
# def serve_static_files(path): ...

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data: return jsonify({"error": "Invalid request"}), 400
    username = data.get('username')
    password = data.get('password')
    if not username or not password: return jsonify({"error": "Username and password required"}), 400

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        if user.status != 'Active':
            return jsonify({"error": "User account is deactivated."}), 403

        session.clear() # Ensure clean session
        session['user_id'] = user.id
        session.permanent = False # Use app config lifetime

        user.lastActive = datetime.utcnow() # Update last active time
        try:
             db.session.commit()
        except Exception as e:
             db.session.rollback()
             print(f"Error updating lastActive time for {username}: {e}")
             # Log error but proceed with login

        print(f"[AUTH] User {username} logged in successfully. Session ID: {session.sid}")
        return jsonify({"message": "Login successful", "user": user.to_dict()}), 200
    else:
        print(f"[AUTH] Failed login attempt for username: {username}")
        return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/check_session', methods=['GET'])
def check_session():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "No active session"}), 401

    user = db.session.get(User, user_id)
    if user and user.status == 'Active':
        # Optionally update lastActive time on session check?
        return jsonify(user.to_dict()), 200
    else:
        session.clear() # Clean up invalid session
        return jsonify({"error": "User not found or inactive"}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    user_id = session.get('user_id')
    username = "Unknown"
    if user_id:
        user = db.session.get(User, user_id)
        if user: username = user.username

    session.clear()
    print(f"[AUTH] User {username} logged out")
    return jsonify({"message": "Logout successful"}), 200

@app.route('/api/users', methods=['GET', 'POST'])
@login_required
def handle_users():
    # Authorization check: Only Admins can GET all users or POST new users
    current_user_id = session.get('user_id')
    requesting_user = db.session.get(User, current_user_id)
    if not requesting_user or requesting_user.role != 'Administrator':
         return jsonify({"error": "Permission denied"}), 403

    if request.method == 'POST':
        data = request.get_json()
        required_fields = ['name', 'username', 'password', 'role', 'email'] # Added email
        if not all(k in data and data[k] for k in required_fields):
            return jsonify({'error': f'Missing required fields: {required_fields}'}), 400

        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 409
        if User.query.filter_by(email=data['email']).first():
             return jsonify({'error': 'Email already exists'}), 409

        if data['role'] not in PERMISSIONS:
             return jsonify({'error': 'Invalid role specified'}), 400

        new_user = User(
            name=data['name'],
            username=data['username'],
            role=data['role'],
            email=data['email'],
            avatar=f"https://i.pravatar.cc/50?u={random.randint(10,10000)}" # Placeholder avatar
        )
        new_user.set_password(data['password'])
        new_user.set_pin('1234') # Default PIN

        try:
            db.session.add(new_user)
            db.session.commit()
            print(f"[USER] New user created: {new_user.username} by {requesting_user.username}")
            return jsonify(new_user.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error creating user: {e}")
            return jsonify({"error": "Failed to create user"}), 500

    # GET request
    users = User.query.order_by(User.id).all()
    return jsonify([user.to_dict() for user in users])

# ... (Keep /api/users/<int:user_id> PUT endpoint as it is) ...
# ... (Keep /api/user/pin PUT endpoint as it is) ...
# ... (Keep /api/user/preferences PUT endpoint as it is) ...
# ... (Keep /api/users/<int:user_id>/status PUT endpoint as it is) ...
# --- REMOVE /api/users/<int:user_id>/pin PUT endpoint (duplicate of /api/user/pin) ---

@app.route('/api/live_data', methods=['GET'])
@login_required
def get_live_data():
    """Returns the current state of the CIP system simulation."""
    state = cip_system.get_state()
    # Format state slightly for frontend consistency if needed
    formatted_state = {
        "state": state.get("cycle_status", "Idle"),
        "elapsed": state.get("elapsed_time", 0),
        "step_index": state.get("current_step_index", -1),
        "step_name": state.get("current_step_name", "N/A"),
        "progress_percent": state.get("total_progress_percent", 0),
        "tanks": { # Match frontend expected structure
            "caustic": {
                "level": state.get("tank_levels", {}).get("caustic_tank"),
                "temperature": state.get("tank_levels", {}).get("caustic_temp"),
                "concentration": 2.0 # Placeholder - needs actual sensor/calculation
            },
             "hot_water": {
                "level": state.get("tank_levels", {}).get("hot_water_tank"),
                "temperature": state.get("tank_levels", {}).get("hot_water_temp")
            },
             "recovery": {
                "level": state.get("tank_levels", {}).get("recovery_tank"),
                "temperature": state.get("tank_levels", {}).get("recovery_temp"),
                "tds": 150 # Placeholder
            },
             "fresh": {
                "level": state.get("tank_levels", {}).get("fresh_water_tank"),
                "temperature": state.get("tank_levels", {}).get("fresh_temp")
            }
        },
        "live_params": state.get("live_parameters", {}), # Include raw params too
        "alarms": state.get("active_alarms", [])
    }
    return jsonify(formatted_state)

# --- Consolidated Cycle Control Endpoint ---
@app.route('/api/cycle_control', methods=['POST'])
@login_required
def cycle_control():
    data = request.get_json()
    action = data.get('action')

    # Authorization Check (Example: Operators can control, QA cannot)
    user = db.session.get(User, session['user_id'])
    if not user or not PERMISSIONS.get(user.role, {}).get('cycleControl', False):
         if action == 'stop': # Allow anyone to stop? Or specific roles?
              pass # Allow stop for now, adjust if needed
         else:
              return jsonify({"error": "Permission denied to control cycle"}), 403

    if action == 'start' or action == 'resume':
        message, status_code = cip_system.start_cycle()
    elif action == 'pause':
        message, status_code = cip_system.pause_cycle()
    elif action == 'stop':
        message, status_code = cip_system.stop_cycle()
    else:
        return jsonify({"error": "Invalid action"}), 400

    return jsonify(message), status_code

# --- REMOVED: Separate cycle endpoints (/api/cycle/start, /pause, /stop, /resume) ---

# ... (Keep /api/export_data GET endpoint as it is) ...

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email_or_username = data.get('email') # Frontend sends email, but we might lookup by username too
    if not email_or_username:
        return jsonify({"error": "Email or username required"}), 400

    # Find user by email OR username (more flexible)
    user = User.query.filter((User.email == email_or_username) | (User.username == email_or_username)).first()

    if not user:
        print(f"[AUTH] Password reset requested for non-existent user/email: {email_or_username}")
        # Still return success message for security
        return jsonify({"message": "If an account exists, a reset link has been sent."}), 200

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expiration = datetime.utcnow() + timedelta(hours=1)
    db.session.commit()

    # ⭐ MODIFIED: Update reset link to point to React frontend default port
    reset_link = f"http://localhost:5173/?reset_token={token}" # ASSUMING React runs on 5173

    msg = Message('Password Reset Request', recipients=[user.email]) # Use user's actual email
    msg.body = f'''Hello {user.name},

To reset your password, visit the following link:
{reset_link}

This link will expire in one hour. If you did not request this, please ignore this email.
'''
    try:
        # mail.send(msg) # Uncomment when MAIL settings are configured
        # --- SIMULATION ---
        print("\n" + "="*50)
        print("--- PASSWORD RESET SIMULATION ---")
        print(f"Reset requested for user: '{user.username}' (Email: {user.email})")
        print("Email sending is currently disabled/not configured.")
        print("Copy and paste this link into your browser:")
        print(f"\n{reset_link}\n")
        print("="*50 + "\n")
        # --- END SIMULATION ---
        print(f"[AUTH] Password reset link generated for user: {user.username}")
    except Exception as e:
        print(f"Error sending password reset email for {user.username}: {e}")
        # Don't tell the user the email failed, just return the standard message
        # You might want more robust error logging here

    return jsonify({"message": "If an account exists, a reset link has been sent."}), 200

# ... (Keep /api/reset-password POST endpoint as it is) ...
# ... (Keep CLI commands init-db) ...
# ... (Keep Security Headers @after_request) ...
# ... (Keep Error Handlers @errorhandler) ...

# --- Run App ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all() # Create tables if they don't exist
        # Check if default admin exists, if not, offer to init-db?
        if not User.query.filter_by(username='admin').first():
             print("\n[WARNING] Default admin user not found.")
             print("Run 'flask init-db' to create default users and reset the database.")

    print("\n" + "="*60)
    print("CIP Dashboard Backend Server")
    print("="*60)
    print(f"Mode: {'DEBUG' if app.debug else 'PRODUCTION'}")
    print(f"Database: {app.config['SQLALCHEMY_DATABASE_URI']}")
    print(f"Session Type: {app.config['SESSION_TYPE']}")
    print(f"Allowed Origins: {app.config.get('CORS_ORIGINS', 'Not Set')}") # Show CORS origins
    print("Server starting on: http://127.0.0.1:5000")
    print("="*60 + "\n")

    # Use debug=True for development, False for simulation thread stability
    # use_reloader=False prevents Flask from restarting on code change,
    # which is often needed if you have background threads like the simulation.
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)