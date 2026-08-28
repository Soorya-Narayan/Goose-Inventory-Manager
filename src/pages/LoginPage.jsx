// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import ForgotPasswordModal from '../components/Modals/ForgotPasswordModal';
import styles from './LoginPage.module.css';
import CipSystemLoader from '../components/Loaders/CipSystemLoader';
// logo is referenced directly from public folder

const LoginPage = () => {
  const navigate = useNavigate();
  const appCtx = useAppContext();
  const contextLogin = appCtx?.login;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    if (!username || username.trim().length < 1) return 'Please enter your username.';
    if (!password || password.length < 4) return 'Please enter your password (min 4 characters).';
    return null;
  };

  const fallbackLogin = async (user, pass) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Server responded with ${res.status}`);
    }
    return await res.json();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    const err = validate();
    if (err) {
      setLoginError(err);
      return;
    }

    setSubmitting(true);

    // Store animation start time
    const animationStartTime = Date.now();
    const MIN_ANIMATION_DURATION = 3000; // 3 seconds minimum

    try {
      let result;
      if (typeof contextLogin === 'function') {
        result = await contextLogin(username.trim(), password, remember);
      } else {
        result = await fallbackLogin(username.trim(), password);
      }

      if (result && result.success) {
        const token = result.token || result.accessToken || result.authToken || result.auth_token;
        if (token) {
          try {
            localStorage.setItem('cip_auth_token', token);
            if (remember) localStorage.setItem('cip_auth_remember', '1');
            else localStorage.removeItem('cip_auth_remember');
          } catch (e) {
            console.warn('Could not persist token to localStorage', e);
          }
        }

        // Calculate remaining animation time
        const elapsedTime = Date.now() - animationStartTime;
        const remainingTime = Math.max(0, MIN_ANIMATION_DURATION - elapsedTime);

        // Wait for minimum animation duration, then navigate
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, remainingTime);
      } else {
        const message = (result && (result.error || result.message)) || 'Login failed. Please check your credentials.';
        setLoginError(message);
        setSubmitting(false);
      }
    } catch (ex) {
      console.error('Login error', ex);
      setLoginError(ex?.message || 'Network or server error — please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      {/* Animated Background */}
      <div className={styles.animatedBg}>
        <div className={styles.gradientOrb1}></div>
        <div className={styles.gradientOrb2}></div>
        <div className={styles.gradientOrb3}></div>
      </div>

      {/* Floating Particles */}
      <div className={styles.particles}>
        {[...Array(20)].map((_, i) => (
          <div key={i} className={styles.particle} style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 10}s`
          }}></div>
        ))}
      </div>

      {/* Realistic Flock Animation */}
      <div className={styles.flockContainer}>
        {/* Circling Flock (High altitude) */}
        <div className={styles.circlingGroup}>
          {[...Array(12)].map((_, i) => (
            <div key={`circle-${i}`} className={styles.bird} style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${i * 30}deg) translateX(180px) rotate(-90deg)`,
              animationDelay: `${i * 0.1}s`
            }}>
              <svg viewBox="0 0 100 60" className={styles.birdSvg}>
                {/* Wings that flap */}
                <path className={styles.wing} d="M5 35 Q 50 10 95 35 L 50 45 Z" />
                {/* Body */}
                <ellipse cx="50" cy="40" rx="4" ry="12" />
              </svg>
            </div>
          ))}
        </div>

        {/* Flying V-Formation (Fly By) */}
        <div className={styles.flyAcrossGroup}>
          {[
            { x: 0, y: 0 },
            { x: -40, y: 25 }, { x: 40, y: 25 },
            { x: -80, y: 50 }, { x: 80, y: 50 },
            { x: -120, y: 75 }, { x: 120, y: 75 }
          ].map((pos, i) => (
            <div key={`fly-${i}`} className={styles.bird} style={{
              transform: `translate(${pos.x}px, ${pos.y}px)`,
              animationDelay: `${i * 0.05}s`
            }}>
              <svg viewBox="0 0 100 60" className={styles.birdSvg}>
                <path className={styles.wing} d="M2 30 Q 50 0 98 30 L 50 42 Z" />
                <ellipse cx="50" cy="38" rx="5" ry="14" />
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* Login Box */}
      <div className={styles.loginBox}>
        {/* CIP Loader WITH animation reveal */}
        {submitting && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CipSystemLoader />
          </div>
        )}

        <div className={styles.loginLogo}>
          <img src="/GOOSE_LOGO_TRANSPARENT..png" alt="Goose Industrial Solutions" />
          <div>
            <h1 className={styles.brand}>Goose Industrial Solutions</h1>
            <p className={styles.sub}>CIPoptima™</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          {/* Username */}
          <div className={styles.formGroup}>
            <div className={styles.floatingInput}>
              <i className="fa-regular fa-user"></i>
              <input
                type="text"
                id="login-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder=" "
                disabled={submitting}
              />
              <label htmlFor="login-username">Username</label>
            </div>
          </div>

          {/* Password */}
          <div className={styles.formGroup}>
            <div className={styles.floatingInput}>
              <i className="fa-solid fa-lock"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder=" "
                disabled={submitting}
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
                disabled={submitting}
              >
                <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
              <label htmlFor="login-password">Password</label>
            </div>
          </div>

          {/* Error */}
          {loginError && (
            <div className={styles.loginError}>
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{loginError}</span>
            </div>
          )}

          {/* Remember & Forgot */}
          <div className={styles.row}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={submitting}
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => setIsForgotModalOpen(true)}
              className={styles.linkBtn}
              disabled={submitting}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={styles.loginBtn}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className={styles.loader}></span>
                Signing in…
              </>
            ) : (
              <>
                <i className="fa-solid fa-right-to-bracket"></i>
                Sign In
              </>
            )}
          </button>
        </form>

        <div className={styles.loginFooter}>
          <span>© {new Date().getFullYear()} Goose Industrial Solutions</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal isOpen={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} />
    </div>
  );
};

export default LoginPage;
