// src/pages/ResetPasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './LoginPage.module.css';

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Invalid reset link. Please request a new one.');
        }
    }, [token]);

    const validatePassword = () => {
        if (!password || password.length < 6) {
            return 'Password must be at least 6 characters';
        }
        if (password !== confirmPassword) {
            return 'Passwords do not match';
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validationError = validatePassword();
        if (validationError) {
            setError(validationError);
            return;
        }

        if (!token) {
            setError('Invalid reset token');
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/login', { replace: true });
                }, 2000);
            } else {
                setError(data.error || 'Failed to reset password');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className={styles.loginContainer}>
                <div className={styles.animatedBg}>
                    <div className={styles.gradientOrb1}></div>
                    <div className={styles.gradientOrb2}></div>
                    <div className={styles.gradientOrb3}></div>
                </div>

                <div className={styles.loginBox}>
                    <div className={styles.loginLogo}>
                        <img src="/GOOSE_LOGO_TRANSPARENT..png" alt="Goose Industrial Solutions" />
                        <div>
                            <h1 className={styles.brand}>Goose Industrial Solutions</h1>
                            <p className={styles.sub}>CIPoptima™</p>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
                        <h2 style={{ color: '#28a745', marginBottom: '10px' }}>Password Reset Successful!</h2>
                        <p style={{ color: '#666' }}>Redirecting to login...</p>
                    </div>
                </div>
            </div>
        );
    }

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

            {/* Reset Box */}
            <div className={styles.loginBox}>
                <div className={styles.loginLogo}>
                    <img src="/GOOSE_LOGO_TRANSPARENT..png" alt="Goose Industrial Solutions" />
                    <div>
                        <h1 className={styles.brand}>Reset Password</h1>
                        <p className={styles.sub}>Enter your new password</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className={styles.loginForm}>
                    {/* New Password */}
                    <div className={styles.formGroup}>
                        <div className={styles.floatingInput}>
                            <i className="fa-solid fa-lock"></i>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder=" "
                                disabled={submitting || !token}
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={submitting}
                            >
                                <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                            <label htmlFor="new-password">New Password</label>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className={styles.formGroup}>
                        <div className={styles.floatingInput}>
                            <i className="fa-solid fa-lock"></i>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="confirm-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder=" "
                                disabled={submitting || !token}
                            />
                            <label htmlFor="confirm-password">Confirm Password</label>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className={styles.loginError}>
                            <i className="fa-solid fa-circle-exclamation"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        className={styles.loginBtn}
                        disabled={submitting || !token}
                    >
                        {submitting ? (
                            <>
                                <span className={styles.loader}></span>
                                Resetting...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-check"></i>
                                Reset Password
                            </>
                        )}
                    </button>

                    {/* Back to Login */}
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className={styles.linkBtn}
                            disabled={submitting}
                        >
                            ← Back to Login
                        </button>
                    </div>
                </form>

                <div className={styles.loginFooter}>
                    <span>© {new Date().getFullYear()} Goose Industrial Solutions</span>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
