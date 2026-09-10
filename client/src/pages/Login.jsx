import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { HardDrive, Lock, Mail, User as UserIcon, ArrowRight, Eye, EyeOff, Shield, Zap, Check, AlertCircle } from 'lucide-react';

const Login = ({ initialMode = 'login' }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsRegister(initialMode === 'register');
  }, [initialMode]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Live password validation checks
  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const isPasswordMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (!email.trim()) {
          throw new Error('Please enter your email address.');
        }
        if (!isPasswordValid) {
          throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        await register(fullName.trim(), email.trim(), password, confirmPassword);
      } else {
        if (!email.trim()) {
          throw new Error('Please enter your email address.');
        }
        if (!password) {
          throw new Error('Please enter your password.');
        }
        await login(email.trim(), password);
      }
    } catch (err) {
      let msg = '';
      const errData = err.response?.data;
      
      // If error details has specific field errors
      if (errData?.error?.details && typeof errData.error.details === 'object') {
        const detailValues = Object.values(errData.error.details).filter(Boolean);
        if (detailValues.length > 0) {
          msg = detailValues.join(' ');
        }
      }
      
      if (!msg && errData?.error?.message) {
        msg = errData.error.message;
      } else if (!msg && errData?.message) {
        msg = errData.message;
      } else if (!msg && err.message) {
        msg = err.message;
      }
      
      if (!msg) {
        msg = isRegister ? 'Registration failed. Please verify your details.' : 'Sign in failed. Please check your credentials.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Animated background orbs */}
      <div className="auth-bg-effects">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grid-overlay" />
      </div>

      <div className={`auth-card glass-panel ${mounted ? 'auth-card-visible' : ''}`}>
        {/* Brand header */}
        <div className="auth-header">
          <div className="auth-logo-wrapper">
            <div className="auth-logo-ring" />
            <div className="auth-logo">
              <HardDrive size={28} strokeWidth={1.8} />
            </div>
          </div>
          <h1 className="auth-title">
            <span className="text-gradient">CBFDS</span>
          </h1>
          <p className="auth-subtitle">
            {isRegister ? 'Create your secure cloud storage account' : 'Secure Cloud File Distribution System'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(false);
              setError('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
          >
            <Lock size={14} />
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(true);
              setError('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
          >
            <UserIcon size={14} />
            Register
          </button>
          <div className={`auth-tab-indicator ${isRegister ? 'right' : 'left'}`} />
        </div>

        {/* Quick Demo Access (Only in Sign In mode) */}
        {!isRegister && (
          <div className="demo-accounts-bar animate-fadeIn">
            <span className="demo-hint-label">Quick Demo Login:</span>
            <div className="demo-btn-group">
              <button
                type="button"
                className="demo-pill-btn"
                onClick={() => {
                  setEmail('admin@library.com');
                  setPassword('Password123!');
                  setError('');
                }}
              >
                <Shield size={12} />
                <span>Admin</span>
              </button>
              <button
                type="button"
                className="demo-pill-btn"
                onClick={() => {
                  setEmail('user@example.com');
                  setPassword('Password123!');
                  setError('');
                }}
              >
                <UserIcon size={12} />
                <span>User</span>
              </button>
            </div>
          </div>
        )}

        {/* Error alert */}
        {error && (
          <div className="auth-error animate-scaleIn">
            <Shield size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="field-group animate-fadeInUp stagger-1">
              <label className="field-label">Full Name</label>
              <div className="field-wrapper">
                <UserIcon size={16} className="field-icon" />
                <input
                  type="text"
                  className="field-input"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="field-group animate-fadeInUp stagger-2">
            <label className="field-label">Email</label>
            <div className="field-wrapper">
              <Mail size={16} className="field-icon" />
              <input
                type="email"
                className="field-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field-group animate-fadeInUp stagger-3">
            <label className="field-label">Password</label>
            <div className="field-wrapper">
              <Lock size={16} className="field-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="field-input"
                placeholder={isRegister ? 'Min 8 chars with symbols' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="field-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Interactive Password Requirements Checklist in Register Mode */}
            {isRegister && (
              <div className="password-checklist">
                <div className="checklist-title">Password must contain:</div>
                <div className="checklist-grid">
                  <div className={`checklist-item ${passwordChecks.length ? 'met' : ''}`}>
                    <Check size={11} className="check-icon" />
                    <span>8+ characters</span>
                  </div>
                  <div className={`checklist-item ${passwordChecks.upper ? 'met' : ''}`}>
                    <Check size={11} className="check-icon" />
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div className={`checklist-item ${passwordChecks.lower ? 'met' : ''}`}>
                    <Check size={11} className="check-icon" />
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div className={`checklist-item ${passwordChecks.digit ? 'met' : ''}`}>
                    <Check size={11} className="check-icon" />
                    <span>Number (0-9)</span>
                  </div>
                  <div className={`checklist-item ${passwordChecks.special ? 'met' : ''}`}>
                    <Check size={11} className="check-icon" />
                    <span>Special character (!@#$)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isRegister && (
            <div className="field-group animate-fadeInUp stagger-4">
              <label className="field-label">Confirm Password</label>
              <div className="field-wrapper">
                <Lock size={16} className="field-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="field-input"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="field-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <div className={`match-indicator ${isPasswordMatch ? 'matched' : 'mismatched'}`}>
                  {isPasswordMatch ? (
                    <>
                      <Check size={13} />
                      <span>Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={13} />
                      <span>Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className={`auth-submit ${loading ? 'auth-submit-loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <div className="spinner" />
            ) : (
              <>
                <Zap size={16} />
                <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          <div className="auth-footer-divider">
            <span>Encrypted & Secure</span>
          </div>
          <div className="auth-trust-badges">
            <span className="trust-badge"><Shield size={12} /> 256-bit SSL</span>
            <span className="trust-badge"><Lock size={12} /> E2E Encrypted</span>
          </div>
        </div>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        /* === Background Effects === */
        .auth-bg-effects {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
        }

        .orb-1 {
          width: 500px;
          height: 500px;
          background: hsla(217, 91%, 60%, 0.15);
          top: -10%;
          left: -5%;
          animation: float 8s ease-in-out infinite;
        }

        .orb-2 {
          width: 400px;
          height: 400px;
          background: hsla(262, 83%, 58%, 0.12);
          bottom: -10%;
          right: -5%;
          animation: float 10s ease-in-out infinite reverse;
        }

        .orb-3 {
          width: 300px;
          height: 300px;
          background: hsla(160, 84%, 39%, 0.08);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: float 12s ease-in-out infinite 2s;
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(hsla(210, 40%, 98%, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, hsla(210, 40%, 98%, 0.02) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        /* === Card === */
        .auth-card {
          width: 100%;
          max-width: 420px;
          padding: 40px 36px;
          position: relative;
          z-index: 1;
          opacity: 0;
          transform: translateY(24px) scale(0.97);
          transition: all 0.7s var(--ease-out);
        }

        .auth-card-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        /* === Logo === */
        .auth-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .auth-logo-wrapper {
          position: relative;
          width: 72px;
          height: 72px;
          margin: 0 auto 20px;
        }

        .auth-logo-ring {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid transparent;
          background: conic-gradient(from 0deg, var(--accent-primary), var(--accent-secondary), var(--accent-emerald), var(--accent-primary)) border-box;
          -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: spin-slow 6s linear infinite;
        }

        .auth-logo {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: var(--gradient-brand);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          position: relative;
          z-index: 1;
          box-shadow: 0 0 30px var(--accent-primary-glow);
        }

        .auth-title {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: 2px;
          margin-bottom: 6px;
        }

        .auth-subtitle {
          color: var(--text-muted);
          font-size: 13px;
        }

        /* === Tabs === */
        .auth-tabs {
          display: flex;
          position: relative;
          background: var(--bg-inset);
          border-radius: var(--radius-md);
          padding: 4px;
          margin-bottom: 20px;
          border: 1px solid var(--border-subtle);
        }

        .auth-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border: none;
          background: none;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 13px;
          font-family: var(--font-body);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: color var(--duration-normal) var(--ease-smooth);
          position: relative;
          z-index: 1;
        }

        .auth-tab.active {
          color: #fff;
        }

        .auth-tab-indicator {
          position: absolute;
          top: 4px;
          bottom: 4px;
          width: calc(50% - 4px);
          background: var(--gradient-brand);
          border-radius: var(--radius-sm);
          transition: all var(--duration-slow) var(--ease-spring);
          z-index: 0;
          box-shadow: 0 2px 8px var(--accent-primary-glow);
        }

        .auth-tab-indicator.left { left: 4px; }
        .auth-tab-indicator.right { left: calc(50% + 0px); }

        /* === Demo Box === */
        .demo-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: var(--accent-primary-subtle);
          border: 1px solid hsla(217, 91%, 60%, 0.2);
          padding: 12px 14px;
          border-radius: var(--radius-md);
          margin-bottom: 18px;
        }

        .demo-box-icon {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          background: var(--accent-primary);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .demo-box-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .demo-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--accent-primary);
        }

        .demo-creds {
          font-size: 12px;
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }

        /* === Demo Accounts Bar === */
        .demo-accounts-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--accent-primary-subtle);
          border: 1px solid hsla(217, 91%, 60%, 0.18);
          border-radius: var(--radius-md);
          padding: 8px 12px;
          margin-bottom: 16px;
          gap: 10px;
        }

        .demo-hint-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .demo-btn-group {
          display: flex;
          gap: 6px;
        }

        .demo-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-full, 9999px);
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .demo-pill-btn:hover {
          background: var(--accent-primary);
          color: #fff;
          border-color: var(--accent-primary);
          transform: translateY(-1px);
        }

        /* === Error === */
        .auth-error {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--color-danger-subtle);
          border: 1px solid hsla(0, 84%, 60%, 0.3);
          color: hsl(0, 84%, 75%);
          padding: 12px 14px;
          border-radius: var(--radius-md);
          font-size: 13px;
          margin-bottom: 18px;
        }

        /* === Form Fields === */
        .auth-form {
          display: flex;
          flex-direction: column;
        }

        .field-group {
          margin-bottom: 16px;
        }

        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
        }

        .field-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-icon {
          position: absolute;
          left: 14px;
          color: var(--text-disabled);
          pointer-events: none;
          transition: color var(--duration-normal) var(--ease-smooth);
        }

        .field-input {
          width: 100%;
          background: var(--bg-inset);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          padding: 12px 14px 12px 42px;
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-size: 14px;
          outline: none;
          transition: all var(--duration-normal) var(--ease-out);
          box-shadow: var(--shadow-inner);
        }

        .field-input:hover {
          border-color: var(--border-standard);
        }

        .field-input:focus {
          border-color: var(--accent-primary);
          box-shadow: var(--shadow-inner), 0 0 0 3px var(--accent-primary-subtle);
        }

        .field-input:focus ~ .field-icon,
        .field-input:focus + .field-icon {
          color: var(--accent-primary);
        }

        .field-wrapper:focus-within .field-icon {
          color: var(--accent-primary);
        }

        .field-input::placeholder {
          color: var(--text-disabled);
        }

        .field-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: var(--text-disabled);
          cursor: pointer;
          padding: 4px;
          display: flex;
          transition: color var(--duration-fast);
        }

        .field-toggle:hover {
          color: var(--text-secondary);
        }

        .field-hint {
          display: block;
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 6px;
        }

        /* === Password Requirements Checklist === */
        .password-checklist {
          margin-top: 8px;
          padding: 8px 10px;
          background: var(--bg-inset);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
        }

        .checklist-title {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .checklist-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 8px;
        }

        .checklist-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10.5px;
          color: var(--text-disabled);
          transition: all 0.2s ease;
        }

        .checklist-item .check-icon {
          opacity: 0.3;
          stroke-width: 2.5;
          flex-shrink: 0;
        }

        .checklist-item.met {
          color: hsl(160, 84%, 45%);
          font-weight: 500;
        }

        .checklist-item.met .check-icon {
          opacity: 1;
          color: hsl(160, 84%, 45%);
        }

        /* === Match Indicator === */
        .match-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          margin-top: 6px;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
        }

        .match-indicator.matched {
          color: hsl(160, 84%, 45%);
          background: hsla(160, 84%, 39%, 0.1);
        }

        .match-indicator.mismatched {
          color: hsl(0, 84%, 65%);
          background: hsla(0, 84%, 60%, 0.1);
        }

        /* === Submit === */
        .auth-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 20px;
          margin-top: 8px;
          background: var(--gradient-brand);
          color: #fff;
          border: none;
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out);
          box-shadow: 0 4px 16px var(--accent-primary-glow);
          position: relative;
          overflow: hidden;
        }

        .auth-submit::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, hsla(0,0%,100%,0.1), transparent 60%);
          opacity: 0;
          transition: opacity var(--duration-fast);
        }

        .auth-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px var(--accent-primary-glow);
          filter: brightness(1.08);
        }

        .auth-submit:hover::before {
          opacity: 1;
        }

        .auth-submit:active {
          transform: translateY(0);
        }

        .auth-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid hsla(0, 0%, 100%, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin-slow 0.6s linear infinite;
        }

        /* === Footer === */
        .auth-footer {
          margin-top: 24px;
        }

        .auth-footer-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .auth-footer-divider::before,
        .auth-footer-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border-subtle);
        }

        .auth-footer-divider span {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }

        .auth-trust-badges {
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        .trust-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--text-muted);
        }

        /* === Responsive === */
        @media (max-width: 480px) {
          .auth-card {
            padding: 28px 20px;
          }
          .auth-title {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
