// src/pages/HelpPage.jsx
import React, { useState, useMemo } from 'react';
import styles from './HelpPage.module.css';

const HelpPage = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const NAV_GROUPS = [
    {
      title: 'Essentials',
      links: [
        { id: 'overview', label: 'System Overview', icon: 'fa-solid fa-layer-group' },
        { id: 'components', label: 'Key Components', icon: 'fa-solid fa-cubes' },
        { id: 'safety', label: 'Safety Protocols', icon: 'fa-solid fa-shield-heart' },
      ]
    },
    {
      title: 'Operator Guides',
      links: [
        { id: 'sop', label: 'SOP & Cycles', icon: 'fa-solid fa-list-check' },
        { id: 'dashboard', label: 'Dashboard Walkthrough', icon: 'fa-solid fa-desktop' },
      ]
    },
    {
      title: 'Support',
      links: [
        { id: 'troubleshooting', label: 'Troubleshooting', icon: 'fa-solid fa-screwdriver-wrench' },
        { id: 'faq', label: 'FAQ', icon: 'fa-regular fa-circle-question' },
        { id: 'glossary', label: 'Glossary', icon: 'fa-solid fa-book-open' },
      ]
    }
  ];

  const handleNavClick = (e, id) => {
    e.preventDefault();
    setActiveSection(id);

    // Mobile scroll to content
    if (window.innerWidth < 1024) {
      document.getElementById('mainCtx')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filter logic for search
  const isVisible = (text) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className={styles.helpPageContainer}>
      {/* LEFT SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.searchContainer}>
          <i className={`fa-solid fa-magnifying-glass ${styles.searchIcon}`} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <nav>
          {NAV_GROUPS.map((group, idx) => (
            <div key={idx} className={styles.navGroup}>
              <h4>{group.title}</h4>
              <div className={styles.navLinks}>
                {group.links.map(link => (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    className={`${styles.navLink} ${activeSection === link.id ? styles.active : ''}`}
                    onClick={(e) => handleNavClick(e, link.id)}
                  >
                    <i className={link.icon} />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* RIGHT CONTENT */}
      <main id="mainCtx" className={styles.mainContent}>

        {/* 1. OVERVIEW */}
        {(activeSection === 'overview' || searchQuery) && isVisible('Overview CIP TACT') && (
          <section className={styles.sectionHeader}>
            <h2><i className="fa-solid fa-layer-group" style={{ color: '#3b82f6' }} /> System Overview</h2>
            <p>Understanding the core principles of Clean-in-Place (CIP) technology.</p>

            <div className={styles.gridTwo}>
              <article className={styles.infoCard}>
                <h3><i className="fa-solid fa-check" /> Why CIP?</h3>
                <ul>
                  <li><strong>Consistent Hygiene:</strong> Automated cycles ensure identical cleaning every time.</li>
                  <li><strong>Safety:</strong> Reduces operator exposure to strong chemicals and heat.</li>
                  <li><strong>Efficiency:</strong> Recovers water and chemicals for subsequent reuse.</li>
                </ul>
              </article>
              <article className={styles.infoCard}>
                <h3><i className="fa-solid fa-flask" /> The T.A.C.T. Principle</h3>
                <ul>
                  <li><strong>Time:</strong> Duration of contact with soiled surfaces.</li>
                  <li><strong>Action:</strong> Mechanical force (turbulence) from flow velocity.</li>
                  <li><strong>Chemical:</strong> Concentration of detergent (Caustic/Acid).</li>
                  <li><strong>Temperature:</strong> Heat energy accelerates cleaning action.</li>
                </ul>
              </article>
            </div>
          </section>
        )}

        {/* 2. COMPONENTS */}
        {(activeSection === 'components' || searchQuery) && isVisible('Components Valves Pumps Tanks') && (
          <section>
            <div className={styles.sectionHeader}>
              <h2><i className="fa-solid fa-cubes" style={{ color: '#8b5cf6' }} /> Key Components</h2>
            </div>
            <ul className={styles.featuresList}>
              <li><strong>Supply Pump:</strong> Delivers cleaning solution at high velocity to the circuit.</li>
              <li><strong>Heat Exchanger (HX):</strong> Heats the solution to the required setpoint (e.g., 80°C for Caustic).</li>
              <li><strong>Dosing Pumps:</strong> Inject precise amounts of chemical concentrate.</li>
              <li><strong>Conductivity Sensors:</strong> Measure chemical concentration and rinse purity.</li>
              <li><strong>Proximity Sensors:</strong> Confirm flow-plate connections for safety.</li>
            </ul>
          </section>
        )}

        {/* 3. SAFETY */}
        {(activeSection === 'safety' || searchQuery) && isVisible('Safety PPE Hazard Lockout') && (
          <section>
            <div className={styles.sectionHeader}>
              <h2><i className="fa-solid fa-shield-heart" style={{ color: '#ef4444' }} /> Safety Protocols</h2>
            </div>
            <div className={`${styles.callout} ${styles.warning}`}>
              <i className="fa-solid fa-triangle-exclamation" />
              <div className={styles.calloutContent}>
                <strong>Critical Warning</strong>
                Always verify that the CIP circuit is physically complete before starting a cycle. Opening a valve on an incomplete line can cause hazardous chemical spills.
              </div>
            </div>
            <div className={styles.gridTwo}>
              <article className={styles.infoCard}>
                <h3>Mandatory PPE</h3>
                <ul>
                  <li>Chemical-resistant gloves</li>
                  <li>Safety goggles / Face shield</li>
                  <li>Protective footwear</li>
                </ul>
              </article>
              <article className={styles.infoCard}>
                <h3>Emergency Procedures</h3>
                <ul>
                  <li><strong>E-Stop:</strong> Press immediately in case of leak or injury.</li>
                  <li><strong>Spill:</strong> Neutralize acid/caustic spills before washing down.</li>
                </ul>
              </article>
            </div>
          </section>
        )}

        {/* 4. SOP */}
        {(activeSection === 'sop' || searchQuery) && isVisible('SOP Steps Recipes') && (
          <section>
            <div className={styles.sectionHeader}>
              <h2><i className="fa-solid fa-list-check" style={{ color: '#10b981' }} /> Standard Operating Procedure</h2>
            </div>

            <details className={styles.details} open>
              <summary>Step 1: Pre-Start Inspection</summary>
              <div className={styles.detailsContent}>
                Ensure all utilities (Steam, Air, Water) are available. Check chemical tank levels. Verify the manual swing-panel connections match the intended circuit.
              </div>
            </details>

            <details className={styles.details}>
              <summary>Step 2: Recipe Selection</summary>
              <div className={styles.detailsContent}>
                Select the appropriate recipe (e.g., "Tank A - Heavy Soil"). Review the parameters (Time, Temp, Conc) on the dashboard before confirming.
              </div>
            </details>

            <details className={styles.details}>
              <summary>Step 3: Cycle Monitoring</summary>
              <div className={styles.detailsContent}>
                Monitor the "Cycle Progress" bar. Watch for "Return Flow" alarms. Do not walk away from the HMI during critical transitions (e.g., Heating).
              </div>
            </details>
          </section>
        )}

        {/* 5. DASHBOARD GUIDE */}
        {(activeSection === 'dashboard' || searchQuery) && isVisible('Dashboard HMI Charts AI') && (
          <section>
            <div className={styles.sectionHeader}>
              <h2><i className="fa-solid fa-desktop" style={{ color: '#f59e0b' }} /> Dashboard Guide</h2>
            </div>
            <div className={styles.gridTwo}>
              <div className={styles.infoCard}>
                <h3>Overview Widget</h3>
                <p>The top-left cards show the <strong>System Status</strong> (Idle/Running) and current <strong>OEE Efficiency</strong>.</p>
              </div>
              <div className={styles.infoCard}>
                <h3>Cycle Control</h3>
                <p>Start, Pause, and Abort buttons are located in the <strong>Cycle Progress</strong> panel. Requires secure login.</p>
              </div>
              <div className={styles.infoCard}>
                <h3>AI Diagnostics</h3>
                <p>New feature: Uses Machine Learning to predict flow anomalies. Watch for the <strong>Pulse Heartbeat</strong> icon.</p>
              </div>
              <div className={styles.infoCard}>
                <h3>Trends & Export</h3>
                <p>Click the ⚙️ icon on charts to export CSV data for quality compliance reports.</p>
              </div>
            </div>
          </section>
        )}

        {/* 6. TROUBLESHOOTING */}
        {(activeSection === 'troubleshooting' || searchQuery) && isVisible('Troubleshooting Error Fault') && (
          <section>
            <div className={styles.sectionHeader}>
              <h2><i className="fa-solid fa-screwdriver-wrench" style={{ color: '#64748b' }} /> Troubleshooting</h2>
            </div>
            <details className={styles.details}>
              <summary>Low Flow Alarm</summary>
              <div className={styles.detailsContent}>
                <strong>Cause:</strong> Blocked filter or valve failure.<br />
                <strong>Action:</strong> Check the strainer basket. Verify the supply pump capability.
              </div>
            </details>
            <details className={styles.details}>
              <summary>Temperature Timeout</summary>
              <div className={styles.detailsContent}>
                <strong>Cause:</strong> Steam failure or scaled Heat Exchanger.<br />
                <strong>Action:</strong> Check steam pressure. Inspect HX plates for fouling.
              </div>
            </details>
            <details className={styles.details}>
              <summary>Conductivity Low</summary>
              <div className={styles.detailsContent}>
                <strong>Cause:</strong> Empty chemical drum or dosing pump air-lock.<br />
                <strong>Action:</strong> Replenish chemical. Prime the dosing pump.
              </div>
            </details>
          </section>
        )}

        {/* 7. FAQ & GLOSSARY */}
        {(activeSection === 'faq' || activeSection === 'glossary' || searchQuery) && isVisible('FAQ Glossary Terms') && (
          <section>
            <div className={styles.sectionHeader}>
              <h2><i className="fa-regular fa-circle-question" style={{ color: '#8b5cf6' }} /> FAQ & Glossary</h2>
            </div>
            <div className={`${styles.callout} ${styles.tip}`}>
              <i className="fa-solid fa-lightbulb" />
              <div className={styles.calloutContent}>
                <strong>Pro Tip:</strong> Can't find what you need? Ask the <strong>AI Copilot</strong> in the bottom-right corner!
              </div>
            </div>
          </section>
        )}

      </main>
    </div>
  );
};

export default HelpPage;
