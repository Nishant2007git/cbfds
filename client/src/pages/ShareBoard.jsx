import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import { Share2, Link2, Copy, Check, EyeOff, Lock, Trash2, Calendar, Search, ExternalLink } from 'lucide-react';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const ShareBoard = () => {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('Active');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchShares = async () => {
    try {
      setLoading(true);
      const res = await api.get('/shares');
      setShares(res.data.data || []);
    } catch (err) {
      console.error('Failed to load outgoing shares', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShares();
  }, []);

  const handleRevoke = async (shareId) => {
    if (!window.confirm('Are you sure you want to revoke this shared link? Access will be blocked immediately.')) return;
    try {
      await api.delete(`/shares/${shareId}`);
      setShares(prev => prev.map(s => s.shareId === shareId ? { ...s, isRevoked: true } : s));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to revoke shared link.');
    }
  };

  const handleCopyLink = (shareId) => {
    const link = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isShareActive = (share) => {
    if (share.isRevoked) return false;
    if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) return false;
    if (share.downloadLimit !== null && share.downloadCount >= share.downloadLimit) return false;
    return true;
  };

  const filteredShares = shares.filter(share => {
    const active = isShareActive(share);
    const matchesSearch = (share.file?.originalName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === 'Active') return active && matchesSearch;
    if (activeFilter === 'Expired') return !active && matchesSearch;
    return matchesSearch; // All
  });

  return (
    <Layout title="Shared Links">
      <div className="shares-container">
        
        {/* Search & Filter Bar */}
        <div className="glass-card header-filters animate-fadeInUp">
          <div className="search-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search shared links..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-tabs">
            {['Active', 'Expired', 'All'].map(tab => (
              <button
                key={tab}
                className={`filter-tab-btn ${activeFilter === tab ? 'active' : ''}`}
                onClick={() => setActiveFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Share Items List */}
        <div className="shares-list animate-fadeInUp stagger-2">
          {loading ? (
            <div className="loading-grid">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-lg)', marginBottom: 12 }} />
              ))}
            </div>
          ) : filteredShares.length === 0 ? (
            <div className="empty-state glass-card">
              <div className="empty-icon-wrap">
                <Share2 size={28} />
              </div>
              <h4>No shared links found</h4>
              <p>Active or expired links matching your query will show up here.</p>
            </div>
          ) : (
            <div className="shares-grid">
              {filteredShares.map((share, idx) => {
                const isActive = isShareActive(share);
                const fileObj = share.file || {};
                const shareUrl = `${window.location.origin}/share/${share.shareId}`;

                return (
                  <div key={share.shareId} className={`share-item-card glass-card ${!isActive ? 'revoked' : ''} animate-fadeInUp stagger-${Math.min(idx + 1, 8)}`}>
                    <div className="card-left">
                      <div className="card-top-row">
                        <span className="file-title-txt">{fileObj.originalName || 'Unknown File'}</span>
                        <span className="file-size-badge">{fileObj.fileSize ? formatBytes(fileObj.fileSize) : 'N/A'}</span>
                      </div>
                      
                      <div className="card-link-row">
                        <span className="link-url-text" onClick={() => handleCopyLink(share.shareId)}>{shareUrl}</span>
                      </div>

                      <div className="card-meta-row">
                        <span className="meta-chip">
                          {share.downloadCount} views
                        </span>
                        {share.expiresAt && (
                          <span className="meta-chip">
                            <Calendar size={11} />
                            Expires in {Math.round((new Date(share.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                          </span>
                        )}
                        {share.accessKeyHash && (
                          <span className="meta-chip text-green">
                            <Lock size={11} /> Password Active
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="card-right">
                      <span className={`status-badge ${isActive ? 'active' : 'revoked'}`}>
                        {isActive ? 'Active' : share.isRevoked ? 'Revoked' : 'Expired'}
                      </span>
                      
                      <div className="actions-group">
                        <button
                          onClick={() => handleCopyLink(share.shareId)}
                          className="action-btn"
                          title="Copy Link"
                          disabled={!isActive}
                        >
                          {copiedId === share.shareId ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => window.open(shareUrl, '_blank')}
                          className="action-btn"
                          title="Open Link"
                          disabled={!isActive}
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button
                          onClick={() => handleRevoke(share.shareId)}
                          className="action-btn danger-hover"
                          title="Revoke Share"
                          disabled={!isActive}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <style>{`
        .shares-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Filters */
        .header-filters {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          gap: 16px;
        }

        .search-wrap {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          max-width: 320px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
        }

        .search-input {
          width: 100%;
          background: hsl(230, 40%, 7%);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          padding: 8px 12px 8px 36px;
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-size: 13px;
          outline: none;
          transition: all var(--duration-normal);
        }

        .search-input:focus {
          border-color: var(--accent-primary);
          background: hsl(230, 36%, 9%);
        }

        .filter-tabs {
          display: flex;
          gap: 4px;
          background: hsl(230, 40%, 7%);
          padding: 3px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
        }

        .filter-tab-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 600;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--duration-fast);
        }

        .filter-tab-btn.active {
          background: var(--bg-surface);
          color: var(--text-primary);
          box-shadow: var(--shadow-xs);
        }

        /* Shares Grid */
        .shares-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .share-item-card {
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-left: 3px solid var(--accent-primary);
          transition: all var(--duration-normal) var(--ease-out);
        }

        .share-item-card.revoked {
          border-left-color: var(--text-disabled);
          opacity: 0.6;
        }

        .card-left {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 0;
        }

        .card-top-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .file-title-txt {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-size-badge {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .card-link-row {
          font-size: 12px;
          color: var(--accent-primary);
          font-family: var(--font-mono);
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 90%;
        }

        .card-link-row:hover {
          text-decoration: underline;
        }

        .card-meta-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-muted);
          background: hsl(230, 40%, 7%);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
        }

        .text-green {
          color: var(--color-success) !important;
        }

        .card-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
          flex-shrink: 0;
        }

        .status-badge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }

        .status-badge.active { background: var(--color-success-subtle); color: var(--color-success); }
        .status-badge.revoked { background: var(--color-danger-subtle); color: var(--color-danger); }

        .actions-group {
          display: flex;
          gap: 6px;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          background: hsl(230, 40%, 7%);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--duration-fast);
        }

        .action-btn:hover:not(:disabled) {
          border-color: var(--border-standard);
          color: var(--text-primary);
          background: var(--bg-surface-hover);
        }

        .action-btn.danger-hover:hover:not(:disabled) {
          border-color: var(--color-danger);
          color: var(--color-danger);
          background: var(--color-danger-subtle);
        }

        .action-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .empty-state {
          padding: 48px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .empty-icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: hsl(230, 40%, 7%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        @media (max-width: 768px) {
          .header-filters {
            flex-direction: column;
            align-items: stretch;
          }
          .search-wrap {
            max-width: 100%;
          }
          .share-item-card {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .card-right {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid var(--border-subtle);
            padding-top: 10px;
          }
        }
      `}</style>
    </Layout>
  );
};

export default ShareBoard;
