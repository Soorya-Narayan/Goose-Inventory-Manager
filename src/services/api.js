// src/services/api.js

// ======================================================
// CONFIGURATION
// ======================================================

// API mode — always prefer RUNTIME_ENV so the Edge Docker container
// can inject the correct relative path (/api → proxied to Node-RED).
// Fall back to build-time env vars for local dev.

// Determine which base URL to use
const getBaseURL = () => {
  // 1️⃣ Docker/Edge runtime injection (highest priority)
  if (window.RUNTIME_ENV && window.RUNTIME_ENV.API_BASE_URL) {
    return window.RUNTIME_ENV.API_BASE_URL;  // typically '/api'
  }
  // 2️⃣ Build-time Vite env override (local dev)
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  // 3️⃣ Safe relative fallback
  return '/api';
};

// ======================================================
// ERROR CLASSES
// ======================================================

export class UnauthorizedError extends Error {
  constructor(msg = 'Unauthorized') {
    super(msg);
    this.name = 'UnauthorizedError';
  }
}

export class NetworkError extends Error {
  constructor(msg = 'Network request failed') {
    super(msg);
    this.name = 'NetworkError';
  }
}

// ======================================================
// CORE HTTP METHODS
// ======================================================

async function request(path, options = {}) {
  const baseURL = getBaseURL();
  
  // Prevent double /api/ prefix (e.g. /api + /api/iih/tags -> /api/iih/tags)
  let cleanBase = baseURL.replace(/\/+$/, ''); // Remove trailing slashes
  if (cleanBase === '/api' && path.startsWith('/api/')) {
    cleanBase = ''; // Don't prepend /api if path already has it
  }
  
  const url = path.startsWith('http') ? path : `${cleanBase}${path.startsWith('/') ? '' : '/'}${path}`;

  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      let body = null;
      try {
        body = await response.json();
      } catch (e) {
        // Ignore JSON parse errors
      }
      throw new UnauthorizedError(body?.message || 'Session expired');
    }

    // Parse response body
    const contentType = response.headers.get('content-type') || '';
    let body;

    if (contentType.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    // Handle non-OK responses
    if (!response.ok) {
      const error = new Error(body?.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }

    return body;

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new NetworkError('Cannot connect to server. Please check if backend is running.');
    }

    throw error;
  }
}

export async function apiGet(path, opts = {}) {
  return request(path, { method: 'GET', ...opts });
}

export async function apiPost(path, data = null, opts = {}) {
  return request(path, {
    method: 'POST',
    body: data ? JSON.stringify(data) : null,
    ...opts
  });
}

export async function apiPut(path, data = null, opts = {}) {
  return request(path, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : null,
    ...opts
  });
}

export async function apiDelete(path, opts = {}) {
  return request(path, { method: 'DELETE', ...opts });
}

// ======================================================
// IIH ESSENTIALS API METHODS
// ======================================================

import { simulator } from './simulation';

const isSimMode = () => localStorage.getItem('cipSystemMode') === 'sim';

/**
 * Health Check
 */
export async function checkHealth() {
  if (isSimMode()) return { status: 'ok', mode: 'sim' };
  return apiGet('/api/health');
}

/**
 * Get all available PLC tags
 */
export async function getTags() {
  if (isSimMode()) return { tags: simulator.getTagsDefinition() };
  return apiGet('/api/iih/tags');
}

/**
 * Get current value of a specific tag
 * @param {string} tagId - Tag identifier (e.g., "ns=3;s=CIP.Temperature.Tank1")
 */
export async function getTagCurrentValue(tagId) {
  if (isSimMode()) {
    const res = simulator.getMultipleTagValues([tagId]);
    return { value: res.values[0] };
  }
  const encodedTagId = encodeURIComponent(tagId);
  return apiGet(`/api/iih/tags/${encodedTagId}/current`);
}

/**
 * Get current values for multiple tags (bulk request)
 * @param {string[]} tagIds - Array of tag identifiers
 */
export async function getMultipleTagValues(tagIds) {
  if (isSimMode()) return simulator.getMultipleTagValues(tagIds);
  return apiPost('/api/iih/tags/current', { tagIds });
}

/**
 * Get historical data for a tag
 */
export async function getTagHistory(tagId, options = {}) {
  if (isSimMode()) return simulator.getTagHistory(tagId, options);
  
  const encodedTagId = encodeURIComponent(tagId);
  const params = new URLSearchParams();
  if (options.startTime) params.append('startTime', options.startTime);
  if (options.endTime) params.append('endTime', options.endTime);
  if (options.interval) params.append('interval', options.interval);

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiGet(`/api/iih/tags/${encodedTagId}/history${query}`);
}

