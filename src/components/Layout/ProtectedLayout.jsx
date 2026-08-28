// src/components/Layout/ProtectedLayout.jsx
import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import Sidebar from './Sidebar';
import HamburgerButton from './HamburgerButton';
import ShortcutsHelpModal from '../Modals/ShortcutsHelpModal';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';

import styles from './Layout.module.css';

const ProtectedLayout = () => {
    const {
        isAuthenticated,
        isDarkTheme,
        systemMode,
    } = useAppContext();

    // Initialize sidebar state from localStorage (default: expanded)
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved === 'true';
    });
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

    // Effect to toggle body class based on theme state
    useEffect(() => {
        console.log('Theme effect running. isDarkTheme =', isDarkTheme);
        if (isDarkTheme) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }, [isDarkTheme]);

    // Persist sidebar state to localStorage
    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', isSidebarCollapsed);
    }, [isSidebarCollapsed]);

    // Toggle sidebar collapsed state (desktop)
    const toggleSidebar = () => {
        if (window.innerWidth > 768) {
            setSidebarCollapsed(!isSidebarCollapsed);
        } else {
            setMobileMenuOpen(!isMobileMenuOpen);
        }
    };

    // Close mobile menu on navigation
    const handleNavigation = () => {
        setMobileMenuOpen(false);
    };

    // Keyboard shortcuts
    useKeyboardShortcuts(
        toggleSidebar,
        () => setShowShortcutsHelp(true)
    );

    // Show loading state while checking authentication
    if (isAuthenticated === undefined) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'var(--background, #f5f5f5)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '48px', color: 'var(--primary-blue)' }}></i>
                    <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        console.log('User not authenticated, redirecting to login');
        return <Navigate to="/login" replace />;
    }

    return (
        <>
            {/* Toast container */}
            <div id="toast-container"></div>

            {/* Hamburger Button */}
            <HamburgerButton
                isOpen={isSidebarCollapsed || isMobileMenuOpen}
                onClick={toggleSidebar}
            />

            {/* Shortcuts Help Modal */}
            <ShortcutsHelpModal
                isOpen={showShortcutsHelp}
                onClose={() => setShowShortcutsHelp(false)}
            />

            {/* Mobile backdrop */}
            {isMobileMenuOpen && (
                <div
                    className={styles.mobileBackdrop}
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Main app container */}
            <div className={`${styles.appContainer} ${isDarkTheme ? styles.darkModeApp : ''} ${isSidebarCollapsed ? styles.sidebarCollapsed : ''} ${isMobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
                <Sidebar onNavigate={handleNavigation} collapsed={isSidebarCollapsed} />

                <main className={styles.mainContent}>
                    {systemMode === 'sim' && (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(99,102,241,.1), rgba(59,130,246,.08))',
                            border: '1px solid rgba(99,102,241,.3)',
                            padding: '10px 16px',
                            margin: '16px 24px 0',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            color: 'var(--text-secondary, #64748b)',
                            fontSize: '0.85rem',
                            fontWeight: '500'
                        }}>
                            <i className="fa-solid fa-satellite-dish" style={{ color: '#6366f1' }} />
                            <span>
                                <strong style={{ color: '#6366f1' }}>Simulation Mode</strong>
                                {' '}— IIH backend not reachable or simulation selected. Dashboard values are offline placeholders.
                            </span>
                        </div>
                    )}
                    <Outlet /> {/* Renders the current page */}
                </main>
            </div>
        </>
    );
};

export default ProtectedLayout;
