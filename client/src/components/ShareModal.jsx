import React, { useState } from 'react';
import api from '../utils/api.js';
import { X, Copy, Check, Lock, Calendar, Hash, Mail } from 'lucide-react';

const ShareModal = ({ file, onClose }) => {
  const [shareType, setShareType] = useState('EXTERNAL'); // EXTERNAL or INTERNAL
  const [recipientEmail, setRecipientEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enablePassword, setEnablePassword] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [downloadLimit, setDownloadLimit] = useState('');
  const [selfDestruct, setSelfDestruct] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleCreateShare = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        fileId: file.fileId || file._id,
        shareType,
        recipientEmail: shareType === 'INTERNAL' ? recipientEmail : undefined,
        password: enablePassword ? password : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        downloadLimit: downloadLimit ? parseInt(downloadLimit, 10) : undefined,
        selfDestruct
      };

      const res = await api.post('/shares', payload);
      const shareData = res.data.data;
      
      const fullUrl = `${window.location.origin}/share/${shareData.shareId}`;
      setGeneratedLink(fullUrl);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to generate share link.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-card">
        <div className="modal-header">
          <h3>Share File: {file.originalName}</h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        {!generatedLink ? (
          <form onSubmit={handleCreateShare} className="share-form">
            {error && <div className="auth-error-alert">{error}</div>}

            <div className="share-type-selector">
              <button
                type="button"
                className={`type-btn ${shareType === 'EXTERNAL' ? 'active' : ''}`}
                onClick={() => setShareType('EXTERNAL')}
              >
                Public Link (External)
              </button>
              <button
                type="button"
                className={`type-btn ${shareType === 'INTERNAL' ? 'active' : ''}`}
                onClick={() => setShareType('INTERNAL')}
              >
                Direct (Internal User)
              </button>
            </div>

            {shareType === 'INTERNAL' && (
              <div className="input-group">
                <label className="input-label">Recipient User Email</label>
                <div className="input-wrapper">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    className="input-control with-icon"
                    placeholder="user@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {shareType === 'EXTERNAL' && (
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={enablePassword}
                    onChange={(e) => setEnablePassword(e.target.checked)}
                  />
                  <span>Enable Password Protection</span>
                </label>
                {enablePassword && (
                  <div className="input-wrapper" style={{ marginTop: '8px' }}>
                    <Lock size={16} className="input-icon" />
                    <input
                      type="password"
                      className="input-control with-icon"
                      placeholder="Access Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>
            )}

            <div className="form-row">
              <div className="input-group">
                <label className="input-label">Expiration Date (Optional)</label>
                <input
                  type="date"
                  className="input-control"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Max Downloads (Optional)</label>
                <input
                  type="number"
                  min="1"
                  className="input-control"
                  placeholder="e.g. 5"
                  value={downloadLimit}
                  onChange={(e) => setDownloadLimit(e.target.value)}
                />
              </div>
            </div>

            <div className="checkbox-group" style={{ margin: '14px 0' }}>
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={selfDestruct}
                  onChange={(e) => setSelfDestruct(e.target.checked)}
                />
                <span>Self-destruct link after first download (One-time link)</span>
              </label>
            </div>

            <button type="submit" className="btn btn-primary submit-share-btn" disabled={loading}>
              {loading ? 'Generating...' : 'Create Shared Link'}
            </button>
          </form>
        ) : (
          <div className="result-container">
            <p className="success-msg">Share link created successfully!</p>
            <div className="link-copy-box">
              <input type="text" readOnly value={generatedLink} className="link-input" />
              <button onClick={copyToClipboard} className="btn btn-primary copy-btn">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <button onClick={onClose} className="btn btn-secondary close-modal-btn">
              Done
            </button>
          </div>
        )}
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--bg-overlay);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 16px;
        }

        .modal-card {
          width: 100%;
          max-width: 480px;
          padding: 24px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .share-type-selector {
          display: flex;
          background: var(--bg-surface);
          border-radius: 8px;
          padding: 4px;
          margin-bottom: 16px;
          border: 1px solid var(--border-standard);
        }

        .type-btn {
          flex: 1;
          padding: 8px;
          border: none;
          background: none;
          color: var(--text-secondary);
          font-size: 13px;
          border-radius: 6px;
          cursor: pointer;
        }

        .type-btn.active {
          background: var(--accent-primary);
          color: #fff;
        }

        .checkbox-group {
          margin-bottom: 16px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          cursor: pointer;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .submit-share-btn {
          width: 100%;
          margin-top: 12px;
        }

        .result-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: center;
        }

        .success-msg {
          color: var(--color-success);
          font-weight: 500;
        }

        .link-copy-box {
          display: flex;
          gap: 8px;
        }

        .link-input {
          flex: 1;
          background: var(--bg-surface);
          border: 1px solid var(--border-standard);
          color: var(--text-primary);
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
        }

        .close-modal-btn {
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default ShareModal;
