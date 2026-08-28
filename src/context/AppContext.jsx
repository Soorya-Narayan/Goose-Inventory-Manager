// src/context/AppContext.jsx
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistoricData } from '../utils/historicDataStore';

// --- Helper Functions ---
const showToast = (message, type = 'info') => {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '12px';
        document.body.appendChild(container);
        toastContainer = container;
    }

    const toast = document.createElement('div');
    toast.style.position = 'relative';
    toast.style.backgroundColor = 'var(--card-bg, #fff)';
    toast.style.color = 'var(--text-primary, #1e293b)';
    toast.style.padding = '16px 20px';
    toast.style.borderRadius = '12px';
    toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '12px';
    toast.style.minWidth = '280px';
    toast.style.maxWidth = '400px';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%) scale(0.9)';
    toast.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    toast.style.overflow = 'hidden';

    let iconClass = 'fa-circle-info';
    let iconColor = '#3b82f6';
    let gradientStart = 'rgba(59, 130, 246, 0.1)';
    let gradientEnd = 'rgba(59, 130, 246, 0.05)';

    if (type === 'success') {
        iconClass = 'fa-circle-check';
        iconColor = '#22c55e';
        gradientStart = 'rgba(34, 197, 94, 0.1)';
        gradientEnd = 'rgba(34, 197, 94, 0.05)';
    } else if (type === 'error') {
        iconClass = 'fa-circle-xmark';
        iconColor = '#ef4444';
        gradientStart = 'rgba(239, 68, 68, 0.1)';
        gradientEnd = 'rgba(239, 68, 68, 0.05)';
    } else if (type === 'warning') {
        iconClass = 'fa-triangle-exclamation';
        iconColor = '#f59e0b';
        gradientStart = 'rgba(245, 158, 11, 0.1)';
        gradientEnd = 'rgba(245, 158, 11, 0.05)';
    }

    toast.style.background = `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`;
    toast.style.borderLeft = `4px solid ${iconColor}`;

    toast.innerHTML = `
        <i class="fa-solid ${iconClass}" style="
            color: ${iconColor};
            font-size: 20px;
            flex-shrink: 0;
        "></i>
        <span style="
            flex: 1;
            font-size: 14px;
            line-height: 1.5;
        ">${message}</span>
        <div style="
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            width: 100%;
            background: ${iconColor};
            opacity: 0.3;
            transform-origin: left;
            animation: progressBar 3s linear;
        "></div>
    `;

    toastContainer.appendChild(toast);

    // Bounce-in animation
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0) scale(1)';
    });

    // Auto-dismiss
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%) scale(0.9)';
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3000);
};

// ✅ Get API base URL with proper fallback
const getApiBaseUrl = () => {
    // 1️⃣ Runtime config (Docker / Nginx)
    if (window.RUNTIME_ENV?.API_BASE_URL) {
        return window.RUNTIME_ENV.API_BASE_URL;
    }

    // 2️⃣ Dev mode only (Vite)
    if (import.meta.env.DEV && import.meta.env.VITE_API_BASE) {
        return import.meta.env.VITE_API_BASE;
    }

    // 3️⃣ Safe production fallback
    return '/api';
};

// --- Initial State ---
const initialState = {
    // 🔧 TEMPORARY: Auto-authenticate for bypass mode
    isAuthenticated: true,
    currentUser: {
        id: 'demo-user',
        name: 'Demo User',
        email: 'demo@example.com',
        role: 'Administrator',
        avatar: 'https://i.pravatar.cc/150?img=12',
        theme: localStorage.getItem('cipDashboardTheme') === 'dark' ? 'dark' : 'light',
        permissions: {
            viewDashboard: true,
            viewTrends: true,
            viewAnalytics: true,
            viewAlarms: true,
            viewHelp: true,
            accessSettings: true,
            manageUsers: true,
            ackAlarms: true,
        }
    },
    users: [],
    isDarkTheme: localStorage.getItem('cipDashboardTheme') === 'dark',
    currentState: 'Idle',
    elapsedTime: 0,
    currentStepIndex: -1,
    currentStepName: 'N/A',
    progressPercent: 0,
    timeRemaining: 0,
    cycleSteps: [],
    activeAlarms: [],
    alarmHistory: [],
    aiPrediction: { status: 'N/A', value: 0 },
    liveParameters: {},
    tankState: {},
    tanks: {},
    totalWaterUsage: 0,
    roles: ['Administrator', 'Operator', 'QA/Supervisor'],
    equipmentData: [],
    permissionDefinitions: {},
    trendsData: { labels: [], conductivity: [], flowRate: [], pressure: [] },
    trendsDataStandards: { conductivity: [], flowRate: [], pressure: [] },
    isLoadingUsers: false,
    isLoadingLiveData: false,
    apiError: null,
    circuit: 'A', // Default to Circuit A
    systemMode: localStorage.getItem('cipSystemMode') || 'sim', // 'live', 'sim', 'historic'
    historicData: null,
    selectedHistoricDate: null,
};

