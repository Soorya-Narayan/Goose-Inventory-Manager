import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { parseHistoricCSV, saveHistoricData, getAvailableHistoricDates } from '../../utils/historicDataStore';

const SystemModeTab = () => {
  const { systemMode, setSystemMode, selectedHistoricDate, loadHistoricDataForDate, showToast } = useAppContext();
  
  const [availableDates, setAvailableDates] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setAvailableDates(getAvailableHistoricDates());
  }, []);

  const handleModeChange = (mode) => {
    setSystemMode(mode);
    showToast(`Switched to ${mode.toUpperCase()} mode`, 'success');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      const parsedData = parseHistoricCSV(text);
      const savedDates = saveHistoricData(parsedData);
      
      if (savedDates && savedDates.length > 0) {
        setAvailableDates(getAvailableHistoricDates());
        loadHistoricDataForDate(savedDates[0]);
        showToast(`Successfully loaded ${parsedData.length} records for ${savedDates.length} date(s).`, 'success');
      } else {
        showToast('No valid data found in CSV.', 'warning');
      }
    } catch (err) {
      showToast(err.message || 'Failed to parse CSV file.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDateSelect = (e) => {
    loadHistoricDataForDate(e.target.value);
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>System Mode Configuration</h2>
      
      {/* Mode Selector */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        {[
          { id: 'live', label: 'Live Mode', icon: 'fa-bolt', desc: 'Connect to real-time IIH backend' },
          { id: 'sim', label: 'Simulation Mode', icon: 'fa-satellite-dish', desc: 'Use local generated mock data' },
          { id: 'historic', label: 'Historic Mode', icon: 'fa-clock-rotate-left', desc: 'Visualize previously uploaded CSV data' }
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => handleModeChange(mode.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '20px',
              background: systemMode === mode.id ? 'var(--primary-blue)' : 'var(--card-bg)',
              color: systemMode === mode.id ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${systemMode === mode.id ? 'var(--primary-blue)' : 'var(--border-color)'}`,
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: systemMode === mode.id ? '0 8px 24px rgba(59,130,246,0.25)' : 'none'
            }}
          >
            <i className={`fa-solid ${mode.icon}`} style={{ fontSize: '1.5rem', color: systemMode === mode.id ? '#fff' : 'var(--text-primary)' }}></i>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: systemMode === mode.id ? '#fff' : 'var(--text-primary)' }}>{mode.label}</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8, textAlign: 'center' }}>{mode.desc}</span>
          </button>
        ))}
      </div>

      {/* Historic Mode Controls */}
      {systemMode === 'historic' && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>Historic Data Source</h3>
          
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Upload Area */}
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Upload New Data (CSV)
              </label>
              <div 
                style={{ 
                  border: '2px dashed var(--border-color)', 
                  borderRadius: '12px', 
                  padding: '32px 20px', 
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2rem', color: 'var(--primary-blue)', marginBottom: '12px' }}></i>
                <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>Click to browse CSV file</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Expects standard headers: timestamp, temperature, pressure...</p>
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={fileInputRef}
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </div>
            </div>

            {/* Date Selection */}
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  View Previously Uploaded Data
                </label>
                {availableDates.length > 0 && (
                  <button 
                    onClick={() => {
                      import('../../utils/historicDataStore').then(m => m.clearHistoricData());
                      setAvailableDates([]);
                      showToast('Cleared historic data from storage', 'success');
                    }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>
                    Clear All
                  </button>
                )}
              </div>
              {availableDates.length > 0 ? (
                <div style={{ position: 'relative' }}>
                  <i className="fa-solid fa-calendar" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}></i>
                  <select 
                    value={selectedHistoricDate || ''} 
                    onChange={handleDateSelect}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      appearance: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="" disabled>Select a date to visualize...</option>
                    {availableDates.map(date => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                  <i className="fa-solid fa-chevron-down" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}></i>
                </div>
              ) : (
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-circle-info"></i> No historic data available. Please upload a CSV file.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemModeTab;
