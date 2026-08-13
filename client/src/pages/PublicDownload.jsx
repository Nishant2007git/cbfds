import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api.js';
import { HardDrive, Download, Lock, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const PublicDownload = () => {
  const { token } = useParams();
  const [context, setContext] = useState(null);
  const [password, setPassword] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

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

    try {
      const res = await api.post(`/share/${token}/verify`, { password });
      setSessionToken(res.data.data.sessionToken);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Incorrect password.');
    } finally {
      setVerifying(false);
    }
  };

  const handleDownload = () => {
    let downloadUrl = `/api/v1/share/${token}/download`;
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

  return (
    <div className="public-share-wrapper">
      <div className="glass-panel share-card">
        <div className="brand-logo">
          <HardDrive size={32} color="var(--accent-primary)" />
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="skeleton" style={{ height: '24px', width: '60%', margin: '0 auto 12px' }} />
            <div className="skeleton" style={{ height: '16px', width: '40%', margin: '0 auto' }} />
          </div>
        ) : error ? (
          <div className="error-state">
            <AlertTriangle size={48} color="var(--color-danger)" />
            <h3>Link Unavailable</h3>
            <p>{error}</p>
          </div>
        ) : context ? (
          <div className="share-content">
            <div className="file-info-header">
              <FileText size={36} color="var(--accent-primary)" />
              <h2>{context.fileName}</h2>
              <span className="file-meta">
                {formatBytes(context.fileSize)} • Shared by {context.ownerName}
              </span>
            </div>

            {context.passwordRequired && !sessionToken ? (
              <form onSubmit={handleVerifyPassword} className="password-form">
                <p className="password-prompt">This file is password protected.</p>
                <div className="input-group">
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      type="password"
                      className="input-control with-icon"
                      placeholder="Enter Access Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary verify-btn" disabled={verifying}>
                  {verifying ? 'Verifying...' : 'Unlock File'}
                </button>
              </form>
            ) : (
              <div className="ready-download-box">
                {context.passwordRequired && (
                  <div className="unlocked-pill">
                    <CheckCircle2 size={16} color="var(--color-success)" />
                    <span>Password Verified</span>
                  </div>
                )}
                <button onClick={handleDownload} className="btn btn-primary download-btn">
                  <Download size={18} />
                  <span>Download Payload ({formatBytes(context.fileSize)})</span>
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <style>{`
        .public-share-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: radial-gradient(circle at 50% 0%, hsla(217, 91%, 60%, 0.12), transparent 70%);
        }

        .share-card {
          width: 100%;
          max-width: 440px;
          padding: 36px;
          text-align: center;
        }

        .brand-logo {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: hsla(217, 91%, 60%, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }

        .file-info-header h2 {
          font-size: 20px;
          margin: 12px 0 6px;
          word-break: break-all;
        }

        .file-meta {
          color: var(--text-muted);
          font-size: 13px;
        }

        .password-form {
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .password-prompt {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .verify-btn, .download-btn {
          width: 100%;
          padding: 12px;
          margin-top: 8px;
        }

        .ready-download-box {
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .unlocked-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--color-success);
        }

        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
      `}</style>
    </div>
  );
};

export default PublicDownload;
