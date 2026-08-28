// src/components/Layout/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import styles from './Sidebar.module.css';
import logo from '/GOOSE_LOGO_TRANSPARENT..png';

const Sidebar = ({ onNavigate, collapsed }) => {
    const {
        currentUser,
        logout,
        isDarkTheme,
        toggleTheme,
    } = useAppContext();

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [liveUser, setLiveUser] = useState(null);

    // Fetch live user from settings
    useEffect(() => {
        const fetchLiveUser = async () => {
            try {
                const API_BASE_URL = window.API_BASE_URL || '/api';
                const res = await fetch(`${API_BASE_URL}/settings`);
                if (res.ok) {
                    const data = await res.json();
                    // Get the first admin user or first user in list
                    const activeUser = data.users?.find(u => u.role === 'Administrator') || data.users?.[0];
                    if (activeUser) setLiveUser(activeUser);
                }
            } catch (err) {
                console.error('Failed to fetch live user:', err);
            }
        };
        fetchLiveUser();
    }, []);

    // Get permissions with fallback - default to true for IIH mode
    const permissions = currentUser?.permissions || {
        viewDashboard: true,
        viewTrends: true,
        viewAnalytics: true,
        viewAlarms: true,
        viewHelp: true,
        accessSettings: true,
        manageUsers: true,
        ackAlarms: true,
    };

    const handleNavClick = () => {
        if (onNavigate) onNavigate();
    };

    const handleSettingsClick = (e) => {
        e.preventDefault();
        setSettingsOpen(!settingsOpen);
    };

    return (
        <nav className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`} id="sidebar">
            <div className={styles.sidebarHeader}>
                <div className={styles.logo}>
                    <img src={logo} alt="Logo" />
                </div>
            </div>

            <div className={styles.userProfile}>
                <img src={currentUser?.avatar || 'https://i.pravatar.cc/50'} alt="User Avatar" />
                <div className={styles.userDetails}>
                    <h4>
                        <NavLink to="/profile" onClick={handleNavClick}>
                            {liveUser?.name || currentUser?.name || 'Operator'}
                        </NavLink>
                    </h4>
                    <span>{liveUser?.role || currentUser?.role || 'Administrator'}</span>
                </div>

                {/* Theme Switcher */}
                <div className={styles.themeSwitcherWrapper}>
                    <label className={styles.themeSwitcher} htmlFor="theme-checkbox">
                        <input
                            type="checkbox"
                            id="theme-checkbox"
                            checked={isDarkTheme}
                            onChange={() => {
                                console.log('Theme toggle clicked!');
                                toggleTheme();
                            }}
                        />
                        <div className={`${styles.slider} ${styles.round}`}>
                            <i className={`fa-solid fa-sun ${styles.sunIcon}`}></i>
                            <i className={`fa-solid fa-moon ${styles.moonIcon}`}></i>
                        </div>
                    </label>
                </div>
            </div>

            <ul className={styles.sidebarNav}>
                {/* Dashboard */}
                <li className={styles.navItem}>
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) => isActive ? styles.active : ''}
                        onClick={handleNavClick}
                    >
                        <i className="fa-solid fa-table-columns"></i> <span>Dashboard</span>
                    </NavLink>
                </li>

                {/* Monitoring Trends */}
                <li className={styles.navItem}>
                    <NavLink
                        to="/monitoring"
                        className={({ isActive }) => isActive ? styles.active : ''}
                        onClick={handleNavClick}
                    >
                        <i className="fa-solid fa-chart-line"></i> <span>Monitoring Trends</span>
                    </NavLink>
                </li>

                {/* AI Diagnostics - Moved below Monitoring */}
                {permissions.viewDashboard && (
                    <li className={styles.navItem}>
                        <NavLink
                            to="/ai-diagnostics"
                            className={({ isActive }) => isActive ? styles.active : ''}
                            onClick={handleNavClick}
                        >
                            <i className="fa-solid fa-brain"></i> <span>AI Diagnostics</span>
                        </NavLink>
                    </li>
                )}

                {/* Reports */}
                <li className={styles.navItem}>
                    <NavLink
                        to="/reports"
                        className={({ isActive }) => isActive ? styles.active : ''}
                        onClick={handleNavClick}
                    >
                        <i className="fa-solid fa-file-contract"></i> <span>Reports</span>
                    </NavLink>
                </li>

                {/* Alarms */}
                <li className={styles.navItem}>
                    <NavLink
                        to="/alarms"
                        className={({ isActive }) => isActive ? styles.active : ''}
                        onClick={handleNavClick}
                    >
                        <i className="fa-solid fa-bell"></i> <span>Alarms & Notifications</span>
                    </NavLink>
                </li>

                {/* Analytics */}
                {permissions.viewAnalytics && (
                    <li className={styles.navItem}>
                        <NavLink
                            to="/analytics"
                            className={({ isActive }) => isActive ? styles.active : ''}
                            onClick={handleNavClick}
                        >
                            <i className="fa-solid fa-chart-bar"></i> <span>Analytics</span>
                        </NavLink>
                    </li>
                )}

                {/* Help */}
                <li className={styles.navItem}>
                    <NavLink
                        to="/help"
                        className={({ isActive }) => isActive ? styles.active : ''}
                        onClick={handleNavClick}
                    >
                        <i className="fa-solid fa-circle-question"></i> <span>Help</span>
                    </NavLink>
                </li>

                {/* Settings Submenu */}
                {permissions.accessSettings && (
                    <li className={`${styles.navItem} ${settingsOpen ? styles.open : ''}`}>
                        <div className={styles.settingsToggle} onClick={handleSettingsClick}>
                            <i className="fa-solid fa-gears"></i>
                            <span>Settings</span>
                            <i className={`fa-solid fa-chevron-right ${styles.arrow}`}></i>
                        </div>
                        <ul className={styles.submenu}>
                            {permissions.manageUsers && (
                                <li>
                                    <NavLink
                                        to="/settings"
                                        state={{ tab: 'user-management' }}
                                        onClick={handleNavClick}
                                    >
                                        <i className="fa-solid fa-users"></i> User Management
                                    </NavLink>
                                </li>
                            )}
                            <li>
                                <NavLink
                                    to="/settings"
                                    state={{ tab: 'permissions' }}
                                    onClick={handleNavClick}
                                >
                                    <i className="fa-solid fa-user-shield"></i> Permissions
                                </NavLink>
                            </li>
                            <li>
                                <NavLink
                                    to="/settings"
                                    state={{ tab: 'equipment' }}
                                    onClick={handleNavClick}
                                >
                                    <i className="fa-solid fa-server"></i> Equipment Details
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                )}

                {/* Logout */}
                <li className={`${styles.navItem} ${styles.logoutNavItem}`}>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            logout();
                        }}
                    >
                        <i className="fa-solid fa-right-from-bracket"></i> <span>Logout</span>
                    </a>
                </li>
            </ul>
        </nav>
    );
};

export default Sidebar;