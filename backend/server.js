/**
 * CIP Dashboard Backend — server.js
 * ===================================
 * Phase 1 (NOW):   DATA_SOURCE=simulation  → generates realistic CIP data in-process
 * Phase 2 (LATER): DATA_SOURCE=iih         → proxies every request to IIH Essentials
 *
 * The dashboard calls identical endpoints either way — zero frontend changes needed.
 */

'use strict';
const express = require('express');
const cors    = require('cors');
const http    = require('http');

const app  = express();
app.use(cors());
app.use(express.json());

const PORT        = process.env.PORT        || 3000;
const DATA_SOURCE = process.env.DATA_SOURCE || 'simulation';   // 'simulation' | 'iih'
const IIH_BASE    = process.env.IIH_BASE_URL || 'http://edgeappdataservice:4203';
const DATABUS_URL = process.env.DATABUS_URL  || 'mqtt://ie-databus:1883';
const DB_USER     = process.env.DATABUS_USER || 'Edge@123';
const DB_PASS     = process.env.DATABUS_PASS || 'edge@123';

console.log(`[CIP Backend] Starting in DATA_SOURCE="${DATA_SOURCE}" mode`);
console.log(`[CIP Backend] PORT=${PORT} | IIH=${IIH_BASE} | MQTT=${DATABUS_URL}`);

// ─── MQTT publish (optional — publishes sim data to IE Databus) ──────────────
let mqttClient = null;
try {
    const mqtt = require('mqtt');
    mqttClient = mqtt.connect(DATABUS_URL, {
        username: DB_USER,
        password: DB_PASS,
        reconnectPeriod: 5000,
        connectTimeout: 10000
    });
    mqttClient.on('connect', () => console.log('[CIP Backend] MQTT connected to IE Databus'));
    mqttClient.on('error',   (e) => console.warn('[CIP Backend] MQTT error (non-fatal):', e.message));
} catch (e) {
    console.warn('[CIP Backend] MQTT module not available — skipping Databus publish');
}

// ─── CIP Process Simulation State ────────────────────────────────────────────
const CIP_STEPS = [
    { name: 'Pre-Rinse',           duration: 600  },
    { name: 'Caustic Wash',        duration: 1800 },
    { name: 'Intermediate Rinse',  duration: 600  },
    { name: 'Acid Wash',           duration: 1200 },
    { name: 'Final Rinse',         duration: 600  },
    { name: 'Dry / Complete',       duration: 300  }
];
const TOTAL_DURATION = CIP_STEPS.reduce((a, b) => a + b.duration, 0);

const state = {
    Tank1_Temperature : 55.0,
    Temp_Setpoint     : 75.0,
    Main_Pressure     : 2.5,
    Flow_Rate         : 150.0,
    Conductivity      : 20.0,
    pH_Level          : 7.5,
    Caustic_Level     : 80.0,
    Caustic_Conc      : 2.0,
    Water_Level       : 90.0,
    Pump1_Speed       : 80.0,
    Pump2_Speed       : 80.0,
    System_Running    : true,
    HotWater_Level    : 85.0,
    HotWater_Temp     : 78.0,
    Recovery_Level    : 40.0,
    Recovery_Temp     : 58.0,
    Recovery_TDS      : 150.0,
    Fresh_Level       : 95.0,
    Fresh_Temp        : 22.0,
    Water_Usage       : 0.0,
    tick              : 0,
    activeAlarms      : [],
    alarmHistory      : []
};

const rnd  = (lo, hi) => lo + Math.random() * (hi - lo);
const bump = (v, lo, hi, d) => Math.min(hi, Math.max(lo, v + rnd(-d, d)));
const r2   = (n) => parseFloat(n.toFixed(2));

