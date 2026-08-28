// src/services/iihAuth.js
// ============================================================
// IIH Edge Authentication Service
// All IIH calls go through the Flask backend proxy (/api/iih/proxy/*)
// so the browser never touches the self-signed cert directly.
// ============================================================

// Backend proxy base (same origin as where React is served)
const PROXY_LOGIN   = '/api/iih/proxy/login';

const IIH_CREDENTIALS = {
  username: 'surya@goosesolutions.in',
  password: 'Goose@#$12345',
};

// In-memory token store
let _accessToken = null;
let _expiresAt   = null;     // Unix timestamp (seconds)
let _refreshTimer = null;    // setInterval handle

// ─────────────────────────────────────────────────────────
// Login: POST credentials → backend proxy → IIH Edge
// ─────────────────────────────────────────────────────────
async function login() {
  console.log('[IIH Auth] Logging in via backend proxy...');

  const response = await fetch(PROXY_LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(IIH_CREDENTIALS),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(`IIH proxy login failed: ${errBody.error || response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`IIH login error: ${data.error}`);
  }

  // Expected: { accessToken, expiresAt, refreshToken }
  _accessToken = data.accessToken;
  _expiresAt   = data.expiresAt; // Unix epoch seconds

  console.log('[IIH Auth] Login successful. Token expires at:', new Date(_expiresAt * 1000).toLocaleString());
  return _accessToken;
}

// ─────────────────────────────────────────────────────────
// Get a valid access token, auto-logging in if needed
// ─────────────────────────────────────────────────────────
export async function getAccessToken() {
  const nowSeconds = Math.floor(Date.now() / 1000);

  // If token is missing or expires within 5 min, refresh
  if (!_accessToken || !_expiresAt || nowSeconds >= (_expiresAt - 300)) {
    await login();
  }

  return _accessToken;
}

// ─────────────────────────────────────────────────────────
// Start auto-refresh every 55 min
// ─────────────────────────────────────────────────────────
export function startTokenAutoRefresh() {
  stopTokenAutoRefresh();
  console.log('[IIH Auth] Starting auto token refresh (every 55 min).');
  _refreshTimer = setInterval(async () => {
    try {
      await login();
      console.log('[IIH Auth] Token refreshed successfully.');
    } catch (err) {
      console.error('[IIH Auth] Auto-refresh error:', err);
    }
  }, 55 * 60 * 1000);
}

// ─────────────────────────────────────────────────────────
// Stop auto-refresh
// ─────────────────────────────────────────────────────────
export function stopTokenAutoRefresh() {
  if (_refreshTimer) {
    clearInterval(_refreshTimer);
    _refreshTimer = null;
    console.log('[IIH Auth] Auto token refresh stopped.');
  }
}

export function getTokenInfo() {
  return {
    hasToken: !!_accessToken,
    expiresAt: _expiresAt ? new Date(_expiresAt * 1000).toLocaleString() : null,
    isExpired: _expiresAt ? Math.floor(Date.now() / 1000) >= _expiresAt : true,
  };
}

export default {
  getAccessToken,
  startTokenAutoRefresh,
  stopTokenAutoRefresh,
  getTokenInfo,
};