/**
 * Get active alarms
 */
export async function getActiveAlarms() {
  if (isSimMode()) return simulator.getActiveAlarms();
  return apiGet('/api/iih/alarms/active');
}

/**
 * Get alarm history
 */
export async function getAlarmHistory(limit = 50) {
  if (isSimMode()) return simulator.getAlarmHistory();
  return apiGet(`/api/iih/alarms/history?limit=${limit}`);
}

/**
 * Acknowledge an alarm
 */
export async function acknowledgeAlarm(alarmId) {
  if (isSimMode()) return simulator.acknowledgeAlarm(alarmId);
  return apiPost(`/api/iih/alarms/${alarmId}/acknowledge`);
}

/**
 * Get current cycle status
 */
export async function getCycleStatus() {
  if (isSimMode()) return simulator.getCycleStatus();
  return apiGet('/api/cycle/status');
}

/**
 * Control cycle execution
 */
export async function controlCycle(action) {
  if (isSimMode()) return { success: true, message: `Simulated cycle ${action}` };
  return apiPost('/api/cycle/control', { action });
}

// ======================================================
// LEGACY CIP DASHBOARD API (Backward Compatibility)
// ======================================================

/**
 * Get live CIP dashboard data (legacy endpoint)
 */
export async function getLiveData() {
  return apiGet('/api/live_data');
}

// ======================================================
// HELPER FUNCTIONS
// ======================================================

/**
 * Format timestamp for API requests
 * @param {Date} date - JavaScript Date object
 */
export function formatTimestamp(date) {
  return date.toISOString();
}

/**
 * Get timestamp for X hours ago
 * @param {number} hours - Number of hours
 */
export function getTimeAgo(hours) {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return formatTimestamp(date);
}

/**
 * Get current timestamp
 */
export function getCurrentTimestamp() {
  return formatTimestamp(new Date());
}

/**
 * Parse IIH timestamp to JavaScript Date
 * @param {string} timestamp - ISO timestamp string
 */
export function parseTimestamp(timestamp) {
  return new Date(timestamp);
}

/**
 * Check if API is in mock mode
 */
export function isMockMode() {
  return API_MODE === 'mock';
}

/**
 * Get current API mode
 */
export function getAPIMode() {
  return API_MODE;
}

/**
 * Get current base URL
 */
export function getAPIBaseURL() {
  return getBaseURL();
}

// ======================================================
// POLLING HELPER
// ======================================================

/**
 * Set up polling for real-time data updates
 * @param {Function} callback - Function to call on each interval
 * @param {number} interval - Interval in milliseconds (default: 2000)
 * @returns {Function} Cleanup function to stop polling
 */
export function setupPolling(callback, interval = 2000) {
  const intervalId = setInterval(async () => {
    try {
      await callback();
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, interval);

  // Return cleanup function
  return () => clearInterval(intervalId);
}

// ======================================================
// BATCH REQUEST HELPER
// ======================================================

/**
 * Fetch multiple tags efficiently in batches
 * @param {string[]} tagIds - Array of tag IDs
 * @param {number} batchSize - Number of tags per batch (default: 10)
 */
export async function fetchTagsInBatches(tagIds, batchSize = 10) {
  const batches = [];

  for (let i = 0; i < tagIds.length; i += batchSize) {
    const batch = tagIds.slice(i, i + batchSize);
    batches.push(batch);
  }

  const results = await Promise.all(
    batches.map(batch => getMultipleTagValues(batch))
  );

  // Flatten results
  return results.reduce((acc, result) => {
    return [...acc, ...(result.values || [])];
  }, []);
}

// ======================================================
// EXPORT DEFAULT API OBJECT
// ======================================================

export default {
  // Core methods
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,

  // IIH methods
  checkHealth,
  getTags,
  getTagCurrentValue,
  getMultipleTagValues,
  getTagHistory,
  getActiveAlarms,
  getAlarmHistory,
  acknowledgeAlarm,

  // Cycle control
  getCycleStatus,
  controlCycle,

  // Legacy methods
  getLiveData,

  // Helpers
  formatTimestamp,
  getTimeAgo,
  getCurrentTimestamp,
  parseTimestamp,
  isMockMode,
  getAPIMode,
  getAPIBaseURL,
  setupPolling,
  fetchTagsInBatches
};