function getStepForTick(tick) {
    const elapsed = (tick * 2) % TOTAL_DURATION;
    let acc = 0;
    for (let i = 0; i < CIP_STEPS.length; i++) {
        acc += CIP_STEPS[i].duration;
        if (elapsed < acc) {
            return {
                stepIndex       : i,
                stepName        : CIP_STEPS[i].name,
                progressPercent : r2((elapsed / TOTAL_DURATION) * 100),
                timeRemaining   : TOTAL_DURATION - elapsed
            };
        }
    }
    return { stepIndex: 0, stepName: CIP_STEPS[0].name, progressPercent: 0, timeRemaining: TOTAL_DURATION };
}

function tick() {
    if (DATA_SOURCE !== 'simulation') return;   // IIH mode — no simulation needed

    state.tick += 1;

    if (state.System_Running) {
        // Temperature climbs toward setpoint
        const diff = state.Temp_Setpoint - state.Tank1_Temperature;
        state.Tank1_Temperature = r2(state.Tank1_Temperature + (diff > 0 ? 0.4 : -0.2) + rnd(-0.15, 0.15));

        state.Main_Pressure = r2(bump(state.Main_Pressure, 2.2, 2.8, 0.05));
        state.Flow_Rate     = r2(bump(state.Flow_Rate,     130, 170, 3));
        state.Pump1_Speed   = r2(bump(state.Pump1_Speed,    75,  90, 1));
        state.Pump2_Speed   = r2(bump(state.Pump2_Speed,    75,  90, 1));
        state.Water_Usage   = r2(Math.min(999, state.Water_Usage + (state.Flow_Rate / 60) * 2));

        state.Caustic_Level  = r2(Math.max(10, state.Caustic_Level  - 0.04));
        state.HotWater_Level = r2(Math.max(10, state.HotWater_Level - 0.03));
        state.Fresh_Level    = r2(Math.max(10, state.Fresh_Level    - 0.03));
        state.Recovery_Level = r2(Math.min(90, state.Recovery_Level + 0.03));
        state.Water_Level    = r2(Math.max(10, state.Water_Level    - 0.05));
    } else {
        state.Pump1_Speed       = 0;
        state.Pump2_Speed       = 0;
        state.Flow_Rate         = 0;
        state.Main_Pressure     = 0;
        state.Tank1_Temperature = r2(Math.max(20, state.Tank1_Temperature - 0.1));
    }

    state.Conductivity  = r2(bump(state.Conductivity,  18,  24, 0.5));
    state.pH_Level      = r2(bump(state.pH_Level,      7.2, 7.8, 0.05));
    state.Caustic_Conc  = r2(bump(state.Caustic_Conc,  1.8, 2.2, 0.02));
    state.HotWater_Temp = r2(bump(state.HotWater_Temp, 72,  84, 0.2));
    state.Recovery_Temp = r2(bump(state.Recovery_Temp, 52,  66, 0.2));
    state.Recovery_TDS  = r2(bump(state.Recovery_TDS, 100, 200, 1));
    state.Fresh_Temp    = r2(bump(state.Fresh_Temp,    18,  25, 0.1));

    // Automatically fluctuate any newly discovered tags (like OEE UUIDs) by +/- 5%
    const excludeKeys = ['Tank1_Temperature', 'Temp_Setpoint', 'Main_Pressure', 'Flow_Rate', 'Conductivity', 'pH_Level', 'Caustic_Level', 'Caustic_Conc', 'Water_Level', 'Pump1_Speed', 'Pump2_Speed', 'System_Running', 'HotWater_Level', 'HotWater_Temp', 'Recovery_Level', 'Recovery_Temp', 'Recovery_TDS', 'Fresh_Level', 'Fresh_Temp', 'Water_Usage', 'tick', 'activeAlarms', 'alarmHistory'];
    Object.keys(state).forEach(key => {
        if (!excludeKeys.includes(key) && typeof state[key] === 'number') {
            // Keep STATE variables exactly at 1
            if (['22cbbdb4-a0aa-47a1-a2de-674ff0f4e3f9', '4b840a04-8e9f-4c71-85e5-e36e2cbbfec3', '7df4e631-b2bd-4739-b311-e8707f18d330', '868ddaba-5a20-4989-933f-7b79bf4dbf2a', 'b76fbc50-4889-496b-add8-783bf92842d5', 'e26d71fd-d592-4e07-a93a-319bd4801a0a'].includes(key)) {
                return;
            }
            state[key] = r2(bump(state[key], state[key] * 0.95, state[key] * 1.05, state[key] * 0.05));
        }
    });

    // ── Alarm logic ──────────────────────────────────────────────────────────
    const newAlarms = [];
    if (state.Tank1_Temperature > 85)
        newAlarms.push({ id:'ALM-T01', device:'Tank 1',      message:'Temperature critical high (>85°C)', severity:'Critical', status:'Pending', timestamp: new Date().toISOString() });
    else if (state.Tank1_Temperature > 80)
        newAlarms.push({ id:'ALM-T02', device:'Tank 1',      message:'Temperature warning (>80°C)',       severity:'Warning',  status:'Pending', timestamp: new Date().toISOString() });
    if (state.Caustic_Level < 20)
        newAlarms.push({ id:'ALM-C01', device:'Caustic Tank', message:'Caustic level low (<20%)',          severity:'Warning',  status:'Pending', timestamp: new Date().toISOString() });
    if (state.Main_Pressure > 2.75)
        newAlarms.push({ id:'ALM-P01', device:'Main Line',    message:'Pressure high (>2.75 bar)',         severity:'Warning',  status:'Pending', timestamp: new Date().toISOString() });
    if (state.pH_Level < 7.0 || state.pH_Level > 7.8)
        newAlarms.push({ id:'ALM-PH01', device:'Caustic Tank', message:'pH out of range',                  severity:'Info',     status:'Pending', timestamp: new Date().toISOString() });

    // Resolved alarms move to history
    const prevIds = new Set(newAlarms.map(a => a.id));
    state.activeAlarms.forEach(a => {
        if (!prevIds.has(a.id)) {
            state.alarmHistory.unshift({ ...a, status: 'Resolved', resolvedAt: new Date().toISOString() });
        }
    });
    if (state.alarmHistory.length > 100) state.alarmHistory = state.alarmHistory.slice(0, 100);
    state.activeAlarms = newAlarms;

    // Publish to IE Databus
    if (mqttClient && mqttClient.connected) {
        mqttClient.publish('ie/m/j/sim/dp/cip_data', JSON.stringify({ ...state, timestamp: new Date().toISOString() }));
    }
}

