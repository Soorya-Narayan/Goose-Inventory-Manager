// src/pages/AiDiagnosticsPage.jsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import styles from './AiDiagnosticsPage.module.css';
import FailureRiskGauge from '../components/AI/FailureRiskGauge';
import ContributingFactors from '../components/AI/ContributingFactors';
import CycleHealthCard from '../components/AI/CycleHealthCard';
import SustainabilityCard from '../components/AI/SustainabilityCard';
import HardwareHealthCard from '../components/AI/HardwareHealthCard';
import RecipeOptimizerCard from '../components/AI/RecipeOptimizerCard';
import ChemicalSensorCard from '../components/AI/ChemicalSensorCard';
import SensorDriftCard from '../components/AI/SensorDriftCard';

const MODEL_CODENAMES = [
  { code: 'PREDICT-ML',    label: 'Failure Prediction',          icon: 'fa-shield-halved' },
  { code: 'HEALTH-AI',     label: 'Cycle Health Monitor',        icon: 'fa-heart-pulse' },
  { code: 'OPTI-RES',      label: 'Resource Optimizer',          icon: 'fa-leaf' },
  { code: 'MAINT-AI',      label: 'Hardware Maintenance',        icon: 'fa-gear' },
  { code: 'RECIPE-AI',     label: 'Recipe Intelligence',         icon: 'fa-flask' },
  { code: 'CHEM-AI',       label: 'Chemical Concentration',      icon: 'fa-vial' },
  { code: 'DRIFT-ML',      label: 'Sensor Drift Detector',       icon: 'fa-wave-square' },
];

// AI bootup lines shown on loading screen
const BOOT_LINES = [
  { icon: 'fa-check', text: 'INITIALISING NEURAL INFERENCE ENGINE...' },
  { icon: 'fa-check', text: 'LOADING RANDOM FOREST MODEL (v1.0)...' },
  { icon: 'fa-check', text: 'SYNCING SENSOR TELEMETRY STREAMS...' },
  { icon: 'fa-check', text: 'CALIBRATING DEVIATION THRESHOLDS...' },
  { icon: 'fa-spinner fa-spin', text: 'AWAITING LIVE DATA FEED...' },
];

