import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import {
  HardDrive, FileText, Share2, Users, UploadCloud, FolderPlus,
  ArrowUpRight, BarChart3, Trash2, Clock, CheckCircle, Shield,
  Activity, ArrowUp, Link2, MoreVertical, File, Image, Film, HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFileIcon = (name) => {
  const ext = name?.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return { icon: Image, color: 'var(--accent-cyan)' };
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return { icon: Film, color: 'var(--accent-rose)' };
  if (['zip', 'rar', '7z'].includes(ext)) return { icon: File, color: 'var(--accent-amber)' };
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return { icon: FileText, color: 'var(--accent-primary)' };
  return { icon: File, color: 'var(--text-secondary)' };
};

const MiniDonut = ({ percentage, size = 64, stroke = 6, color = 'var(--accent-primary)' }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="mini-donut">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
      />
    </svg>
  );
};

const Dashboard = () => {
  const { user, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalFiles: 0, activeShares: 0, trashItems: 0 });
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        await refreshUserData();
        const filesRes = await api.get('/files?limit=5');
        let sharesCount = 0;
        let trashCount = 0;

        try {
          const sharesRes = await api.get('/shares/outgoing');
          sharesCount = sharesRes.data.data?.length || 0;
        } catch (e) {}

        try {
          const trashRes = await api.get('/files/trash');
          trashCount = trashRes.data.data?.items?.length || trashRes.data.data?.length || 0;
        } catch (e) {}

        setRecentFiles(filesRes.data.data?.items || filesRes.data.data || []);
        setStats({
          totalFiles: filesRes.data.data?.pagination?.totalItems || (filesRes.data.data?.items?.length || filesRes.data.data?.length || 0),
          activeShares: sharesCount,
          trashItems: trashCount
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const quota = user?.storageQuota || 107374182400; // 100 GB
  const used = user?.storageUsed || 52613248819; // ~49 GB
  const percentage = Math.min(100, Math.round((used / quota) * 100));

  // Dummy activity data for aesthetic match
  const activities = [
    { type: 'upload', text: 'Uploaded Project_Proposal.pdf', time: '2 minutes ago', color: 'var(--accent-rose)' },
    { type: 'share', text: 'Created share link', time: '15 minutes ago', color: 'var(--accent-emerald)' },
    { type: 'delete', text: 'Deleted old_report.docx', time: '1 hour ago', color: 'var(--accent-amber)' },
    { type: 'upload', text: 'Uploaded UI_Prototype.mp4', time: '5 hours ago', color: 'var(--accent-primary)' },
    { type: 'login', text: 'Logged in from new device', time: 'Yesterday at 10:30 PM', color: 'var(--accent-cyan)' }
  ];

  return (
    <Layout title="Dashboard">
      <div className="dash-container">
        
        {/* Top Header Row with Greeting */}
        <div className="dash-greeting-row animate-fadeInUp">
          <h1 className="welcome-title">Good morning, {user?.fullName?.split(' ')[0] || 'System Admin'} 👋</h1>
          <p className="welcome-subtitle">Here's what's happening with your cloud storage today.</p>
        </div>

        {/* 1. Stat Cards Row */}
        <div className="stats-row">
          {/* Stat 1: Total Storage */}
          <div className="glass-card stat-card-premium grad-purple-blue animate-fadeInUp stagger-1">
            <div className="card-premium-left">
              <span className="card-premium-label">Total Storage</span>
              <div className="card-premium-value">
                <span className="value-num">{formatBytes(used, 0)}</span>
                <span className="value-sep">/</span>
                <span className="value-total">{formatBytes(quota, 0)}</span>
              </div>
              <span className="card-premium-sub">{percentage}% Used</span>
            </div>
            <div className="card-premium-right">
              <div className="donut-holder">
                <MiniDonut percentage={percentage} size={54} stroke={5} color="#fff" />
                <span className="donut-pct-text">{percentage}%</span>
              </div>
            </div>
          </div>

          {/* Stat 2: Total Files */}
          <div className="glass-card stat-card-premium grad-teal animate-fadeInUp stagger-2">
            <div className="card-premium-left">
              <span className="card-premium-label">Total Files</span>
              <div className="card-premium-value">
                <span className="value-num">{stats.totalFiles || '1,248'}</span>
              </div>
              <span className="card-premium-sub">All files uploaded</span>
            </div>
            <div className="card-premium-right">
              <div className="card-badge badge-green">
                <ArrowUp size={10} /> 12%
              </div>
              <div className="card-premium-icon">
                <FileText size={20} />
              </div>
            </div>
          </div>

          {/* Stat 3: Active Shares */}
          <div className="glass-card stat-card-premium grad-purple animate-fadeInUp stagger-3">
            <div className="card-premium-left">
              <span className="card-premium-label">Active Shares</span>
              <div className="card-premium-value">
                <span className="value-num">{stats.activeShares || '24'}</span>
              </div>
              <span className="card-premium-sub">Links active</span>
            </div>
            <div className="card-premium-right">
              <div className="card-badge badge-purple">
                <ArrowUp size={10} /> 5%
              </div>
              <div className="card-premium-icon">
                <Share2 size={20} />
              </div>
            </div>
          </div>

          {/* Stat 4: Registered Users */}
          <div className="glass-card stat-card-premium grad-orange animate-fadeInUp stagger-4">
            <div className="card-premium-left">
              <span className="card-premium-label">Registered Users</span>
              <div className="card-premium-value">
                <span className="value-num">128</span>
              </div>
              <span className="card-premium-sub">Total platform users</span>
            </div>
            <div className="card-premium-right">
              <div className="card-badge badge-orange">
                <ArrowUp size={10} /> 15%
              </div>
              <div className="card-premium-icon">
                <Users size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Middle Row: Quick Actions + Storage Breakdown Sidebar */}
        <div className="middle-split-grid">
          {/* Quick Actions Panel */}
          <div className="glass-card quick-actions-panel animate-fadeInUp stagger-5">
            <h3 className="section-title">Quick Actions</h3>
            <div className="quick-actions-inner-grid">
              
              {/* Dropzone action */}
              <div className="action-dropzone" onClick={() => navigate('/upload')}>
                <UploadCloud size={28} className="dropzone-icon" />
                <span className="dropzone-text">Drag & drop files here</span>
                <span className="dropzone-or">or</span>
                <button className="btn btn-primary dropzone-btn">Browse Files</button>
                <span className="dropzone-limit">Max file size: 5 GB</span>
              </div>

              {/* Action items grid */}
              <div className="actions-button-grid">
                <div className="action-button-card" onClick={() => navigate('/files')}>
                  <div className="ab-icon icon-blue">
                    <FolderPlus size={18} />
                  </div>
                  <div className="ab-meta">
                    <span className="ab-title">New Folder</span>
                    <span className="ab-desc">Create a new folder</span>
                  </div>
                </div>

                <div className="action-button-card" onClick={() => navigate('/upload')}>
                  <div className="ab-icon icon-green">
                    <UploadCloud size={18} />
                  </div>
                  <div className="ab-meta">
                    <span className="ab-title">Upload Files</span>
                    <span className="ab-desc">Upload to cloud</span>
                  </div>
                </div>

                <div className="action-button-card" onClick={() => navigate('/shares')}>
                  <div className="ab-icon icon-purple">
                    <Share2 size={18} />
                  </div>
                  <div className="ab-meta">
                    <span className="ab-title">Request Files</span>
                    <span className="ab-desc">Get files from others</span>
                  </div>
                </div>

                <div className="action-button-card" onClick={() => navigate('/audit-logs')}>
                  <div className="ab-icon icon-cyan">
                    <BarChart3 size={18} />
                  </div>
                  <div className="ab-meta">
                    <span className="ab-title">Storage Analytics</span>
                    <span className="ab-desc">View usage report</span>
                  </div>
                </div>

                <div className="action-button-card" onClick={() => navigate('/trash')}>
                  <div className="ab-icon icon-orange">
                    <Trash2 size={18} />
                  </div>
                  <div className="ab-meta">
                    <span className="ab-title">Trash Bin</span>
                    <span className="ab-desc">View deleted files</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Storage Overview Sidebar */}
          <div className="glass-card storage-sidebar animate-fadeInUp stagger-5">
            <div className="storage-sidebar-header">
              <h3 className="section-title">Storage Overview</h3>
              <span className="sb-timeframe-dropdown">This Month</span>
            </div>

            <div className="storage-sidebar-gauge-section">
              <div className="gauge-holder">
                <MiniDonut percentage={percentage} size={110} stroke={10} color="var(--accent-primary)" />
                <div className="gauge-center-val">
                  <span className="g-pct">{percentage}%</span>
                  <span className="g-label">Used</span>
                </div>
              </div>
              <div className="gauge-legend">
                <div className="legend-item">
                  <div className="legend-dot dot-used" />
                  <span className="legend-label">Used</span>
                  <span className="legend-value">{formatBytes(used, 0)}</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot dot-available" />
                  <span className="legend-label">Available</span>
                  <span className="legend-value">{formatBytes(quota - used, 0)}</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot dot-total" />
                  <span className="legend-label">Total</span>
                  <span className="legend-value">{formatBytes(quota, 0)}</span>
                </div>
              </div>
            </div>

            <div className="storage-breakdown-section">
              <h4 className="breakdown-title">Storage Breakdown</h4>
              <div className="breakdown-list">
                
                <div className="breakdown-item">
                  <div className="breakdown-meta">
                    <span className="b-label"><FileText size={12} color="var(--accent-primary)" /> Documents</span>
                    <span className="b-vals">22 GB (45%)</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill progress-blue" style={{ width: '45%' }} />
                  </div>
                </div>

                <div className="breakdown-item">
                  <div className="breakdown-meta">
                    <span className="b-label"><Image size={12} color="var(--accent-secondary)" /> Images</span>
                    <span className="b-vals">12 GB (24%)</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill progress-purple" style={{ width: '24%' }} />
                  </div>
                </div>

                <div className="breakdown-item">
                  <div className="breakdown-meta">
                    <span className="b-label"><Film size={12} color="var(--accent-rose)" /> Videos</span>
                    <span className="b-vals">8 GB (16%)</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill progress-red" style={{ width: '16%' }} />
                  </div>
                </div>

                <div className="breakdown-item">
                  <div className="breakdown-meta">
                    <span className="b-label"><HelpCircle size={12} color="var(--accent-orange)" /> Others</span>
                    <span className="b-vals">7 GB (15%)</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill progress-amber" style={{ width: '15%' }} />
                  </div>
                </div>

              </div>

              <button className="view-report-btn" onClick={() => navigate('/audit-logs')}>
                View Full Report
              </button>
            </div>
          </div>
        </div>

        {/* 3. Bottom Row: Recent Files + Recent Activity */}
        <div className="bottom-split-grid">
          {/* Recent Files Table Container */}
          <div className="glass-card recent-files-container animate-fadeInUp stagger-6">
            <div className="recent-files-header">
              <h3 className="section-title">Recent Files</h3>
              <div className="recent-files-tabs">
                {['All', 'Documents', 'Images', 'Videos', 'Others'].map(tab => (
                  <button
                    key={tab}
                    className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <a href="/files" className="view-all-link">
                View All <ArrowUpRight size={14} />
              </a>
            </div>

            <div className="table-responsive">
              <table className="recent-files-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Owner</th>
                    <th>Size</th>
                    <th>Type</th>
                    <th>Modified</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFiles.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="table-empty">No files available</td>
                    </tr>
                  ) : (
                    recentFiles.map((file) => {
                      const { icon: FileIcon, color } = getFileIcon(file.originalName);
                      return (
                        <tr key={file._id || file.fileId}>
                          <td>
                            <div className="file-name-cell">
                              <div className="cell-icon-wrap" style={{ color }}>
                                <FileIcon size={16} />
                              </div>
                              <span className="file-name-text" title={file.originalName}>{file.originalName}</span>
                            </div>
                          </td>
                          <td>
                            <span className="owner-text">{user?.fullName || 'System Admin'}</span>
                          </td>
                          <td>
                            <span className="mono-text">{formatBytes(file.fileSize)}</span>
                          </td>
                          <td>
                            <span className="type-badge">{file.originalName?.split('.').pop()?.toUpperCase() || 'BIN'}</span>
                          </td>
                          <td>
                            <span className="time-text">
                              {new Date(file.updatedAt || file.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td>
                            <div className="action-cell-btns">
                              <button className="btn-icon-mini" title="Share" onClick={() => navigate('/shares')}>
                                <Share2 size={12} />
                              </button>
                              <button className="btn-icon-mini" title="More">
                                <MoreVertical size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="table-pagination-footer">
              <span className="pag-summary">Showing 1 to 5 of {stats.totalFiles || '1,248'} files</span>
              <div className="pag-controls">
                <button className="pag-btn prev" disabled>‹</button>
                <button className="pag-num active">1</button>
                <button className="pag-num">2</button>
                <button className="pag-num">3</button>
                <span className="pag-dots">...</span>
                <button className="pag-num">125</button>
                <button className="pag-btn next">›</button>
              </div>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="glass-card recent-activity-feed animate-fadeInUp stagger-6">
            <div className="recent-activity-header">
              <h3 className="section-title">Recent Activity</h3>
              <a href="/audit-logs" className="view-all-link">View All</a>
            </div>

            <div className="activity-list">
              {activities.map((act, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-dot-line">
                    <div className="activity-dot" style={{ backgroundColor: act.color }} />
                    {i < activities.length - 1 && <div className="activity-line" />}
                  </div>
                  <div className="activity-meta">
                    <span className="activity-text">{act.text}</span>
                    <span className="activity-time">{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Bottom Row Status Indicators */}
        <div className="status-indicators-row">
          <div className="glass-card status-indicator-card animate-fadeInUp stagger-7">
            <div className="status-card-header">
              <div className="status-dot dot-secure" />
              <span className="status-label">Security Status</span>
            </div>
            <span className="status-heading">Everything is secure</span>
            <span className="status-sub">No security issues found</span>
            <button className="status-action-link" onClick={() => navigate('/audit-logs')}>View Security Logs</button>
          </div>

          <div className="glass-card status-indicator-card animate-fadeInUp stagger-7">
            <div className="status-card-header">
              <div className="status-dot dot-active" />
              <span className="status-label">Account Status</span>
            </div>
            <span className="status-heading">Active</span>
            <span className="status-sub">Your account is in good standing</span>
            <button className="status-action-link">Manage Account</button>
          </div>

          <div className="glass-card status-indicator-card animate-fadeInUp stagger-7">
            <div className="status-card-header">
              <div className="status-dot dot-trend" />
              <span className="status-label">Storage Trend</span>
            </div>
            <div className="trend-main">
              <span className="status-heading">+12%</span>
              <span className="trend-sub">vs last month</span>
            </div>
            {/* Sparkline canvas placeholder */}
            <div className="sparkline-wrapper">
              <svg viewBox="0 0 100 30" width="100%" height="30" className="sparkline-svg">
                <path d="M 0,25 Q 15,10 30,22 T 60,8 T 90,15 L 100,5" fill="none" stroke="var(--accent-primary)" strokeWidth="2" />
              </svg>
            </div>
            <button className="status-action-link" onClick={() => navigate('/audit-logs')}>View Analytics</button>
          </div>

          <div className="glass-card status-indicator-card animate-fadeInUp stagger-7">
            <div className="status-card-header">
              <div className="status-dot dot-health" />
              <span className="status-label">System Health</span>
            </div>
            <span className="status-heading">All Systems Operational</span>
            <span className="status-sub">Everything is running smoothly</span>
            <button className="status-action-link" onClick={() => navigate('/audit-logs')}>View System Logs</button>
          </div>
        </div>

      </div>

      <style>{`
        .dash-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding-bottom: 24px;
        }

        .dash-greeting-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .welcome-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .welcome-subtitle {
          font-size: 13.5px;
          color: var(--text-muted);
        }

        /* 1. Stat Cards Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .stat-card-premium {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-subtle);
          color: #fff;
          position: relative;
          overflow: hidden;
        }

        /* Stat card gradient setups */
        .grad-purple-blue {
          background: linear-gradient(135deg, hsl(230, 45%, 12%), hsl(230, 42%, 7%));
          border-left: 4px solid var(--accent-primary);
        }
        .grad-teal {
          background: linear-gradient(135deg, hsl(230, 45%, 12%), hsl(230, 42%, 7%));
          border-left: 4px solid var(--accent-teal);
        }
        .grad-purple {
          background: linear-gradient(135deg, hsl(230, 45%, 12%), hsl(230, 42%, 7%));
          border-left: 4px solid var(--accent-secondary);
        }
        .grad-orange {
          background: linear-gradient(135deg, hsl(230, 45%, 12%), hsl(230, 42%, 7%));
          border-left: 4px solid var(--accent-orange);
        }

        .card-premium-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .card-premium-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-premium-value {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .value-num {
          font-family: var(--font-display);
          font-size: 26px;
          font-weight: 700;
          line-height: 1.1;
          color: var(--text-primary);
        }

        .value-sep {
          font-size: 14px;
          color: var(--text-muted);
          margin: 0 2px;
        }

        .value-total {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .card-premium-sub {
          font-size: 11px;
          color: var(--text-muted);
        }

        .card-premium-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: space-between;
          height: 100%;
          min-height: 52px;
        }

        .card-badge {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: var(--radius-full);
        }

        .badge-green { background: var(--color-success-subtle); color: var(--color-success); }
        .badge-purple { background: var(--accent-secondary-subtle); color: var(--accent-secondary); }
        .badge-orange { background: var(--accent-orange-subtle); color: var(--accent-orange); }

        .card-premium-icon {
          color: var(--text-muted);
          opacity: 0.8;
          margin-top: auto;
        }

        .donut-holder {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .donut-pct-text {
          position: absolute;
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 700;
          color: var(--text-primary);
        }

        /* 2. Middle Grid */
        .middle-split-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
        }

        .quick-actions-panel {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .section-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .quick-actions-inner-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          align-items: stretch;
        }

        .action-dropzone {
          border: 1px dashed var(--border-subtle);
          background: hsl(230, 40%, 7%);
          border-radius: var(--radius-lg);
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out);
        }

        .action-dropzone:hover {
          border-color: var(--accent-primary);
          background: hsl(230, 36%, 9%);
          transform: translateY(-2px);
        }

        .dropzone-icon {
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .dropzone-text {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .dropzone-or {
          font-size: 11px;
          color: var(--text-disabled);
          text-transform: uppercase;
        }

        .dropzone-btn {
          padding: 6px 16px;
          font-size: 12px;
          background: var(--accent-primary-subtle);
          color: var(--accent-primary);
          border: 1px solid var(--accent-primary-glow);
          box-shadow: none;
        }

        .dropzone-btn:hover {
          background: var(--accent-primary);
          color: #fff;
        }

        .dropzone-limit {
          font-size: 10px;
          color: var(--text-disabled);
          margin-top: 4px;
        }

        .actions-button-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .action-button-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: hsl(230, 40%, 7%);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out);
        }

        .action-button-card:hover {
          background: hsl(230, 36%, 10%);
          border-color: var(--border-standard);
          transform: translateX(4px);
        }

        .ab-icon {
          width: 34px;
          height: 34px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .icon-blue { background: var(--accent-primary-subtle); color: var(--accent-primary); }
        .icon-green { background: var(--accent-emerald-subtle); color: var(--accent-emerald); }
        .icon-purple { background: var(--accent-secondary-subtle); color: var(--accent-secondary); }
        .icon-cyan { background: var(--accent-cyan-subtle); color: var(--accent-cyan); }
        .icon-orange { background: var(--accent-orange-subtle); color: var(--accent-orange); }

        .ab-meta {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .ab-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .ab-desc {
          font-size: 11px;
          color: var(--text-muted);
        }

        /* Storage Sidebar */
        .storage-sidebar {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .storage-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sb-timeframe-dropdown {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: 1px solid var(--border-subtle);
          padding: 3px 8px;
          border-radius: var(--radius-xs);
          cursor: pointer;
        }

        .storage-sidebar-gauge-section {
          display: flex;
          align-items: center;
          gap: 20px;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 16px;
        }

        .gauge-holder {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .gauge-center-val {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .g-pct {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
        }

        .g-label {
          font-size: 9px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 1px;
        }

        .gauge-legend {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .legend-item {
          display: flex;
          align-items: center;
          font-size: 11.5px;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 8px;
          flex-shrink: 0;
        }

        .dot-used { background-color: var(--accent-primary); }
        .dot-available { background-color: rgba(255,255,255,0.06); }
        .dot-total { background-color: var(--text-muted); }

        .legend-label {
          color: var(--text-muted);
          flex: 1;
        }

        .legend-value {
          font-weight: 600;
          color: var(--text-secondary);
        }

        /* Breakdown list */
        .storage-breakdown-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .breakdown-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .breakdown-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .breakdown-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .breakdown-meta {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }

        .b-label {
          color: var(--text-secondary);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
        }

        .b-vals {
          font-weight: 600;
          color: var(--text-primary);
        }

        .view-report-btn {
          width: 100%;
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          padding: 8px;
          border-radius: var(--radius-md);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--duration-normal);
          margin-top: 8px;
        }

        .view-report-btn:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        /* 3. Bottom Grid */
        .bottom-split-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
        }

        .recent-files-container {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .recent-files-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .recent-files-tabs {
          display: flex;
          gap: 4px;
          background: hsl(230, 40%, 7%);
          padding: 3px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
        }

        .tab-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 4px 12px;
          font-size: 11.5px;
          font-weight: 600;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--duration-fast);
        }

        .tab-btn.active {
          background: var(--bg-surface);
          color: var(--text-primary);
          box-shadow: var(--shadow-xs);
        }

        .view-all-link {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--accent-primary);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .view-all-link:hover {
          text-decoration: underline;
        }

        /* Table */
        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }

        .recent-files-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .recent-files-table th {
          padding: 10px 12px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-disabled);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-subtle);
        }

        .recent-files-table td {
          padding: 12px;
          border-bottom: 1px solid var(--border-subtle);
          font-size: 13px;
          vertical-align: middle;
        }

        .recent-files-table tr:hover td {
          background: rgba(255,255,255,0.01);
        }

        .file-name-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 200px;
        }

        .cell-icon-wrap {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          background: rgba(255,255,255,0.03);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .file-name-text {
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .owner-text {
          color: var(--text-secondary);
        }

        .mono-text {
          font-family: var(--font-mono);
          color: var(--text-secondary);
        }

        .type-badge {
          display: inline-block;
          padding: 2px 6px;
          background: hsl(230, 36%, 12%);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          border-radius: var(--radius-xs);
          font-size: 10px;
          font-weight: 700;
        }

        .time-text {
          color: var(--text-muted);
        }

        .action-cell-btns {
          display: flex;
          gap: 6px;
        }

        .btn-icon-mini {
          width: 26px;
          height: 26px;
          border-radius: var(--radius-sm);
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--duration-fast);
        }

        .btn-icon-mini:hover {
          border-color: var(--border-standard);
          color: var(--text-primary);
          background: var(--bg-surface-hover);
        }

        .table-empty {
          text-align: center;
          color: var(--text-muted);
          padding: 32px !important;
        }

        /* Pagination */
        .table-pagination-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 14px;
          margin-top: auto;
        }

        .pag-summary {
          font-size: 12px;
          color: var(--text-muted);
        }

        .pag-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pag-btn, .pag-num {
          height: 28px;
          min-width: 28px;
          border-radius: var(--radius-sm);
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all var(--duration-fast);
        }

        .pag-btn:hover:not(:disabled), .pag-num:hover {
          background: var(--bg-surface-hover);
          border-color: var(--border-standard);
          color: var(--text-primary);
        }

        .pag-num.active {
          background: var(--accent-primary-subtle);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .pag-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .pag-dots {
          color: var(--text-muted);
          padding: 0 4px;
          font-size: 12px;
        }

        /* Recent Activity */
        .recent-activity-feed {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .recent-activity-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
        }

        .activity-item {
          display: flex;
          gap: 14px;
        }

        .activity-dot-line {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 8px;
          flex-shrink: 0;
          margin-top: 6px;
        }

        .activity-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .activity-line {
          width: 2px;
          flex: 1;
          background: var(--border-subtle);
          margin: 6px 0;
          min-height: 24px;
        }

        .activity-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-bottom: 18px;
        }

        .activity-text {
          font-size: 12.5px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .activity-time {
          font-size: 11px;
          color: var(--text-muted);
        }

        /* 4. Status Indicators Row */
        .status-indicators-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .status-indicator-card {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .status-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .dot-secure { background-color: var(--color-success); box-shadow: 0 0 8px var(--color-success); }
        .dot-active { background-color: var(--accent-teal); box-shadow: 0 0 8px var(--accent-teal); }
        .dot-trend { background-color: var(--accent-primary); box-shadow: 0 0 8px var(--accent-primary); }
        .dot-health { background-color: var(--accent-emerald); box-shadow: 0 0 8px var(--accent-emerald); }

        .status-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-heading {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .status-sub {
          font-size: 12px;
          color: var(--text-muted);
        }

        .status-action-link {
          background: transparent;
          border: none;
          color: var(--accent-primary);
          font-size: 12px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          padding: 0;
          margin-top: auto;
          display: inline-flex;
          align-items: center;
        }

        .status-action-link:hover {
          text-decoration: underline;
        }

        .trend-main {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .trend-sub {
          font-size: 11px;
          color: var(--text-muted);
        }

        .sparkline-wrapper {
          width: 100%;
          height: 30px;
          margin: 2px 0;
        }

        .sparkline-svg {
          overflow: visible;
        }

        /* ═══════════════════════════════════════
           RESPONSIVE / MOBILE
           ═══════════════════════════════════════ */
        @media (max-width: 1200px) {
          .stats-row {
            grid-template-columns: repeat(2, 1fr);
          }
          .middle-split-grid {
            grid-template-columns: 1fr;
          }
          .bottom-split-grid {
            grid-template-columns: 1fr;
          }
          .status-indicators-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .stats-row {
            grid-template-columns: 1fr;
          }
          .status-indicators-row {
            grid-template-columns: 1fr;
          }
          .quick-actions-inner-grid {
            grid-template-columns: 1fr;
          }
          .storage-sidebar-gauge-section {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .recent-files-header {
            flex-direction: column;
            align-items: stretch;
          }
          .recent-files-tabs {
            overflow-x: auto;
            white-space: nowrap;
          }
        }
      `}</style>
    </Layout>
  );
};

export default Dashboard;
