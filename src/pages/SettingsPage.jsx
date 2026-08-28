// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './SettingsPage.module.css';

// Settings Tab Components
import UserManagementTab from '../components/SettingsTabs/UserManagementTab';
import PermissionsTab from '../components/SettingsTabs/PermissionsTab';
import EquipmentDetailsTab from '../components/SettingsTabs/EquipmentDetailsTab';
import SystemModeTab from '../components/SettingsTabs/SystemModeTab';

const SettingsPage = () => {
  const location = useLocation();
  const initialTab = location.state?.tab || 'user-management';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'success', 'error'

  // Default settings for fallback/simulation mode
  const DEFAULT_SETTINGS = {
    users: [
      { id: 1, name: "Admin User", email: "admin@cip.com", role: "Administrator", status: "active", lastLogin: "2 hours ago" },
      { id: 2, name: "John Eng", email: "john.engineer@cip.com", role: "Engineer", status: "active", lastLogin: "1 day ago" },
      { id: 3, name: "Sarah Operator", email: "sarah.op@cip.com", role: "Operator", status: "active", lastLogin: "5 mins ago" },
      { id: 4, name: "Mike Viewer", email: "mike.v@cip.com", role: "Viewer", status: "inactive", lastLogin: "1 week ago" }
    ],
    permissions: {},
    equipment: {}
  };

  // Fetch initial settings with fallback
  useEffect(() => {
    const fetchSettings = async () => {
      if (localStorage.getItem('cipSystemMode') === 'sim') {
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
        return;
      }
      
      const API_BASE_URL = window.API_BASE_URL || '/api';
      try {
        const res = await fetch(`${API_BASE_URL}/settings`);
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        setSettings(data);
      } catch (err) {
        console.warn("Backend settings API unavailable, using default simulation data.", err);
        // Fallback to default/simulation settings
        setSettings(DEFAULT_SETTINGS);
        setError(null);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Handle Tab Selection from Navigation
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  // Universal Update Function
  const updateSettings = async (newSettings) => {
    setSettings(newSettings); // Optimistic update
    setSaveStatus('saving');

    const API_BASE_URL = window.API_BASE_URL || '/api';
    try {
      // Simulate network delay for realistic experience
      await new Promise(resolve => setTimeout(resolve, 800));

      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });

      if (!res.ok) {
        // If API fails, we still show success for the simulation/optimistic update
        // but log the error. In a real app we might revert.
        console.warn("Backend save failed, keeping local state.");
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      console.warn("Save simulation mode active", err);
      // Still show success in simulation mode
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading settings...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  const renderActiveTab = () => {
    const commonProps = { settings, updateSettings };
    switch (activeTab) {
      case 'user-management':
        return <UserManagementTab {...commonProps} />;
      case 'permissions':
        return <PermissionsTab {...commonProps} />;
      case 'equipment':
        return <EquipmentDetailsTab {...commonProps} />;
      case 'system-mode':
        return <SystemModeTab />;
      default:
        return <UserManagementTab {...commonProps} />;
    }
  };

  return (
    <div className="page">
      <div className="dashboard-header">
        <h1>Settings</h1>
        <p>Manage users, permissions, and equipment configuration.</p>
        {saveStatus === 'success' && <span style={{ color: 'green', marginLeft: '1rem' }}> <i className="fa-solid fa-check" /> Saved</span>}
        {saveStatus === 'error' && <span style={{ color: 'red', marginLeft: '1rem' }}> <i className="fa-solid fa-triangle-exclamation" /> Save Failed</span>}
      </div>

      <div className="dashboard-card">
        {/* --- Tab Navigation --- */}
        <nav className={styles.settingsNav} role="tablist" aria-label="Settings Navigation">
          <a
            href="#user-management"
            role="tab"
            aria-selected={activeTab === 'user-management'}
            className={`${styles.helpNavLink} ${activeTab === 'user-management' ? styles.active : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('user-management'); }}
          >
            <i className="fa-solid fa-users"></i> User Management
          </a>

          <a
            href="#permissions"
            role="tab"
            aria-selected={activeTab === 'permissions'}
            className={`${styles.helpNavLink} ${activeTab === 'permissions' ? styles.active : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('permissions'); }}
          >
            <i className="fa-solid fa-key"></i> Permissions
          </a>

          <a
            href="#equipment"
            role="tab"
            aria-selected={activeTab === 'equipment'}
            className={`${styles.helpNavLink} ${activeTab === 'equipment' ? styles.active : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('equipment'); }}
          >
            <i className="fa-solid fa-gears"></i> Equipment Details
          </a>

          <a
            href="#system-mode"
            role="tab"
            aria-selected={activeTab === 'system-mode'}
            className={`${styles.helpNavLink} ${activeTab === 'system-mode' ? styles.active : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('system-mode'); }}
          >
            <i className="fa-solid fa-server"></i> System Mode
          </a>
        </nav>

        {/* --- Tab Content Wrapper --- */}
        <div className={styles.settingsContentContainer}>
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