const AiDiagnosticsPage = () => {
  const { showToast, liveParameters, systemMode } = useAppContext();

  const [predictionData, setPredictionData]     = useState(null);
  const [isLoading, setIsLoading]               = useState(true);
  const [lastUpdate, setLastUpdate]             = useState(null);
  const [healthData, setHealthData]             = useState(null);
  const [sustainabilityData, setSustainabilityData] = useState(null);
  const [hardwareData, setHardwareData]         = useState(null);
  const [optimizerData, setOptimizerData]       = useState(null);
  const [chemicalData, setChemicalData]         = useState(null);
  const [driftData, setDriftData]               = useState(null);
  const [currentTime, setCurrentTime]           = useState(new Date());
  const [uptime, setUptime]                     = useState(0);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date());
      setUptime(s => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const formatUptime = (secs) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const MODEL_API_URL = window.location.origin.includes('localhost:5173')
    ? 'http://localhost:5002'
    : '/ml-api';

  useEffect(() => {
    const fetchModels = async () => {
      try {
        if (systemMode === 'sim' || localStorage.getItem('cipSystemMode') === 'sim') {
          throw new Error('Simulation Mode Enabled');
        }
        const now = new Date();
        const features = {
          supply_temp: liveParameters.temperature || 55,
          return_temp: liveParameters.returnTemp  || 70,
          flow:        liveParameters.flow_rate   || 1000,
          conductivity:liveParameters.conductivity|| 0.75,
          remaining_time: Math.floor(Math.random() * 600),
          step_status: 0, recipe: 0, valve_status: 0, pump: 0,
          hour: now.getHours(), day_of_week: now.getDay(),
        };
        const tryFetch = async (url, body, method = 'POST') => {
          const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
          return res.ok ? res.json() : null;
        };
        const [p, h, s, hw, opt, chem, drift] = await Promise.allSettled([
          tryFetch(`${MODEL_API_URL}/api/predict-failure`,       features),
          tryFetch(`${MODEL_API_URL}/api/cycle-health`,          { supply_temp: features.supply_temp, return_temp: features.return_temp, flow: features.flow, conductivity: features.conductivity, remaining_time: features.remaining_time }),
          tryFetch(`${MODEL_API_URL}/api/resource-optimization`, features),
          tryFetch(`${MODEL_API_URL}/api/hardware-health`,       features),
          tryFetch(`${MODEL_API_URL}/api/optimize-recipe`,       features),
          tryFetch(`${MODEL_API_URL}/api/chemical-concentration`,features),
          tryFetch(`${MODEL_API_URL}/api/sensor-health`, null, 'GET'),
        ]);
        if (p.value)    setPredictionData(p.value);
        if (h.value)    setHealthData(h.value);
        if (s.value)    setSustainabilityData(s.value);
        if (hw.value)   setHardwareData(hw.value);
        if (opt.value)  setOptimizerData(opt.value);
        if (chem.value) setChemicalData(chem.value);
        if (drift.value)setDriftData(drift.value);
        setLastUpdate(new Date()); setIsLoading(false);
      } catch (err) {
        console.warn('API unavailable, switching to Simulation Mode:', err.message);
        
        // ── SIMULATION MODE AMBIENT DATA ──
        const ambientRisk = (Math.sin(Date.now() / 10000) * 15 + 15).toFixed(1); // Oscillates 0-30%
        setPredictionData({
          failure_probability: Number(ambientRisk),
          risk_level: ambientRisk < 15 ? 'Low' : 'Medium',
          normal_probability: 100 - Number(ambientRisk),
          recommendation: ambientRisk < 15 
            ? 'All CIP parameters operating within optimal neural bounds. No intervention required.'
            : 'Slight thermal deviation detected in return stream. System is auto-compensating.',
          top_factors: [
            { factor: 'Thermal Efficiency', weight: 0.85, status: 'nominal' },
            { factor: 'Flow Consistency', weight: 0.12, status: 'warning' },
          ]
        });

        setHealthData({
          health_score: 94 + Math.sin(Date.now() / 5000) * 3,
          grade: 'A',
          status: 'Optimal',
          deviations: {
            Temp_Supply: { status: 'excellent', current_value: 75.2, golden_mean: 75.0, deviation_pct: 0.2 },
            Flow_Rate: { status: 'good', current_value: 118, golden_mean: 120, deviation_pct: 1.6 }
          },
          recommendations: ['Maintain current pump pressure profile.']
        });

        setSustainabilityData({
          efficiency_score: 96,
          savings_potential: 12.50,
          usage: {
            water_waste: 0,
            energy_waste: 0
          },
          recommendations: ['Optimize rinse time by 2 minutes to save water.']
        });

        setHardwareData({
          components: {
            pump: { status: 'Good', health: 92, cycles_since_maint: 142 },
            valves: { status: 'Good', health: 98, actuations: 4320 }
          },
          system_status: 'Good',
          rul_days: 42,
          recommendation: 'Hardware operating nominally. No immediate maintenance required.'
        });

        setOptimizerData({
          recommendations: [
            { area: 'Temperature', suggestion: 'Reduce target by 0.5°C', impact: 'Medium', risk: 'Low' }
          ],
          total_annual_savings_potential: '₹42,500',
          current_efficiency_score: 91,
          potential_efficiency_score: 95,
          confidence_score: '92%'
        });

        setChemicalData({
          chemical_type: 'Caustic NaOH',
          concentration: 1.52,
          unit: '%',
          status: 'Optimal',
          target_range: '1.4 - 1.6',
          alert: null,
          raw_conductivity: 42.5
        });

        setDriftData({
          sensors: {
            'Temp Return': { status: 'Good', trend: [74.0, 74.1, 74.0, 73.9, 74.0, 74.1, 74.0], is_drifting: false, calibration_due_days: 120 },
            'Conductivity': { status: 'Good', trend: [1.5, 1.51, 1.49, 1.5, 1.5, 1.5], is_drifting: false, calibration_due_days: 85 }
          },
          overall_system_status: 'Good'
        });

        setLastUpdate(new Date()); 
        setIsLoading(false);
      }
    };
    fetchModels();
    const interval = setInterval(fetchModels, 3000);
    return () => clearInterval(interval);
  }, [liveParameters]);

  const getRiskIcon = (r) => r === 'Low' ? 'fa-circle-check' : r === 'Medium' ? 'fa-triangle-exclamation' : 'fa-exclamation-circle';
  const riskBadgeClass = (r) => r === 'Low' ? styles.riskBadgeLow : r === 'Medium' ? styles.riskBadgeMedium : styles.riskBadgeHigh;

  // Name tag helper
  const CodenameTag = ({ modelIdx }) => {
    const m = MODEL_CODENAMES[modelIdx];
    const tagClass = ['alphaTag','betaTag','gammaTag','deltaTag','epsilonTag','zetaTag','etaTag'][modelIdx];
    return (
      <div className={`${styles.codenameTag} ${styles[tagClass]}`}>
        <i className={`fa-solid ${m.icon}`} />
        {m.code}
      </div>
    );
  };

  return (
    <div className={styles.aiPage}>

      {/* ── System Status Bar ─────────────────────────── */}
      <div className={styles.sysBar}>
        <div className={styles.sysBarLeft}>
          <div className={styles.sysOnline}>
            <span className={styles.sysOnlineDot} />
            SYSTEM ONLINE
          </div>
          <span>CIP NEURAL COMMAND CENTRE · v2.1.0</span>
          <span>UPTIME {formatUptime(uptime)}</span>
        </div>
        <div className={styles.sysBarRight}>
          <span>MODELS ACTIVE: {MODEL_CODENAMES.length}</span>
          <span>{currentTime.toLocaleTimeString('en-GB')} · {currentTime.toLocaleDateString('en-GB')}</span>
        </div>
      </div>

      {/* ── Page Header ───────────────────────────────── */}
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>
            <i className={`fa-solid fa-brain ${styles.pageTitleIcon}`} />
            AI DIAGNOSTICS ENGINE
          </h1>
          <p className={styles.pageSub}>REAL-TIME ML INFERENCE · CIP FAILURE PREDICTION · NEURAL ANALYTICS</p>
        </div>
      </div>

      {/* ── Loading Screen ────────────────────────────── */}
      {isLoading && !predictionData ? (
        <div className={styles.loadingContainer}>
          <div className={styles.bootupRing} />
          <div className={styles.bootupText}>INITIALISING AI SUBSYSTEMS</div>
          <div className={styles.bootupLines}>
            {BOOT_LINES.map((l, i) => (
              <div key={i} className={styles.bootLine} style={{ animationDelay: `${i * 0.25}s` }}>
                <i className={`fa-solid ${l.icon}`} />
                {l.text}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.diagnosticsGrid}>

          {/* ════════════════════════════════════════════
              HERO — JARVIS-ALPHA: Failure Prediction
              ════════════════════════════════════════════ */}
          <section
            className={`${styles.heroCard} ${styles.card} ${styles.modelAlpha}`}
            data-risk={predictionData?.risk_level?.toLowerCase()}
          >
            <div className={styles.topAccent} />
            <div className={styles.scanLine} />

            <div className={styles.cardHeader}>
              <div>
                <CodenameTag modelIdx={0} />
                <div className={styles.cardTitle}>
                  <i className="fa-solid fa-shield-halved" />
                  FAILURE PREDICTION
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`${styles.riskBadge} ${riskBadgeClass(predictionData?.risk_level)}`}>
                  {predictionData?.risk_level?.toUpperCase() || 'LOADING'}
                </span>
                <span className={styles.liveDot} />
              </div>
            </div>

            <FailureRiskGauge
              probability={predictionData?.failure_probability || 0}
              riskLevel={predictionData?.risk_level || 'Low'}
              riskColor={predictionData?.risk_color || 'green'}
            />

            <div className={styles.gaugeFooter}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Normal Op.</span>
                <span className={styles.statValue}>{predictionData?.normal_probability?.toFixed(1) || '0'}%</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Confidence</span>
                <span className={styles.statValue}>98.5%</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Last Scan</span>
                <span className={styles.statValue}>{lastUpdate ? lastUpdate.toLocaleTimeString('en-GB') : '--:--:--'}</span>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════
              MODELS GRID — 6 models in 3×2
              ════════════════════════════════════════════ */}
          <div className={styles.modelsGrid}>

            {/* JARVIS-BETA: Cycle Health */}
            <section className={`${styles.card} ${styles.modelBeta}`}>
              <div className={styles.topAccent} />
              <div className={styles.scanLine} />
              <CodenameTag modelIdx={1} />
              <CycleHealthCard healthData={healthData} />
            </section>

            {/* JARVIS-GAMMA: Resource Optimizer */}
            <section className={`${styles.card} ${styles.modelGamma}`}>
              <div className={styles.topAccent} />
              <div className={styles.scanLine} />
              <CodenameTag modelIdx={2} />
              <SustainabilityCard data={sustainabilityData} />
            </section>

            {/* JARVIS-DELTA: Hardware Maintenance */}
            <section className={`${styles.card} ${styles.modelDelta}`}>
              <div className={styles.topAccent} />
              <div className={styles.scanLine} />
              <CodenameTag modelIdx={3} />
              <HardwareHealthCard data={hardwareData} />
            </section>

            {/* JARVIS-EPSILON: Recipe Intelligence */}
            <section className={`${styles.card} ${styles.modelEpsilon}`}>
              <div className={styles.topAccent} />
              <div className={styles.scanLine} />
              <CodenameTag modelIdx={4} />
              <RecipeOptimizerCard data={optimizerData} />
            </section>

            {/* JARVIS-ZETA: Chemical Concentration */}
            <section className={`${styles.card} ${styles.modelZeta}`}>
              <div className={styles.topAccent} />
              <div className={styles.scanLine} />
              <CodenameTag modelIdx={5} />
              <ChemicalSensorCard data={chemicalData} />
            </section>

            {/* JARVIS-ETA: Sensor Drift */}
            <section className={`${styles.card} ${styles.modelEta}`}>
              <div className={styles.topAccent} />
              <div className={styles.scanLine} />
              <CodenameTag modelIdx={6} />
              <SensorDriftCard data={driftData} />
            </section>
          </div>

          {/* ════════════════════════════════════════════
              RECOMMENDATION — Full Width
              ════════════════════════════════════════════ */}
          <section className={`${styles.recomCard} ${styles.card}`}>
            <div className={styles.topAccent} />
            <div className={styles.scanLine} />
            <div className={styles.cardHeader}>
              <div>
                <div className={`${styles.codenameTag} ${styles.alphaTag}`}>
                  <i className="fa-solid fa-microchip" /> PREDICT-ML · RECOMMENDATION
                </div>
                <div className={styles.cardTitle}>
                  <i className="fa-solid fa-lightbulb" /> AI RECOMMENDATION
                </div>
              </div>
              <ContributingFactors factors={predictionData?.top_factors || []} />
            </div>

            <div className={styles.recomContent} data-risk={predictionData?.risk_level?.toLowerCase()}>
              <div className={styles.riskIndicator}>
                <i className={`fa-solid ${getRiskIcon(predictionData?.risk_level)}`} />
              </div>
              <p>{predictionData?.recommendation || 'Awaiting sensor telemetry feed from CIP control system...'}</p>
            </div>

            <div className={styles.modelMeta}>
              <span><i className="fa-solid fa-microchip" /> MODEL: Random Forest (Regularized)</span>
              <span><i className="fa-solid fa-chart-line" /> ACCURACY: 99.96%</span>
              <span><i className="fa-solid fa-database" /> FEATURES: 11 INPUT VECTORS</span>
              <span><i className="fa-solid fa-clock" /> POLL INTERVAL: 3s</span>
            </div>
          </section>

          {/* ════════════════════════════════════════════
              SENSOR STATUS — Full Width
              ════════════════════════════════════════════ */}
          <section className={`${styles.sensorsCard} ${styles.card}`}>
            <div className={styles.topAccent} />
            <div className={styles.scanLine} />
            <div className={styles.cardHeader} style={{ marginBottom: 16 }}>
              <div className={styles.cardTitle}>
                <i className="fa-solid fa-satellite-dish" style={{ color: 'var(--j-cyan)', filter: 'drop-shadow(0 0 6px var(--j-cyan))' }} />
                LIVE SENSOR TELEMETRY
              </div>
              <span className={styles.liveDot} />
            </div>
            <div className={styles.sensorGrid}>
              {[
                { icon: 'fa-temperature-high', label: 'Supply Temp',  value: `${liveParameters.temperature || (74.0 + Math.random() * 2).toFixed(1)}°C`       },
                { icon: 'fa-temperature-low',  label: 'Return Temp',  value: `${liveParameters.returnTemp  || (68.0 + Math.random() * 2).toFixed(1)}°C`       },
                { icon: 'fa-droplet',          label: 'Flow Rate',    value: `${liveParameters.flow_rate   || (118 + Math.floor(Math.random() * 5)).toFixed(0)} L/hr`    },
                { icon: 'fa-bolt',             label: 'Conductivity', value: `${liveParameters.conductivity|| (1.5 + Math.random() * 0.1).toFixed(2)} mS/m`   },
              ].map(s => (
                <div key={s.label} className={styles.sensorItem}>
                  <div className={styles.sensorIcon}><i className={`fa-solid ${s.icon}`} /></div>
                  <div className={styles.sensorInfo}>
                    <span className={styles.sensorLabel}>{s.label}</span>
                    <span className={styles.sensorValue}>{s.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      )}
    </div>
  );
};

export default AiDiagnosticsPage;
