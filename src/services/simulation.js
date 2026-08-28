// src/services/simulation.js

class CIPSimulator {
    constructor() {
        this.interval = null;
        this.isRunning = false;

        // Base Tag Values
        this.tags = {
            'Tank1_Temperature': 75.0,
            'Temp_Setpoint': 75.0,
            'Main_Pressure': 2.5,
            'Flow_Rate': 120.0,
            'Conductivity': 15.2,
            'pH_Level': 11.5,
            'Caustic_Level': 80.0,
            'Water_Level': 90.0,
            'Water_Usage': 250.0,
            'Pump1_Speed': 1450,
            'Pump2_Speed': 1400,
            'System_Running': true,
            'Caustic_Conc': 2.5,
            'HotWater_Level': 70.0,
            'HotWater_Temp': 80.0,
            'Recovery_Level': 40.0,
            'Recovery_Temp': 65.0,
            'Recovery_TDS': 500,
            'Fresh_Level': 95.0,
            'Fresh_Temp': 20.0
        };

        this.cycleState = {
            state: 'Running',
            currentStepName: 'Caustic Wash',
            progressPercent: 45,
            elapsedTime: 15 * 60
        };

        this.alarms = [];
        this.lastUpdateTime = Date.now();
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.interval = setInterval(() => this.tick(), 2000);
    }

    stop() {
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    tick() {
        const now = Date.now();
        const dt = (now - this.lastUpdateTime) / 1000; // seconds
        this.lastUpdateTime = now;

        // Random walk for tags
        const walk = (val, maxChange, min, max) => {
            let newVal = val + (Math.random() - 0.5) * maxChange;
            if (typeof min !== 'undefined') newVal = Math.max(min, newVal);
            if (typeof max !== 'undefined') newVal = Math.min(max, newVal);
            return newVal;
        };

        this.tags.Tank1_Temperature = walk(this.tags.Tank1_Temperature, 0.5, 60, 90);
        this.tags.Main_Pressure = walk(this.tags.Main_Pressure, 0.1, 1.5, 3.5);
        this.tags.Flow_Rate = walk(this.tags.Flow_Rate, 5, 50, 200);
        this.tags.Conductivity = walk(this.tags.Conductivity, 0.2, 5, 25);
        this.tags.pH_Level = walk(this.tags.pH_Level, 0.05, 6, 14);
        
        // Cycle Progress
        if (this.tags.System_Running) {
            this.cycleState.elapsedTime += dt;
            this.tags.Water_Usage += (dt * 1.5); // Add water usage (1.5 L/s)
            
            this.cycleState.progressPercent += (dt / 10); // faster cycle for demo
            if (this.cycleState.progressPercent >= 100) {
                this.cycleState.progressPercent = 0;
            }

            // Update phases based on progress
            const p = this.cycleState.progressPercent;
            if (p < 20) this.cycleState.currentStepName = 'Pre-Rinse';
            else if (p < 50) this.cycleState.currentStepName = 'Caustic Wash';
            else if (p < 70) this.cycleState.currentStepName = 'Intermediate Rinse';
            else if (p < 90) this.cycleState.currentStepName = 'Acid Wash';
            else this.cycleState.currentStepName = 'Final Rinse';
        }

        // Random alarms occasionally
        if (Math.random() < 0.01 && this.alarms.length < 3) {
            this.alarms.push({
                id: `sim-alarm-${Date.now()}`,
                message: 'Simulated Deviation Detected',
                severity: Math.random() > 0.5 ? 'critical' : 'warning',
                timestamp: new Date().toISOString()
            });
        }
    }

    getTagsDefinition() {
        return Object.keys(this.tags).map(key => ({
            id: `ns=sim;s=${key}`,
            name: key,
            type: typeof this.tags[key] === 'boolean' ? 'Boolean' : 'Float'
        }));
    }

    getMultipleTagValues(tagIds) {
        // If tagIds is empty or not provided, return all tags
        const idsToFetch = (!tagIds || tagIds.length === 0) 
            ? Object.keys(this.tags).map(k => `ns=sim;s=${k}`) 
            : tagIds;
            
        const values = idsToFetch.map(id => {
            const name = id.replace('ns=sim;s=', '');
            return {
                id,
                name,
                value: this.tags[name] !== undefined ? this.tags[name] : null
            };
        });

        return {
            values,
            timestamp: new Date().toISOString()
        };
    }
    
    getTagHistory(tagId, options = {}) {
        // Generate fake historical points
        const points = 30;
        const data = [];
        const now = Date.now();
        const name = tagId.replace('ns=sim;s=', '');
        const baseVal = this.tags[name] || 50;
        
        for (let i = 0; i < points; i++) {
            const time = new Date(now - (points - i) * 60000);
            data.push({
                timestamp: time.toISOString(),
                value: baseVal + (Math.random() - 0.5) * 5
            });
        }
        
        return {
            tagId,
            history: data
        };
    }

    getActiveAlarms() {
        return { alarms: this.alarms };
    }
    
    getAlarmHistory() {
        return { history: this.alarms };
    }
    
    getCycleStatus() {
        return this.cycleState;
    }
    
    acknowledgeAlarm(alarmId) {
        this.alarms = this.alarms.filter(a => a.id !== alarmId);
        return { success: true };
    }
}

// Singleton instance
export const simulator = new CIPSimulator();
// Start immediately for sim mode
if (typeof window !== 'undefined') {
    simulator.start();
}
