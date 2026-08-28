// src/pages/SetpointsPage.jsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
// removed: import { SETPOINTS_CONFIG } from '../context/mockData';
import styles from './SetpointsPage.module.css';

const SetpointsPage = () => {
  // Pull live config + saved values from AppContext
  const { showToast, saveSetpoints, currentSetpoints = {}, setpointsConfig = {} } = useAppContext();

  // Local state: built from setpointsConfig -> defaults, merged with currentSetpoints
  const [localSetpoints, setLocalSetpoints] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Helper: ensure setpointsConfig is a plain object before we call Object.entries()
  const configEntries = (setpointsConfig && typeof setpointsConfig === 'object' && !Array.isArray(setpointsConfig))
    ? Object.entries(setpointsConfig)
    : [];

  // Build defaults from setpointsConfig (expects same structure as old SETPOINTS_CONFIG)
  // setpointsConfig shape expected:
  // { GroupName: { icon: 'fa-...', params: [ { id, label, unit, value, step }, ... ] }, ... }
  useEffect(() => {
    const defaults = {};
    try {
      // iterate safely using configEntries (always an array)
      configEntries.forEach(([_, group]) => {
        const params = (group && Array.isArray(group.params)) ? group.params : [];
        params.forEach(param => {
          if (!param || !param.id) return;
          // use param.value as default (fall back to 0)
          defaults[param.id] = typeof param.value !== 'undefined' ? param.value : 0;
        });
      });
    } catch (err) {
      console.warn('Failed to build defaults from setpointsConfig', err);
    }

    // Merge server-provided currentSetpoints over defaults
    setLocalSetpoints(prev => {
      // If prev already has values and user typed/changed them, avoid overwriting unless config changed substantially.
      // For simplicity, we'll reset to merged defaults when setpointsConfig changes.
      return { ...defaults, ...(currentSetpoints || {}) };
    });

    // Reset change state because this is fresh config load
    setHasChanges(false);
  // Explicitly depend on setpointsConfig/currentSetpoints to rebuild when backend pushes config
  }, [/* use raw config object to trigger reloads */ setpointsConfig, currentSetpoints, /* eslint-disable-line react-hooks/exhaustive-deps */]);

  // Input handlers
  const handleInputChange = (id, value) => {
    // Allow empty string to show empty input, but store numeric 0 if empty when saving
    const parsed = value === '' ? '' : parseFloat(value);
    if (value === '' || !isNaN(parsed)) {
      setLocalSetpoints(prev => ({ ...prev, [id]: value === '' ? '' : parsed }));
      setHasChanges(true);
    }
  };

  const handleStepperClick = (id, operation, step) => {
    setLocalSetpoints(prev => {
      const currentValueRaw = prev[id];
      const currentValue = (currentValueRaw === '' || typeof currentValueRaw === 'undefined') ? 0 : Number(currentValueRaw);
      const stepValue = parseFloat(step) || 1;
      let newValue = operation === '+' ? currentValue + stepValue : currentValue - stepValue;
      if (newValue < 0) newValue = 0;
      const decimalPlaces = String(stepValue).includes('.') ? String(stepValue).split('.')[1].length : 0;
      newValue = parseFloat(newValue.toFixed(decimalPlaces));
      return { ...prev, [id]: newValue };
    });
    setHasChanges(true);
  };

  // Save handler
  const handleSave = async () => {
    // Prepare payload: convert any empty-string fields to 0 (or choose a better fallback if required)
    const payload = {};
    Object.keys(localSetpoints).forEach(k => {
      const v = localSetpoints[k];
      payload[k] = v === '' ? 0 : v;
    });

    setIsSaving(true);
    try {
      const result = await saveSetpoints(payload);
      if (result?.success) {
        setHasChanges(false);
        showToast('Setpoints saved successfully.', 'success');
      } else {
        // Context should show toast on error; add fallback
        showToast(result?.error || 'Failed to save setpoints.', 'error');
      }
    } catch (err) {
      console.error('Save setpoints error:', err);
      // Context typically shows a toast; fallback:
      showToast(err?.message || 'Failed to save setpoints.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // If there's no config yet, show helpful message
  const hasConfig = configEntries.length > 0;

  return (
    <div className="page">
      <div className="dashboard-header">
        <h1>System Setpoints</h1>
        <p>Modify standard operating parameters for the CIP cycle. (PIN Verified)</p>
      </div>

      {!hasConfig ? (
        <div className={styles.emptyState}>
          <p>No setpoints configuration is available yet. Please check that the backend has published `setpointsConfig`.</p>
        </div>
      ) : (
        <>
          <div className={styles.setpointsGrid}>
            {configEntries.map(([groupName, groupData]) => {
              const params = (groupData && Array.isArray(groupData.params)) ? groupData.params : [];
              return (
                <div key={groupName} className={styles.setpointCard}>
                  <h5><i className={`fa-solid ${groupData?.icon || 'fa-gear'}`}></i> {groupName}</h5>
                  {params.map(param => {
                    if (!param || !param.id) return null;
                    return (
                      <div key={param.id} className={styles.setpointItem}>
                        <label htmlFor={param.id}>{param.label} {param.unit ? `(${param.unit})` : ''}</label>
                        <div className={styles.inputStepper}>
                          <button
                            type="button"
                            className={styles.stepperBtn}
                            onClick={() => handleStepperClick(param.id, '-', param.step)}
                            aria-label={`Decrease ${param.label}`}
                          >-</button>

                          <input
                            type="number"
                            className={styles.stepperInput}
                            id={param.id}
                            value={localSetpoints[param.id] ?? ''}
                            step={param.step}
                            min="0"
                            onChange={(e) => handleInputChange(param.id, e.target.value)}
                          />

                          <button
                            type="button"
                            className={styles.stepperBtn}
                            onClick={() => handleStepperClick(param.id, '+', param.step)}
                            aria-label={`Increase ${param.label}`}
                          >+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className={styles.saveSetpointsContainer}>
            <button
              className="action-btn-primary"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              <i className="fa-solid fa-save" />
              {isSaving ? ' Saving...' : ' Save All Changes'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SetpointsPage;