// Run simulation tick every 2 seconds
if (DATA_SOURCE === 'simulation') {
    setInterval(tick, 2000);
    tick(); // Run immediately
}

// ─── TAG REGISTRY ─────────────────────────────────────────────────────────────
const TAG_REGISTRY = [
    { id: 'Tank1_Temperature', name: 'Tank1_Temperature', unit: '°C',    description: 'Caustic tank temperature' },
    { id: 'Temp_Setpoint',     name: 'Temp_Setpoint',     unit: '°C',    description: 'Temperature setpoint' },
    { id: 'Main_Pressure',     name: 'Main_Pressure',     unit: 'bar',   description: 'Main line pressure' },
    { id: 'Flow_Rate',         name: 'Flow_Rate',          unit: 'L/min', description: 'CIP flow rate' },
    { id: 'Conductivity',      name: 'Conductivity',       unit: 'mS/cm', description: 'Solution conductivity' },
    { id: 'pH_Level',          name: 'pH_Level',           unit: 'pH',    description: 'pH level' },
    { id: 'Caustic_Level',     name: 'Caustic_Level',      unit: '%',     description: 'Caustic tank level' },
    { id: 'Caustic_Conc',      name: 'Caustic_Conc',       unit: '%',     description: 'Caustic concentration' },
    { id: 'Water_Level',       name: 'Water_Level',        unit: '%',     description: 'Water tank level' },
    { id: 'Pump1_Speed',       name: 'Pump1_Speed',        unit: 'RPM',   description: 'Pump 1 speed' },
    { id: 'Pump2_Speed',       name: 'Pump2_Speed',        unit: 'RPM',   description: 'Pump 2 speed' },
    { id: 'System_Running',    name: 'System_Running',     unit: 'bool',  description: 'System running flag' },
    { id: 'HotWater_Level',    name: 'HotWater_Level',     unit: '%',     description: 'Hot water tank level' },
    { id: 'HotWater_Temp',     name: 'HotWater_Temp',      unit: '°C',    description: 'Hot water temperature' },
    { id: 'Recovery_Level',    name: 'Recovery_Level',     unit: '%',     description: 'Recovery tank level' },
    { id: 'Recovery_Temp',     name: 'Recovery_Temp',      unit: '°C',    description: 'Recovery tank temperature' },
    { id: 'Recovery_TDS',      name: 'Recovery_TDS',       unit: 'ppm',   description: 'Recovery tank TDS' },
    { id: 'Fresh_Level',       name: 'Fresh_Level',        unit: '%',     description: 'Fresh water tank level' },
    { id: 'Fresh_Temp',        name: 'Fresh_Temp',         unit: '°C',    description: 'Fresh water temperature' },
    { id: 'Water_Usage',       name: 'Water_Usage',        unit: 'L',     description: 'Total water usage' }
];