// --- Reducer Actions ---
const ACTIONS = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGOUT: 'LOGOUT',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    SET_USERS: 'SET_USERS',
    ADD_USER: 'ADD_USER',
    UPDATE_USER: 'UPDATE_USER',
    SET_LOADING: 'SET_LOADING',
    SET_ERROR: 'SET_ERROR',
    TOGGLE_THEME: 'TOGGLE_THEME',
    CYCLE_CONTROL_UPDATE: 'CYCLE_CONTROL_UPDATE',
    LIVE_DATA_UPDATE: 'LIVE_DATA_UPDATE',
    CIRCUIT_UPDATE: 'CIRCUIT_UPDATE',
    ACKNOWLEDGE_ALARM: 'ACKNOWLEDGE_ALARM',
    ADD_ALARM: 'ADD_ALARM',
    SET_SYSTEM_MODE: 'SET_SYSTEM_MODE',
    SET_HISTORIC_DATA: 'SET_HISTORIC_DATA',
};

// --- Reducer ---
const AppReducer = (state, action) => {
    switch (action.type) {
        case ACTIONS.LOGIN_SUCCESS:
            localStorage.setItem('cipDashboardTheme', action.payload.user.theme || 'light');
            return {
                ...state,
                isAuthenticated: true,
                currentUser: {
                    ...action.payload.user,
                    permissions: {
                        viewDashboard: true,
                        viewTrends: true,
                        viewAnalytics: true,
                        viewAlarms: true,
                        viewHelp: true,
                        accessSettings: true,
                        manageUsers: true,
                        ackAlarms: true,
                    }
                },
                users: action.payload.users || state.users,
                isDarkTheme: action.payload.user.theme === 'dark',
                apiError: null,
                isLoadingUsers: false
            };

        case ACTIONS.LOGOUT:
        case ACTIONS.SESSION_EXPIRED:
            localStorage.removeItem('cipDashboardTheme');
            return {
                ...initialState,
                isAuthenticated: false,
                currentUser: null,
                isDarkTheme: localStorage.getItem('cipDashboardTheme') === 'dark'
            };

        case ACTIONS.SET_USERS:
            return { ...state, users: action.payload, isLoadingUsers: false };

        case ACTIONS.ADD_USER:
            if (!action.payload?.id || state.users.some(u => u.id === action.payload.id)) return state;
            return { ...state, users: [...state.users, action.payload] };

        case ACTIONS.UPDATE_USER:
            if (!action.payload?.id) return state;
            return {
                ...state,
                users: state.users.map(u => u.id === action.payload.id ? { ...u, ...action.payload } : u),
                currentUser: state.currentUser?.id === action.payload.id ? { ...state.currentUser, ...action.payload } : state.currentUser,
            };

        case ACTIONS.SET_LOADING:
            return { ...state, [action.payload.key]: action.payload.value };

        case ACTIONS.SET_ERROR:
            return { ...state, apiError: action.payload };

        case ACTIONS.TOGGLE_THEME:
            const newIsDark = !state.isDarkTheme;
            localStorage.setItem('cipDashboardTheme', newIsDark ? 'dark' : 'light');
            const updatedUserTheme = state.currentUser ? { ...state.currentUser, theme: newIsDark ? 'dark' : 'light' } : null;
            return { ...state, isDarkTheme: newIsDark, currentUser: updatedUserTheme };

        case ACTIONS.CYCLE_CONTROL_UPDATE:
            return {
                ...state,
                currentState: action.payload.state,
                elapsedTime: action.payload.elapsedTime ?? state.elapsedTime,
                currentStepIndex: action.payload.currentStepIndex ?? state.currentStepIndex,
                currentStepName: action.payload.currentStepName ?? state.currentStepName,
                progressPercent: action.payload.progressPercent ?? state.progressPercent,
            };

        case ACTIONS.CIRCUIT_UPDATE:
            return {
                ...state,
                circuit: action.payload
            };

        case ACTIONS.LIVE_DATA_UPDATE:
            return {
                ...state,
                currentState: action.payload.state || 'Idle',
                elapsedTime: action.payload.elapsed || 0,
                currentStepIndex: action.payload.step_index ?? -1,
                currentStepName: action.payload.step_name || 'N/A',
                progressPercent: action.payload.progress_percent || 0,
                timeRemaining: action.payload.time_remaining || 0,
                cycleSteps: action.payload.cycle_steps || state.cycleSteps,
                tankState: action.payload.tanks || state.tankState,
                tanks: action.payload.tanks || state.tanks,
                liveParameters: action.payload.live_params || state.liveParameters,
                activeAlarms: action.payload.alarms || [],
                totalWaterUsage: action.payload.live_params?.water_usage || state.totalWaterUsage,
                isLoadingLiveData: false,
                aiPrediction: action.payload.ai_prediction || initialState.aiPrediction
            };

        case ACTIONS.ACKNOWLEDGE_ALARM:
            const alarmToAck = state.activeAlarms.find(a => a.id === action.payload.alarmId);
            if (!alarmToAck) return state;
            const updatedAlarm = { ...alarmToAck, status: 'Acknowledged', acknowledgedBy: action.payload.userName };
            return {
                ...state,
                activeAlarms: state.activeAlarms.filter(a => a.id !== action.payload.alarmId),
                alarmHistory: [updatedAlarm, ...state.alarmHistory]
            };

        case ACTIONS.ADD_ALARM:
            if (state.activeAlarms.some(a => a.id === action.payload.id)) return state;
            return { ...state, activeAlarms: [action.payload, ...state.activeAlarms] };

        case ACTIONS.SET_SYSTEM_MODE:
            localStorage.setItem('cipSystemMode', action.payload);
            return { ...state, systemMode: action.payload };

        case ACTIONS.SET_HISTORIC_DATA:
            return { ...state, historicData: action.payload.data, selectedHistoricDate: action.payload.date };

        default:
            return state;
    }
};

