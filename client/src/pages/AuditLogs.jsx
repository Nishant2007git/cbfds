import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import { 
  Activity, LogIn, UploadCloud, DownloadCloud, Trash2, RotateCcw, 
  Share2, ShieldAlert, Calendar, EyeOff, Globe, Smartphone, Laptop,
  Filter, Shield
} from 'lucide-react';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const actionConfig = {
  LOGIN:            { icon: LogIn,          color: 'var(--accent-primary)',   bg: 'var(--accent-primary-subtle)',   label: 'Login' },
  UPLOAD_FILE:      { icon: UploadCloud,    color: 'var(--accent-emerald)',   bg: 'var(--accent-emerald-subtle)',   label: 'Upload' },
  DOWNLOAD_FILE:    { icon: DownloadCloud,  color: 'var(--accent-cyan)',      bg: 'var(--accent-cyan-subtle)',      label: 'Download' },
  DELETE_FILE:      { icon: Trash2,         color: 'var(--accent-amber)',     bg: 'var(--accent-amber-subtle)',     label: 'Delete' },
  RESTORE_FILE:     { icon: RotateCcw,      color: 'var(--accent-emerald)',   bg: 'var(--accent-emerald-subtle)',   label: 'Restore' },
  PERMANENT_DELETE: { icon: Trash2,         color: 'var(--color-danger)',     bg: 'var(--color-danger-subtle)',     label: 'Purge' },
  CREATE_SHARE:     { icon: Share2,         color: 'var(--accent-secondary)', bg: 'var(--accent-secondary-subtle)', label: 'Share' },
  REVOKE_SHARE:     { icon: EyeOff,         color: 'var(--accent-rose)',      bg: 'var(--accent-rose-subtle)',      label: 'Revoke' }
};

const getDeviceIcon = (uaString = '') => {
  const ua = uaString.toLowerCase();
  if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) return Smartphone;
  return Laptop;
};

const parseUserAgent = (uaString = '') => {
  const ua = uaString.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('edge')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('edge')) return 'Edge';
  return 'Desktop';
};