// ─── IIH PROXY HELPER ─────────────────────────────────────────────────────────
/**
 * When DATA_SOURCE=iih, forward every request to IIH Essentials.
 * Usage: await iihProxy(req, res, '/DataService/Data?...');
 */
async function iihProxy(res, iihPath, options = {}) {
    return new Promise((resolve, reject) => {
        const url = `${IIH_BASE}${iihPath}`;
        const reqOpts = {
            method: options.method || 'GET',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        };
        const proxyReq = http.request(url, reqOpts, (proxyRes) => {
            let body = '';
            proxyRes.on('data', d => body += d);
            proxyRes.on('end', () => {
                try {
                    res.status(proxyRes.statusCode).json(JSON.parse(body));
                } catch (e) {
                    res.status(500).json({ error: 'IIH response parse error', raw: body });
                }
                resolve();
            });
        });
        proxyReq.on('error', (e) => {
            res.status(502).json({ error: 'Cannot reach IIH Essentials', details: e.message });
            resolve();
        });
        if (options.body) proxyReq.write(JSON.stringify(options.body));
        proxyReq.end();
    });
}

// ─── API ROUTES ───────────────────────────────────────────────────────────────

// GET /iih/DataService/Data — Raw IIH proxy endpoint for Dashboard pages
app.get('/iih/DataService/Data', async (req, res) => {
    if (DATA_SOURCE === 'iih') {
        const query = req.url.substring(req.path.length);
        await iihProxy(res, `/DataService/Data${query}`);
    } else {
        const variableIds = (req.query.variableIds || '').split(',').filter(Boolean);
        const response = variableIds.map(id => {
            if (state[id] === undefined) {
                // Initialize unknown UI tags realistically
                if (['22cbbdb4-a0aa-47a1-a2de-674ff0f4e3f9', '4b840a04-8e9f-4c71-85e5-e36e2cbbfec3', '7df4e631-b2bd-4739-b311-e8707f18d330', '868ddaba-5a20-4989-933f-7b79bf4dbf2a', 'b76fbc50-4889-496b-add8-783bf92842d5', 'e26d71fd-d592-4e07-a93a-319bd4801a0a'].includes(id)) {
                    state[id] = 1; // Machine STATE = Running
                } else {
                    state[id] = r2(75 + Math.random() * 20); // 75-95 range
                }
            }
            return {
                variableId: id,
                values: [{ timestamp: new Date().toISOString(), value: state[id], qualityCode: "Good" }]
            };
        });
        res.json(response);
    }
});

