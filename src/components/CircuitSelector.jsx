// src/components/CircuitSelector.jsx
import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function CircuitSelector({ className = '' }) {
  const { circuit, setCircuit } = useAppContext();

  return (
    <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
      <label htmlFor="circuit-select" style={{ fontWeight: 500, color: 'var(--text-primary, #333)' }}>Circuit:</label>
      <select
        id="circuit-select"
        value={circuit}
        onChange={(e) => setCircuit(e.target.value)}
        style={{
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px solid var(--border-color, #ccc)',
          backgroundColor: 'var(--card-bg, white)',
          color: 'var(--text-primary, black)',
          cursor: 'pointer',
          fontSize: '14px'
        }}
        aria-label="Select circuit"
      >
        <option value="A">Circuit A</option>
        <option value="B">Circuit B</option>
      </select>
    </div>
  );
}