// --- Create Context ---
const AppContext = createContext();

// --- Provider Component ---
export const AppProvider = ({ children }) => {
    const [state, dispatch] = useReducer(AppReducer, initialState);
    const navigate = useNavigate();

    // ✅ Use dynamic API base URL with proper fallback
    const API_BASE_URL = getApiBaseUrl();

    console.log('[AppProvider] IIH Mode Active - API_BASE_URL:', API_BASE_URL);
    console.log('[AppProvider] Old polling DISABLED - Pages handle their own data fetching');

    // --- Helper for Authenticated Fetch ---
    const fetchAuth = useCallback(async (url, options = {}) => {
        const defaultOptions = {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        };
        try {
            const response = await fetch(url, defaultOptions);
            return response;
        } catch (error) {
            console.error(`Fetch error for ${url}:`, error);
            showToast('Network error. Could not connect to backend.', 'error');
            throw error;
        }
    }, []);

    // ✅ Session check DISABLED for IIH demo mode
    useEffect(() => {
        console.log("Session check BYPASSED - IIH demo mode active");
    }, []);

    // ❌ OLD POLLING DISABLED - DashboardPage handles IIH data fetching
    // Each page now manages its own data via api.js service
    useEffect(() => {
        console.log('⚠️ Old /api/live_data polling DISABLED');
        console.log('✅ Pages now use IIH API endpoints via api.js service');
        console.log('✅ DashboardPage: /api/iih/tags, /api/iih/alarms/active');
        console.log('✅ MonitoringPage: /api/iih/tags/<id>/history');
        console.log('✅ AlarmsPage: /api/iih/alarms/active, /api/iih/alarms/history');

        // No polling here - pages handle their own data fetching
        return () => {
            console.log('Context polling cleanup (no-op - polling disabled)');
        };
    }, []);

    // --- Login ---
    const login = useCallback(async (username, password) => {
        try {
            const res = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                dispatch({
                    type: ACTIONS.LOGIN_SUCCESS,
                    payload: {
                        user: data.user,
                        users: []
                    }
                });
                showToast('Login successful!', 'success');
                navigate('/dashboard', { replace: true });
                return { success: true, token: data.token };
            } else {
                showToast(data.error || 'Login failed', 'error');
                return { success: false, error: data.error };
            }
        } catch (error) {
            showToast('Network error during login', 'error');
            return { success: false, error: error.message };
        }
    }, [navigate]);

    // --- Logout ---
    const logout = useCallback(async () => {
        console.log("Logging out user");

        // Clear authentication state
        dispatch({ type: ACTIONS.LOGOUT });

        // Clear localStorage
        try {
            localStorage.removeItem('cip_auth_token');
            localStorage.removeItem('cip_auth_remember');
        } catch (e) {
            console.warn('Could not clear localStorage', e);
        }

        showToast('Logged out successfully', 'success');

        // Redirect to login
        navigate('/login', { replace: true });
    }, [navigate]);

    // --- Cycle Control (Legacy - kept for compatibility) ---
    const sendCycleControl = useCallback(async (action) => {
        try {
            const response = await fetchAuth(`${API_BASE_URL}/cycle_control`, {
                method: 'POST',
                body: JSON.stringify({ action })
            });
            const data = await response.json();

            if (response.ok) {
                showToast(data.message || `Cycle ${action} requested.`, 'success');
                if (data.state) {
                    dispatch({ type: ACTIONS.LIVE_DATA_UPDATE, payload: data.state });
                }
            } else {
                throw new Error(data.error || `Failed to ${action} cycle`);
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    }, [fetchAuth, API_BASE_URL]);

    // --- Toggle Theme ---
    const toggleTheme = useCallback(() => {
        dispatch({ type: ACTIONS.TOGGLE_THEME });
    }, []);

    // --- User Management (Simplified for demo) ---
    const fetchUsers = useCallback(async () => {
        console.log("fetchUsers bypassed - Demo mode");
    }, []);

    const addUser = useCallback(async (userData) => {
        showToast('User management bypassed - Demo mode', 'info');
        return { success: true };
    }, []);

    const editUser = useCallback(async (userData) => {
        showToast('User management bypassed - Demo mode', 'info');
        return { success: true };
    }, []);

    const toggleUserStatus = useCallback(async (userId) => {
        showToast('User management bypassed - Demo mode', 'info');
    }, []);

    const changePassword = useCallback(async (passwordData) => {
        showToast('Password change bypassed - Demo mode', 'info');
        return { success: true };
    }, []);

    const acknowledgeAlarm = useCallback(async (alarmId) => {
        const userName = state.currentUser?.name || 'Demo User';
        dispatch({
            type: ACTIONS.ACKNOWLEDGE_ALARM,
            payload: { alarmId, userName }
        });
        showToast('Alarm acknowledged', 'success');
    }, [state.currentUser]);

    const getAiCopilotResponse = useCallback(async (question) => {
        const responses = {
            'help': 'I can help you with CIP operations, troubleshooting, and system information.',
            'status': `Current cycle status: ${state.currentState}`,
            'default': 'I understand your question. How can I assist you further?'
        };
        return responses[question.toLowerCase()] || responses.default;
    }, [state.currentState]);

    const updateUserAvatar = useCallback(async (avatarDataUrl) => {
        showToast('Avatar update bypassed - Demo mode', 'info');
        return { success: true };
    }, []);

    const updateUserPreference = useCallback(async (key, value) => {
        showToast('Preference update bypassed - Demo mode', 'info');
    }, []);

    const requestPasswordReset = useCallback(async (email) => {
        showToast('Password reset bypassed - Demo mode', 'info');
        return { success: true };
    }, []);

    const resetPasswordWithToken = useCallback(async (token, newPassword) => {
        showToast('Password reset bypassed - Demo mode', 'info');
        return { success: true };
    }, []);

    const exportChartData = useCallback(async (startDate, endDate) => {
        showToast('Export functionality - use page-specific export buttons', 'info');
    }, []);

    const getRolePermissions = useCallback(async (role) => {
        return state.currentUser?.permissions || {};
    }, [state.currentUser]);

    const saveRolePermissions = useCallback(async (role, permissions) => {
        showToast('Permissions saved (not yet implemented)', 'info');
    }, []);

    // --- Circuit Switching ---
    const setCircuit = useCallback(async (circuit) => {
        try {
            const response = await fetchAuth(`${API_BASE_URL}/system/circuit`, {
                method: 'POST',
                body: JSON.stringify({ circuit })
            });
            const data = await response.json();

            if (response.ok) {
                dispatch({ type: ACTIONS.CIRCUIT_UPDATE, payload: data.circuit });
                showToast(data.message, 'success');
            } else {
                throw new Error(data.message || 'Failed to switch circuit');
            }
        } catch (error) {
            console.error("Circuit switch error:", error);
            showToast('Failed to switch circuit', 'error');
            // Optimistic update fallback or revert could go here
        }
    }, [API_BASE_URL, fetchAuth]);

    // --- Unified Data Query (for Goose Assistant) ---
    const dataQuery = useCallback(async (query) => {
        // This function acts as the "Tool Executor" or "Resolver"
        // It maps string intents/tools to actual data fetching logic.

        console.log("Executing Data Query:", query);

        try {
            if (query.tool === 'get_live_data') {
                // Return current live parameters
                return {
                    status: 'success',
                    data: state.liveParameters
                };
            }

            if (query.tool === 'get_active_alarms') {
                // Return active alarms
                return {
                    status: 'success',
                    data: state.activeAlarms
                };
            }

            if (query.tool === 'query_historical_data') {
                // Mocking historical data for demo if backend isn't ready
                // or implementing actual fetch logic here
                const { metric, range } = query.args || {};

                // generate dummy trend data for demo
                const points = 20;
                const data = [];
                const now = new Date();
                for (let i = 0; i < points; i++) {
                    data.push({
                        time: new Date(now.getTime() - (points - i) * 60000).toLocaleTimeString(),
                        value: Math.floor(Math.random() * 100) + 20
                    });
                }

                return {
                    status: 'success',
                    data: {
                        labels: data.map(d => d.time),
                        datasets: [{
                            label: metric || 'Value',
                            data: data.map(d => d.value),
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        }]
                    }
                };
            }

            return { status: 'error', message: 'Unknown tool' };

        } catch (error) {
            console.error("Data Query Error:", error);
            return { status: 'error', message: error.message };
        }
    }, [state.liveParameters, state.activeAlarms]);

    const setSystemMode = useCallback((mode) => {
        dispatch({ type: ACTIONS.SET_SYSTEM_MODE, payload: mode });
    }, []);

    const loadHistoricDataForDate = useCallback((dateString) => {
        const data = getHistoricData(dateString);
        dispatch({ type: ACTIONS.SET_HISTORIC_DATA, payload: { date: dateString, data } });
    }, []);

    const contextValue = {
        ...state,
        login,
        logout,
        sendCycleControl,
        toggleTheme,
        fetchUsers,
        addUser,
        editUser,
        toggleUserStatus,
        changePassword,
        acknowledgeAlarm,
        getAiCopilotResponse,
        updateUserAvatar,
        updateUserPreference,
        requestPasswordReset,
        resetPasswordWithToken,
        exportChartData,
        showToast,
        getRolePermissions,
        saveRolePermissions,
        setCircuit,
        dataQuery, // ✅ Export dataQuery
        setSystemMode,
        loadHistoricDataForDate,
        API_BASE_URL,
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);