// GET /iih/DataService/Variables
app.get('/iih/DataService/Variables', async (req, res) => {
    if (DATA_SOURCE === 'iih') {
        await iihProxy(res, '/DataService/Variables');
    } else {
        res.json(TAG_REGISTRY); // return mock registry
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', mode: DATA_SOURCE, timestamp: new Date().toISOString() });
});

// GET /api/iih/tags — tag discovery
app.get('/api/iih/tags', async (req, res) => {
    if (DATA_SOURCE === 'iih') {
        // IIH mode: forward to IIH Essentials DataService
        await iihProxy(res, '/DataService/Variables');
    } else {
        // Simulation mode: return fixed registry
        res.json({ tags: TAG_REGISTRY });
    }
});

// POST /api/iih/tags/current — bulk current values
app.post('/api/iih/tags/current', async (req, res) => {
    const tagIds = req.body?.tagIds || [];

    if (DATA_SOURCE === 'iih') {
        const ids = tagIds.join(',');
        await iihProxy(res, `/DataService/Data?variableIds=${encodeURIComponent(ids)}`);
    } else {
        const values = tagIds.map(id => ({
            id,
            name      : id,
            value     : state[id] !== undefined ? state[id] : null,
            quality   : 'Good',
            timestamp : new Date().toISOString()
        }));
        res.json({ values, timestamp: new Date().toISOString() });
    }
});

// GET /api/iih/tags/:tagId/current — single tag
app.get('/api/iih/tags/:tagId/current', async (req, res) => {
    const id = decodeURIComponent(req.params.tagId);
    if (DATA_SOURCE === 'iih') {
        await iihProxy(res, `/DataService/Data?variableIds=${encodeURIComponent(id)}`);
    } else {
        res.json({ id, name: id, value: state[id] ?? null, quality: 'Good', timestamp: new Date().toISOString() });
    }
});

// GET /api/iih/tags/:tagId/history — historical trend data
app.get('/api/iih/tags/:tagId/history', async (req, res) => {
    const id = decodeURIComponent(req.params.tagId);
    if (DATA_SOURCE === 'iih') {
        const { startTime, endTime, interval } = req.query;
        await iihProxy(res, `/DataService/Data?variableIds=${encodeURIComponent(id)}&from=${startTime}&to=${endTime}&cycle=${interval || 60}`);
    } else {
        // Generate 30-point simulated history
        const base  = state[id] || 0;
        const now   = Date.now();
        const values = Array.from({ length: 30 }, (_, i) => ({
            timestamp : new Date(now - (30 - i) * 60000).toISOString(),
            value     : r2(base + rnd(-5, 5))
        }));
        res.json({ id, values });
    }
});

// GET /api/iih/alarms/active
app.get('/api/iih/alarms/active', async (req, res) => {
    if (DATA_SOURCE === 'iih') {
        await iihProxy(res, '/DataService/Alarms?status=active');
    } else {
        res.json({ alarms: state.activeAlarms });
    }
});

// GET /api/iih/alarms/history
app.get('/api/iih/alarms/history', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    if (DATA_SOURCE === 'iih') {
        await iihProxy(res, `/DataService/Alarms?limit=${limit}`);
    } else {
        res.json({ alarms: state.alarmHistory.slice(0, limit) });
    }
});

// POST /api/iih/alarms/:id/acknowledge
app.post('/api/iih/alarms/:alarmId/acknowledge', (req, res) => {
    const { alarmId } = req.params;
    const alarm = state.activeAlarms.find(a => a.id === alarmId);
    if (alarm) {
        const acked = { ...alarm, status: 'Acknowledged', acknowledgedAt: new Date().toISOString() };
        state.activeAlarms = state.activeAlarms.filter(a => a.id !== alarmId);
        state.alarmHistory.unshift(acked);
    }
    res.json({ success: true });
});

// GET /api/cycle/status
app.get('/api/cycle/status', (req, res) => {
    const step = getStepForTick(state.tick);
    res.json({
        status           : state.System_Running ? 'running' : 'idle',
        current_step     : step.stepIndex,
        progress_percent : step.progressPercent,
        time_remaining   : step.timeRemaining,
        steps            : CIP_STEPS
    });
});

