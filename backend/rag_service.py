import os
import re
import requests
from datetime import datetime

class DataRetrievalService:
    def __init__(self):
        self.api_base = "http://localhost:8080/api"
        print("✅ DataRetrievalService: Initialized - Full control & data retrieval enabled.")
        
    def query(self, question, system_state_str="Normal Operation", api_base_url=None):
        """
        Professional data retrieval & control system.
        Returns formatted response with optional command tags.
        """
        if api_base_url:
            self.api_base = api_base_url
            
        question_lower = question.lower()
        
        # === THEME CONTROL ===
        if any(phrase in question_lower for phrase in ["dark mode", "dark theme", "enable dark"]):
            return "Switching to dark mode... [THEME:dark]"
        
        if any(phrase in question_lower for phrase in ["light mode", "light theme", "enable light"]):
            return "Switching to light mode... [THEME:light]"
        
        if "toggle theme" in question_lower or "switch theme" in question_lower:
            return "Toggling theme... [THEME:toggle]"
        
        # === CYCLE CONTROL ===
        if any(phrase in question_lower for phrase in ["start cycle", "begin cycle", "start cleaning"]):
            return "Starting CIP cycle... [CYCLE:start]"
        
        if any(phrase in question_lower for phrase in ["stop cycle", "halt cycle", "end cycle"]):
            return "Stopping cycle... [CYCLE:stop]"
        
        if "pause cycle" in question_lower:
            return "Pausing cycle... [CYCLE:pause]"
        
        if "resume cycle" in question_lower:
            return "Resuming cycle... [CYCLE:resume]"
        
        # === CIRCUIT CONTROL ===
        if "circuit a" in question_lower or "switch to a" in question_lower:
            return "Switching to Circuit A... [CIRCUIT:A]"
        
        if "circuit b" in question_lower or "switch to b" in question_lower:
            return "Switching to Circuit B... [CIRCUIT:B]"
        
        # === LIVE DATA QUERIES ===
        if any(word in question_lower for word in ["temperature", "temp"]):
            return self._get_temperature_data()
        
        if "pressure" in question_lower:
            return self._get_pressure_data()
        
        if any(word in question_lower for word in ["flow", "flow rate"]):
            return self._get_flow_data()
        
        if any(word in question_lower for word in ["tank", "level"]):
            return self._get_tank_levels()
        
        if any(word in question_lower for word in ["ph", "conductivity"]):
            return self._get_quality_params()
        
        if any(word in question_lower for word in ["sensor", "all data", "all parameters"]):
            return self._get_all_sensors()
        
        # === ALARM QUERIES ===
        if "alarm" in question_lower and "navigate" not in question_lower:
            if "active" in question_lower or "current" in question_lower:
                return self._get_active_alarms()
            elif "history" in question_lower:
                return self._get_alarm_history()
            elif "critical" in question_lower:
                return self._get_critical_alarms()
            else:
                return self._get_active_alarms()
        
        # === CYCLE QUERIES ===
        if any(word in question_lower for word in ["cycle", "step", "progress"]) and "control" not in question_lower:
            return self._get_cycle_status()
        
        # === EXPORT COMMANDS ===
        if "export" in question_lower or "download" in question_lower:
            if "alarm" in question_lower:
                return "Generating alarm report... [EXPORT:alarms]"
            elif "cycle" in question_lower:
                return "Generating cycle log... [EXPORT:cycle]"
            else:
                return "Generating trend data... [EXPORT:trends]"
        
        # === NAVIGATION ===
        if "go to" in question_lower or "navigate" in question_lower or "open" in question_lower:
            if "alarm" in question_lower:
                return "Opening Alarms page... [NAVIGATE:/alarms]"
            elif "dashboard" in question_lower:
                return "Opening Dashboard... [NAVIGATE:/dashboard]"
            elif "monitor" in question_lower:
                return "Opening Monitoring... [NAVIGATE:/monitoring]"
            elif "analytic" in question_lower or "chart" in question_lower:
                return "Opening Analytics... [NAVIGATE:/analytics]"
            elif "setting" in question_lower:
                return "Opening Settings... [NAVIGATE:/settings]"
            elif "help" in question_lower:
                return "Opening Help... [NAVIGATE:/help]"
            elif "profile" in question_lower:
                return "Opening Profile... [NAVIGATE:/profile]"
            elif "setpoint" in question_lower:
                return "Opening Setpoints... [NAVIGATE:/setpoints]"
            elif "diagnostic" in question_lower:
                return "Opening AI Diagnostics... [NAVIGATE:/ai-diagnostics]"
        
        # === GENERAL STATUS ===
        if "status" in question_lower or "state" in question_lower:
            return f"📊 **System Status**\n{system_state_str}"
        
        # === GREETINGS ===
        if any(word in question_lower for word in ["hello", "hi", "hey"]):
            return "🦆 **Honk! I'm Goose Assistant**\n\nI can help you:\n• **Control**: Theme, cycles, circuits\n• **Query**: Live data, alarms, status\n• **Export**: Reports and trends\n• **Navigate**: Any dashboard page"
        
        # === HELP ===
        if "help" in question_lower and "go" not in question_lower:
            return "💡 **Available Commands**\n\n**Control:**\n• 'Switch to dark mode'\n• 'Start cycle'\n• 'Switch to circuit A'\n\n**Data:**\n• 'What's the temperature?'\n• 'Show active alarms'\n• 'Cycle status'\n\n**Export:**\n• 'Download alarm report'"
        
        # === FALLBACK ===
        return "I can help with:\n• **Control**: 'Switch to dark mode', 'Start cycle'\n• **Data**: 'What's the temperature?', 'Show alarms'\n• **Navigate**: 'Go to analytics'\n\nTry asking me something!"
    
    def _fetch_api(self, endpoint):
        """Helper to fetch from API with error handling"""
        try:
            response = requests.get(f"{self.api_base}{endpoint}", timeout=2)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"API Error: {e}")
            return None
    
    def _format_value(self, value, decimals=1):
        """Format numeric values consistently"""
        try:
            if isinstance(value, (int, float)):
                return f"{value:.{decimals}f}"
            return str(value)
        except:
            return "N/A"
    
    def _get_temperature_data(self):
        """Get current temperature readings with professional formatting"""
        data = self._fetch_api("/iih/tags")
        if data and "tags" in data:
            temps = [t for t in data["tags"] if "temperature" in t["name"].lower()]
            if temps:
                result = "🌡️ **Temperature Readings**\n"
                for tag in temps[:3]:
                    val_data = self._fetch_api(f"/iih/tags/{tag['id']}/current")
                    if val_data:
                        value = self._format_value(val_data['value'], 1)
                        result += f"• {tag['description']}: **{value}** {tag.get('unit', '°C')}\n"
                return result.strip()
        return "⚠️ Temperature data currently unavailable."
    
    def _get_pressure_data(self):
        """Get current pressure readings"""
        data = self._fetch_api("/iih/tags")
        if data and "tags" in data:
            pressures = [t for t in data["tags"] if "pressure" in t["name"].lower()]
            if pressures:
                result = "⚙️ **Pressure Readings**\n"
                for tag in pressures[:2]:
                    val_data = self._fetch_api(f"/iih/tags/{tag['id']}/current")
                    if val_data:
                        value = self._format_value(val_data['value'], 2)
                        result += f"• {tag['description']}: **{value}** {tag.get('unit', 'bar')}\n"
                return result.strip()
        return "⚠️ Pressure data currently unavailable."
    
    def _get_flow_data(self):
        """Get flow rate data"""
        data = self._fetch_api("/iih/tags")
        if data and "tags" in data:
            flows = [t for t in data["tags"] if "flow" in t["name"].lower()]
            if flows:
                result = "💧 **Flow Readings**\n"
                for tag in flows[:2]:
                    val_data = self._fetch_api(f"/iih/tags/{tag['id']}/current")
                    if val_data:
                        value = self._format_value(val_data['value'], 1)
                        result += f"• {tag['description']}: **{value}** {tag.get('unit', 'L/min')}\n"
                return result.strip()
        return "⚠️ Flow data currently unavailable."
    
    def _get_tank_levels(self):
        """Get all tank level data"""
        data = self._fetch_api("/iih/tags")
        if data and "tags" in data:
            tanks = [t for t in data["tags"] if "level" in t["name"].lower() or "tank" in t["name"].lower()]
            if tanks:
                result = "🛢️ **Tank Levels**\n"
                for tag in tanks[:4]:
                    val_data = self._fetch_api(f"/iih/tags/{tag['id']}/current")
                    if val_data:
                        value = self._format_value(val_data['value'], 0)
                        status = "✅" if float(value) > 50 else "⚠️"
                        result += f"{status} {tag['description']}: **{value}%**\n"
                return result.strip()
        return "⚠️ Tank level data currently unavailable."
    
    def _get_quality_params(self):
        """Get pH and conductivity"""
        data = self._fetch_api("/iih/tags")
        if data and "tags" in data:
            quality = [t for t in data["tags"] if any(x in t["name"].lower() for x in ["ph", "conductivity"])]
            if quality:
                result = "🧪 **Quality Parameters**\n"
                for tag in quality:
                    val_data = self._fetch_api(f"/iih/tags/{tag['id']}/current")
                    if val_data:
                        value = self._format_value(val_data['value'], 1)
                        result += f"• {tag['description']}: **{value}** {tag.get('unit', '')}\n"
                return result.strip()
        return "⚠️ Quality parameter data currently unavailable."
    
    def _get_all_sensors(self):
        """Get summary of all sensor data"""
        data = self._fetch_api("/iih/tags")
        if data and "tags" in data:
            result = "📡 **All Sensor Data**\n\n"
            for tag in data["tags"][:8]:
                val_data = self._fetch_api(f"/iih/tags/{tag['id']}/current")
                if val_data:
                    value = self._format_value(val_data['value'])
                    result += f"• {tag['name']}: **{value}** {tag.get('unit', '')}\n"
            return result.strip()
        return "⚠️ Sensor data currently unavailable."
    
    def _get_active_alarms(self):
        """Get active alarms"""
        data = self._fetch_api("/iih/alarms/active")
        if data and "alarms" in data:
            alarms = data["alarms"]
            if not alarms:
                return "✅ **No Active Alarms**\n\nSystem operating normally."
            
            result = f"🚨 **Active Alarms** ({len(alarms)})\n\n"
            for alarm in alarms[:5]:
                severity_emoji = "🔴" if alarm.get("severity") == "Critical" else "🟡"
                result += f"{severity_emoji} **{alarm.get('tag')}**\n   {alarm.get('message')}\n"
            return result.strip()
        return "⚠️ Unable to retrieve alarm data."
    
    def _get_alarm_history(self):
        """Get recent alarm history"""
        data = self._fetch_api("/iih/alarms/history?limit=5")
        if data and "alarms" in data:
            alarms = data["alarms"]
            if not alarms:
                return "📋 No alarm history available."
            
            result = f"📋 **Recent Alarms** ({len(alarms)})\n\n"
            for alarm in alarms:
                result += f"• {alarm.get('tag')}: {alarm.get('message')}\n   Status: {alarm.get('status', 'N/A')}\n"
            return result.strip()
        return "⚠️ Unable to retrieve alarm history."
    
    def _get_critical_alarms(self):
        """Get only critical alarms"""
        data = self._fetch_api("/iih/alarms/active")
        if data and "alarms" in data:
            critical = [a for a in data["alarms"] if a.get("severity") == "Critical"]
            if not critical:
                return "✅ **No Critical Alarms**\n\nAll systems nominal."
            
            result = f"🔴 **Critical Alarms** ({len(critical)})\n\n"
            for alarm in critical:
                result += f"• **{alarm.get('tag')}**\n   {alarm.get('message')}\n"
            return result.strip()
        return "⚠️ Unable to retrieve critical alarms."
    
    def _get_cycle_status(self):
        """Get current cycle status and progress"""
        data = self._fetch_api("/cycle/status")
        if data:
            status = data.get("status", "Unknown")
            step_name = "N/A"
            progress = 0
            time_remaining = 0
            
            if "steps" in data and "current_step" in data:
                current_idx = data.get("current_step", 0)
                if 0 <= current_idx < len(data["steps"]):
                    step_name = data["steps"][current_idx].get("name", "N/A")
            
            progress = data.get("progress_percent", 0)
            time_remaining = data.get("time_remaining", 0)
            
            status_emoji = "🔄" if status.lower() == "running" else "⏸️" if status.lower() == "paused" else "⏹️"
            
            result = f"{status_emoji} **Cycle Status**\n\n"
            result += f"• Status: **{status.upper()}**\n"
            result += f"• Current Step: **{step_name}**\n"
            result += f"• Progress: **{progress:.0f}%**\n"
            result += f"• Time Remaining: **{time_remaining // 60}min {time_remaining % 60}s**"
            return result
        return "⚠️ Unable to retrieve cycle status."

# Singleton instance
rag_service = DataRetrievalService()
