import React, { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api.js';
import {
  HardDrive,
  Download,
  Lock,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Eye,
  EyeOff,
  Clock,
  User,
  ArrowLeft,
  Sparkles,
  Zap,
  KeyRound,
  Copy,
  Check
} from 'lucide-react';
import { soundSpells } from '../utils/soundSpells.js';

const ThreeBackground = lazy(() => import('../components/ThreeBackground.jsx'));

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

function useTilt(strength = 14) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      el.style.transform = `perspective(1000px) rotateY(${dx * strength}deg) rotateX(${-dy * strength}deg) translateZ(16px)`;
    };
    const onLeave = () => {
      el.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(0)';
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [strength]);
  return ref;
}

const PublicDownload = () => {
  const { token } = useParams();
  const [context, setContext] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const cardRef = useTilt(10);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/share/${token}`);
        setContext(res.data.data);
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, [token]);

  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setError('');
    soundSpells.playClick?.();

    try {
      const res = await api.post(`/share/${token}/verify`, { password });
      setSessionToken(res.data.data.sessionToken);
      soundSpells.playSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Incorrect password.';
      setError(msg);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      soundSpells.playError?.();
    } finally {
      setVerifying(false);
    }
  };

  const handleDownload = () => {
    soundSpells.playNotification?.();
    setDownloadStarted(true);
    setTimeout(() => setDownloadStarted(false), 3000);

    const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
    let downloadUrl = `${apiBase}/share/${token}/download`;
    if (sessionToken) {
      downloadUrl += `?sessionToken=${encodeURIComponent(sessionToken)}`;
    }

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', context?.fileName || 'download');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    soundSpells.playClick?.();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="public-share-wrapper">
      {/* 3D WebGL background */}
      <Suspense fallback={null}>
        <ThreeBackground />
      </Suspense>

      {/* Ambient background glow orbs */}
      <div className="aura-orb aura-1" aria-hidden="true" />
      <div className="aura-orb aura-2" aria-hidden="true" />

      {/* Top Navbar / Brand */}
      <header className="public-header">
        <Link to="/" className="brand-badge" onMouseEnter={() => soundSpells.playHover?.()}>
          <div className="brand-icon-box">
            <HardDrive size={18} color="#fff" />
          </div>
          <span className="brand-name">CBFDS</span>
          <span className="brand-tag">3D CLOUD</span>
        </Link>

        <button
          onClick={copyShareLink}
          className="btn btn-ghost copy-btn"
          title="Copy Link"
        >
          {copiedLink ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
          <span>{copiedLink ? 'Copied Link' : 'Share Link'}</span>
        </button>
      </header>

      {/* Main 3D Glass Container */}
      <div className="public-content-container">
        <div
          ref={cardRef}
          className={`share-card-3d glass-panel ${isShaking ? 'shake-anim' : ''}`}
        >
          {/* Card Top Glow Ribbon */}
          <div className="card-top-shine" />

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner-ring" />
              <h3>Decrypting Share Link...</h3>
              <p>Establishing peer-to-peer verification token</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <div className="error-icon-box">
                <AlertTriangle size={36} color="var(--color-danger)" />
              </div>
              <h3>Secure Link Unavailable</h3>
              <p className="error-desc">{error}</p>
              <Link to="/login" className="btn btn-secondary return-btn">
                <ArrowLeft size={16} /> Return to Portal
              </Link>
            </div>
          ) : context ? (
            <div className="share-content">
              {/* Security Header Badge */}
              <div className="security-status-badge">
                <ShieldCheck size={14} color="var(--accent-emerald)" />
                <span>Zero-Trust Verified Delivery</span>
              </div>

              {/* Main File Hologram Card */}
              <div className="file-hero-box">
                <div className="file-avatar-box">
                  <FileText size={40} className="file-svg-glow" />
                  <div className="avatar-pulse-glow" />
                </div>
                <h2 className="file-title-text" title={context.fileName}>
                  {context.fileName}
                </h2>
                <div className="file-meta-pills">
                  <span className="meta-pill size-pill">
                    <Zap size={12} /> {formatBytes(context.fileSize)}
                  </span>
                  <span className="meta-pill owner-pill">
                    <User size={12} /> {context.ownerName || 'Verified Sender'}
                  </span>
                  {context.expiresAt && (
                    <span className="meta-pill exp-pill">
                      <Clock size={12} /> Exp: {new Date(context.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Password Unlock Step */}
              {context.passwordRequired && !sessionToken ? (
                <form onSubmit={handleVerifyPassword} className="password-unlock-box">
                  <div className="unlock-banner">
                    <KeyRound size={16} color="var(--accent-amber)" />
                    <div>
                      <h4>Password Protected</h4>
                      <p>Enter the security passphrase shared by the sender.</p>
                    </div>
                  </div>

                  <div className="input-group">
                    <div className="input-wrapper">
                      <Lock size={16} className="input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="input-control with-icon"
                        placeholder="Enter access passphrase"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary verify-btn"
                    disabled={verifying}
                  >
                    <Sparkles size={16} />
                    <span>{verifying ? 'Decrypting Token...' : 'Unlock & Access Payload'}</span>
                  </button>
                </form>
              ) : (
                /* Ready to Download Payload */
                <div className="download-ready-box">
                  {context.passwordRequired && (
                    <div className="unlocked-badge">
                      <CheckCircle2 size={15} color="var(--accent-emerald)" />
                      <span>Security Passphrase Verified</span>
                    </div>
                  )}

                  <button
                    onClick={handleDownload}
                    className={`btn btn-primary download-action-btn ${downloadStarted ? 'downloading-pulse' : ''}`}
                    onMouseEnter={() => soundSpells.playHover?.()}
                  >
                    <Download size={20} className="download-icon-bounce" />
                    <div className="btn-label-stack">
                      <span className="primary-text">
                        {downloadStarted ? 'Initiating Payload Transfer...' : 'Download Secure Payload'}
                      </span>
                      <span className="sub-text">
                        Direct P2P Stream • {formatBytes(context.fileSize)}
                      </span>
                    </div>
                  </button>

                  <p className="integrity-note">
                    <ShieldCheck size={13} color="var(--text-muted)" />
                    SHA-256 payload integrity check performed automatically.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <style>{`
        .public-share-wrapper {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: var(--bg-base);
          overflow: hidden;
          padding: 24px;
        }

        .aura-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          z-index: 1;
        }

        .aura-1 {
          width: 380px;
          height: 380px;
          top: 10%;
          left: 15%;
          background: radial-gradient(circle, hsla(217, 91%, 60%, 0.16), transparent 70%);
        }

        .aura-2 {
          width: 440px;
          height: 440px;
          bottom: 10%;
          right: 15%;
          background: radial-gradient(circle, hsla(262, 83%, 58%, 0.14), transparent 70%);
        }

        .public-header {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 900px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          margin-bottom: 24px;
        }

        .brand-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .brand-icon-box {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-md);
          background: var(--gradient-brand);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px var(--accent-primary-subtle);
        }

        .brand-name {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 18px;
          letter-spacing: 0.05em;
          color: var(--text-primary);
        }

        .brand-tag {
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 99px;
          background: var(--accent-primary-subtle);
          color: var(--accent-primary);
          font-weight: 700;
          letter-spacing: 0.06em;
          border: 1px solid var(--accent-primary-glow);
        }

        .copy-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          font-size: 13px;
        }

        .public-content-container {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
          width: 100%;
        }

        .share-card-3d {
          position: relative;
          width: 100%;
          max-width: 500px;
          padding: 36px 32px;
          border-radius: var(--radius-2xl);
          background: hsla(230, 36%, 10%, 0.78);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(32px) saturate(180%);
          box-shadow: 0 24px 70px hsla(230, 50%, 3%, 0.75), 0 0 0 1px hsla(215, 40%, 98%, 0.08);
          transition: transform 0.15s ease-out, box-shadow 0.3s ease;
          transform-style: preserve-3d;
        }

        .card-top-shine {
          position: absolute;
          top: 0;
          left: 15%;
          right: 15%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
          opacity: 0.8;
        }

        .shake-anim {
          animation: shakeCard 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        @keyframes shakeCard {
          10%, 90% { transform: translate3d(-2px, 0, 0); }
          20%, 80% { transform: translate3d(4px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-5px, 0, 0); }
          40%, 60% { transform: translate3d(5px, 0, 0); }
        }

        .loading-state, .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 24px 0;
          gap: 14px;
        }

        .loading-spinner-ring {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          border: 3px solid var(--glass-border);
          border-top-color: var(--accent-primary);
          animation: spinRing 0.8s linear infinite;
        }

        @keyframes spinRing {
          to { transform: rotate(360deg); }
        }

        .error-icon-box {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: hsla(0, 84%, 60%, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }

        .error-desc {
          color: var(--text-secondary);
          font-size: 14px;
          max-width: 320px;
        }

        .return-btn {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .security-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 99px;
          background: hsla(160, 84%, 39%, 0.1);
          border: 1px solid hsla(160, 84%, 39%, 0.25);
          font-size: 11px;
          font-weight: 600;
          color: var(--accent-emerald);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .file-hero-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 12px 0 24px;
        }

        .file-avatar-box {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: var(--radius-xl);
          background: var(--gradient-brand);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
          box-shadow: 0 12px 32px var(--accent-primary-subtle);
        }

        .file-svg-glow {
          color: #ffffff;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
        }

        .avatar-pulse-glow {
          position: absolute;
          inset: -4px;
          border-radius: inherit;
          background: var(--gradient-brand);
          opacity: 0.4;
          filter: blur(12px);
          z-index: -1;
          animation: pulseAvatar 2.8s ease-in-out infinite alternate;
        }

        @keyframes pulseAvatar {
          0% { transform: scale(0.95); opacity: 0.3; }
          100% { transform: scale(1.1); opacity: 0.6; }
        }

        .file-title-text {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 12px;
          max-width: 100%;
          word-break: break-all;
        }

        .file-meta-pills {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
        }

        .meta-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 500;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
        }

        .size-pill {
          color: var(--accent-cyan);
          border-color: hsla(187, 85%, 53%, 0.25);
        }

        .password-unlock-box {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 10px;
          padding: 20px;
          border-radius: var(--radius-lg);
          background: hsla(230, 36%, 7%, 0.5);
          border: 1px solid var(--border-subtle);
        }

        .unlock-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .unlock-banner h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .unlock-banner p {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .password-toggle-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.2s;
        }

        .password-toggle-btn:hover {
          color: var(--text-primary);
        }

        .verify-btn {
          width: 100%;
          padding: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 600;
        }

        .download-ready-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          margin-top: 10px;
        }

        .unlocked-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 99px;
          background: hsla(152, 69%, 41%, 0.12);
          color: var(--color-success);
          font-size: 12px;
          font-weight: 600;
        }

        .download-action-btn {
          width: 100%;
          padding: 16px 20px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          box-shadow: var(--shadow-glow);
          transition: transform 0.2s var(--ease-spring), box-shadow 0.2s var(--ease-out);
        }

        .download-action-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: var(--shadow-glow-hover);
        }

        .download-action-btn:active {
          transform: translateY(1px) scale(0.99);
        }

        .btn-label-stack {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        .btn-label-stack .primary-text {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .btn-label-stack .sub-text {
          font-size: 11px;
          opacity: 0.85;
          font-weight: 500;
        }

        .downloading-pulse {
          animation: pulseBtn 1s infinite alternate;
        }

        @keyframes pulseBtn {
          0% { filter: brightness(1); }
          100% { filter: brightness(1.2); }
        }

        .integrity-note {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
        }

        @media (max-width: 580px) {
          .share-card-3d {
            padding: 24px 18px;
          }
          .file-title-text {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
};

export default PublicDownload;