// POST /api/cycle/control
app.post('/api/cycle/control', (req, res) => {
    const { action } = req.body;
    if      (action === 'start')  state.System_Running = true;
    else if (action === 'stop')   state.System_Running = false;
    else if (action === 'pause')  state.System_Running = false;
    else if (action === 'resume') state.System_Running = true;
    res.json({ success: true, action, running: state.System_Running });
});

// POST /api/chat — Goose Assistant Mock Endpoint
app.post('/api/chat', (req, res) => {
    const { message, context } = req.body;
    const msg = (message || '').toLowerCase();
    
    let answer = "Honk! I am not sure about that. Try asking me about 'cost', 'alarms', 'status', or ask me to navigate somewhere!";
    let actions = [];

    if (msg.includes('cost') || msg.includes('price')) {
        answer = "The average cost per cycle is roughly **$12.50**. This varies based on water and chemical usage.";
    } else if (msg.includes('water') || msg.includes('energy') || msg.includes('chemical')) {
        answer = "Resource usage is currently operating within optimal parameters. No significant waste detected.";
    } else if (msg.includes('temperature') || msg.includes('temp') || msg.includes('trend')) {
        answer = "Here is the temperature trend for the current cycle. [NAVIGATE:/analytics]";
    } else if (msg.includes('pressure') || msg.includes('flow')) {
        answer = "Flow and pressure are stable. [NAVIGATE:/analytics]";
    } else if (msg.includes('status') || msg.includes('running')) {
        answer = `The system is currently ${state.System_Running ? '**Running**' : '**Idle**'}. The main tank is at ${state.Tank1_Temperature}°C.`;
    } else if (msg.includes('equipment') || msg.includes('pump') || msg.includes('tank')) {
        answer = "All main tanks and pumps are functioning normally. Predictive maintenance shows 42 days remaining useful life for the main pump. [NAVIGATE:/ai-diagnostics]";
    } else if (msg.includes('ai') || msg.includes('model') || msg.includes('diagnostics')) {
        answer = "I have 6 active AI models monitoring Failure Risk, Cycle Health, Resources, Maintenance, Recipe Optimization, and Sensor Drift. [NAVIGATE:/ai-diagnostics]";
    } else if (msg.includes('alarm') || msg.includes('alert')) {
        const active = state.activeAlarms.length;
        if (active > 0) {
            answer = `There are currently **${active} active alarms**. Please check the Alarms page immediately! [NAVIGATE:/alarms]`;
        } else {
            answer = "There are zero active alarms. Everything is green! [NAVIGATE:/alarms]";
        }
    } else if (msg.includes('go to')) {
        if (msg.includes('ai') || msg.includes('diagnostic')) answer = "Navigating to AI Diagnostics... [NAVIGATE:/ai-diagnostics]";
        else if (msg.includes('analytic') || msg.includes('chart')) answer = "Navigating to Analytics... [NAVIGATE:/analytics]";
        else if (msg.includes('alarm')) answer = "Navigating to Alarms... [NAVIGATE:/alarms]";
        else if (msg.includes('setting')) answer = "Navigating to Settings... [NAVIGATE:/settings]";
        else answer = "Navigating to Dashboard... [NAVIGATE:/dashboard]";
    } else if (msg.includes('export')) {
        answer = "I'm preparing the export for you right now. [EXPORT:csv]";
    } else if (msg.includes('theme') || msg.includes('dark') || msg.includes('light')) {
        answer = "Adjusting the theme! [THEME:toggle]";
    }

    res.json({ answer, actions });
});

// POST /api/export/trends — Goose Assistant Export Endpoint
app.post('/api/export/trends', (req, res) => {
    // Generate a simple CSV mock
    const csvData = "timestamp,value\n2026-07-23T10:00:00Z,20.5\n2026-07-23T10:01:00Z,21.0\n";
    res.json({
        success: true,
        filename: 'cip_trends_export.csv',
        data: csvData
    });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`[CIP Backend] Listening on :${PORT} | mode=${DATA_SOURCE}`);
    console.log(`[CIP Backend] To switch to IIH: set DATA_SOURCE=iih in docker-compose`);
});