const getRelativeTime = (date) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  const checkUserRoleAndFetchFilters = async () => {
    try {
      const authRes = await api.get('/auth/me');
      const role = authRes.data.data?.role || authRes.data.data?.user?.role;
      if (role === 'admin' || role === 'superadmin') {
        setIsAdmin(true);
        const usersRes = await api.get('/admin/users');
        setUsers(usersRes.data.data?.items || usersRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to resolve current role', err);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let url = '/audit-logs';
      if (isAdmin) {
        url = '/audit-logs/admin';
        const params = [];
        if (selectedUser) params.push(`userId=${selectedUser}`);
        if (selectedAction) params.push(`action=${selectedAction}`);
        if (params.length > 0) url += `?${params.join('&')}`;
      }
      const res = await api.get(url);
      setLogs(res.data.data || []);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { checkUserRoleAndFetchFilters(); }, []);
  useEffect(() => { fetchLogs(); }, [isAdmin, selectedUser, selectedAction]);

  const uniqueActions = Object.keys(actionConfig);

  return (
    <Layout title="Security Logs">
      <div className="audit-page">
        {/* Filter Bar */}
        <div className="glass-card filter-bar animate-fadeInUp">
          <div className="filter-bar-left">
            <div className="filter-icon-wrap">
              <Filter size={16} />
            </div>
            {isAdmin && (
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="input-control filter-select">
                <option value="">All Users</option>
                {users.map(u => <option key={u.userId} value={u.userId}>{u.fullName}</option>)}
              </select>
            )}
            <select value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)} className="input-control filter-select">
              <option value="">All Actions</option>
              {uniqueActions.map(act => <option key={act} value={act}>{actionConfig[act].label}</option>)}
            </select>
          </div>
          <div className="filter-count">
            <Shield size={14} />
            <span>{logs.length} events</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="glass-card timeline-container animate-fadeInUp stagger-2">
          {loading ? (
            <div className="timeline-loading">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-md)', marginBottom: 12 }} />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <Activity size={32} />
              </div>
              <h4>No security events found</h4>
              <p>Actions like logins, uploads, and downloads will appear here.</p>
            </div>
          ) : (
            <div className="timeline">
              {logs.map((log, idx) => {
                const cfg = actionConfig[log.action] || { icon: Activity, color: 'var(--text-muted)', bg: 'var(--bg-surface)', label: log.action };
                const Icon = cfg.icon;
                const DeviceIcon = getDeviceIcon(log.userAgent);
                const fileObj = log.file || {};

                return (
                  <div key={log.logId || log._id} className={`tl-item animate-fadeInUp stagger-${Math.min(idx + 1, 8)}`}>
                    {/* Node */}
                    <div className="tl-track">
                      <div className="tl-node" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.color }}>
                        <Icon size={16} strokeWidth={2} />
                      </div>
                      {idx < logs.length - 1 && <div className="tl-line" />}
                    </div>

                    {/* Content */}
                    <div className="tl-card" style={{ borderLeftColor: cfg.color }}>
                      <div className="tl-card-top">
                        <span className="tl-action-badge" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <span className="tl-time">{getRelativeTime(log.createdAt)}</span>
                      </div>

                      <div className="tl-desc">
                        {log.action === 'LOGIN' && 'Successful authentication session started.'}
                        {log.action === 'UPLOAD_FILE' && (
                          <>Uploaded <strong>{fileObj.originalName || log.details?.originalName}</strong>
                            {log.details?.fileSize && ` (${formatBytes(log.details.fileSize)})`}
                          </>
                        )}
                        {log.action === 'DOWNLOAD_FILE' && (
                          <>Downloaded <strong>{fileObj.originalName || log.details?.originalName}</strong>
                            {log.details?.sharedLinkDownload && ' via shared link'}
                          </>
                        )}
                        {log.action === 'DELETE_FILE' && <>Moved <strong>{fileObj.originalName || log.details?.originalName}</strong> to trash</>}
                        {log.action === 'RESTORE_FILE' && <>Restored <strong>{fileObj.originalName || log.details?.originalName}</strong> from trash</>}
                        {log.action === 'PERMANENT_DELETE' && <>Permanently purged <strong>{log.details?.originalName}</strong></>}
                        {log.action === 'CREATE_SHARE' && <>Created sharing link{log.details?.recipientEmail && ` for ${log.details.recipientEmail}`}</>}
                        {log.action === 'REVOKE_SHARE' && <>Revoked share link <code>{log.details?.shareId?.slice(0, 8)}...</code></>}
                      </div>

                      <div className="tl-meta-row">
                        {isAdmin && log.user && (
                          <span className="tl-chip tl-chip-user">{log.user.fullName}</span>
                        )}
                        <span className="tl-chip">
                          <Globe size={11} /> {log.ipAddress}
                        </span>
                        <span className="tl-chip">
                          <DeviceIcon size={11} /> {parseUserAgent(log.userAgent)}
                        </span>
                        <span className="tl-chip">
                          <Calendar size={11} /> {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
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
        .audit-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Filter Bar */
        .filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          gap: 12px;
        }

        .filter-bar-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .filter-icon-wrap {
          width: 34px;
          height: 34px;
          border-radius: var(--radius-sm);
          background: var(--accent-primary-subtle);
          color: var(--accent-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .filter-select {
          min-width: 150px;
          padding: 8px 32px 8px 12px !important;
          font-size: 13px !important;
        }

        .filter-count {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-muted);
          font-weight: 500;
        }

        /* Timeline Container */
        .timeline-container {
          padding: 24px;
        }

        .timeline-loading {
          padding: 4px;
        }

        .empty-state {
          text-align: center;
          padding: 56px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .empty-icon-wrap {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-full);
          background: var(--bg-inset);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .empty-state h4 { font-size: 16px; }
        .empty-state p { color: var(--text-muted); font-size: 13px; }

        /* Timeline */
        .timeline {
          display: flex;
          flex-direction: column;
        }

        .tl-item {
          display: flex;
          gap: 16px;
        }

        .tl-track {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          width: 36px;
        }

        .tl-node {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          border: 2px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          z-index: 2;
          box-shadow: var(--shadow-sm);
        }

        .tl-line {
          width: 2px;
          flex: 1;
          background: linear-gradient(180deg, var(--border-standard), var(--border-subtle));
          margin: 4px 0;
          min-height: 16px;
        }

        .tl-item:last-child .tl-line { display: none; }

        .tl-card {
          flex: 1;
          margin-bottom: 16px;
          padding: 16px 18px;
          background: var(--bg-inset);
          border: 1px solid var(--border-subtle);
          border-left: 3px solid;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: all var(--duration-normal) var(--ease-out);
        }

        .tl-card:hover {
          border-color: var(--border-standard);
          background: var(--bg-surface);
          transform: translateX(2px);
        }

        .tl-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .tl-action-badge {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 3px 10px;
          border-radius: var(--radius-full);
        }

        .tl-time {
          font-size: 12px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .tl-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .tl-desc strong {
          color: var(--text-primary);
          font-weight: 600;
        }

        .tl-desc code {
          background: var(--bg-surface);
          padding: 1px 6px;
          border-radius: var(--radius-xs);
          font-size: 12px;
        }

        .tl-meta-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tl-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-muted);
          background: var(--bg-surface);
          padding: 3px 8px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
        }

        .tl-chip-user {
          color: var(--accent-primary);
          background: var(--accent-primary-subtle);
          border-color: hsla(217, 91%, 60%, 0.15);
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .filter-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .filter-bar-left {
            flex-wrap: wrap;
          }
          .tl-card-top {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
      `}</style>
    </Layout>
  );
};

export default AuditLogs;
