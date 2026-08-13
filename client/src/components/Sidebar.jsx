import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard, FolderKanban, UploadCloud, Shield, LogOut,
  HardDrive, Share2, Trash2, Activity, Settings, Users, FileText,
  User, ChevronRight, X, Smartphone, Bell, Eye, HelpCircle
} from 'lucide-react';

const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const mainNav = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'File Browser', path: '/files', icon: FolderKanban },
    { label: 'Upload Zone', path: '/upload', icon: UploadCloud },
    { label: 'Shared Links', path: '/shares', icon: Share2 },
    { label: 'Activity', path: '/audit-logs', icon: Activity },
    { label: 'Trash', path: '/trash', icon: Trash2 },
  ];

  const adminNav = [];
  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');
  if (isAdmin) {
    adminNav.push(
      { label: 'User Management', path: '/admin', icon: Users },
      { label: 'Security Logs', path: '/audit-logs', icon: Shield },
      { label: 'System Logs', path: '/audit-logs', icon: FileText },
    );
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const quota = user?.storageQuota || 107374182400;
  const used = user?.storageUsed || 52613248819;
  const pct = Math.min(100, Math.round((used / quota) * 100));

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path ||
      (item.path !== '/' && location.pathname.startsWith(item.path));

    return (
      <NavLink key={item.path + item.label} to={item.path} className={`sb-nav-item ${isActive ? 'active' : ''}`}>
        {isActive && <div className="sb-active-bar" />}
        <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <>
      <aside className="sidebar glass-panel">
        {/* Brand */}
        <div className="sb-brand">
          <div className="sb-logo">
            <HardDrive size={20} strokeWidth={1.8} />
          </div>
          <div className="sb-brand-text">
            <span className="sb-brand-name text-gradient">CBFDS</span>
            <span className="sb-brand-sub">Cloud File Distribution System</span>
          </div>
        </div>

        {/* Main Nav */}
        <nav className="sb-nav-group">
          {mainNav.map(renderNavItem)}
        </nav>

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="sb-divider">
              <span>ADMIN</span>
            </div>
            <nav className="sb-nav-group sb-admin-nav">
              {adminNav.map(renderNavItem)}
            </nav>
          </>
        )}

        {/* User Profile Area */}
        <div className="sb-user-section" onClick={() => setProfileOpen(true)}>
          <div className="sb-user-info">
            <div className="sb-avatar">{initials}</div>
            <div className="sb-user-meta">
              <span className="sb-user-name">{user?.fullName || 'System Admin'}</span>
              <span className="sb-user-email">{user?.email || 'admin@cbfds.com'}</span>
            </div>
          </div>
          <span className="sb-role-badge">Super Admin</span>
        </div>

        {/* Storage Section */}
        <div className="sb-storage-section">
          <div className="sb-storage-label">
            <HardDrive size={14} />
            <span>Storage</span>
          </div>
          <div className="sb-storage-text">
            <span>{formatBytes(used)} of {formatBytes(quota)} used</span>
          </div>
          <div className="progress-bar-container">
            <div className={`progress-bar-fill ${pct >= 90 ? 'progress-red' : pct >= 75 ? 'progress-amber' : 'progress-blue'}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="sb-storage-pct">{pct}%</div>
        </div>

        <button className="btn btn-secondary sb-upgrade-btn">
          Upgrade Plan
        </button>

        <button onClick={logout} className="sb-logout-btn">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav glass-panel">
        <NavLink to="/" className={`mob-link ${location.pathname === '/' ? 'active' : ''}`}>
          <LayoutDashboard size={20} strokeWidth={location.pathname === '/' ? 2.2 : 1.5} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/files" className={`mob-link ${location.pathname.startsWith('/files') ? 'active' : ''}`}>
          <FolderKanban size={20} strokeWidth={location.pathname.startsWith('/files') ? 2.2 : 1.5} />
          <span>Files</span>
        </NavLink>
        <NavLink to="/upload" className="mob-link-center">
          <div className="mob-plus-icon">
            <UploadCloud size={20} strokeWidth={2} />
          </div>
        </NavLink>
        <NavLink to="/shares" className={`mob-link ${location.pathname.startsWith('/shares') ? 'active' : ''}`}>
          <Share2 size={20} strokeWidth={location.pathname.startsWith('/shares') ? 2.2 : 1.5} />
          <span>Shares</span>
        </NavLink>
        <button onClick={() => setProfileOpen(true)} className="mob-link btn-reset">
          <User size={20} strokeWidth={1.5} />
          <span>Profile</span>
        </button>
      </nav>

      {/* Premium Profile Modal (matches the exact mobile profile layout) */}
      {profileOpen && (
        <div className="profile-overlay" onClick={() => setProfileOpen(false)}>
          <div className="profile-drawer glass-panel animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Profile</h3>
              <button className="close-btn" onClick={() => setProfileOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              {/* User Identity Info */}
              <div className="drawer-user-meta">
                <div className="drawer-avatar">{initials}</div>
                <h4 className="drawer-username">{user?.fullName || 'System Admin'}</h4>
                <span className="drawer-email">{user?.email || 'admin@cbfds.com'}</span>
                <span className="sb-role-badge">Super Admin</span>
              </div>

              {/* Settings Menu List */}
              <div className="drawer-settings-list">
                <div className="settings-item">
                  <div className="settings-item-left">
                    <User size={16} />
                    <span>Account Settings</span>
                  </div>
                  <ChevronRight size={14} className="chevron" />
                </div>

                <div className="settings-item">
                  <div className="settings-item-left">
                    <Shield size={16} />
                    <span>Security</span>
                  </div>
                  <ChevronRight size={14} className="chevron" />
                </div>

                <div className="settings-item">
                  <div className="settings-item-left">
                    <Smartphone size={16} />
                    <span>Devices</span>
                  </div>
                  <div className="badge-pill">3</div>
                </div>

                <div className="settings-item">
                  <div className="settings-item-left">
                    <Bell size={16} />
                    <span>Notifications</span>
                  </div>
                  <ChevronRight size={14} className="chevron" />
                </div>

                <div className="settings-item">
                  <div className="settings-item-left">
                    <Settings size={16} />
                    <span>Preferences</span>
                  </div>
                  <ChevronRight size={14} className="chevron" />
                </div>

                <div className="settings-item">
                  <div className="settings-item-left">
                    <HelpCircle size={16} />
                    <span>Help & Support</span>
                  </div>
                  <ChevronRight size={14} className="chevron" />
                </div>
              </div>

              {/* Logout */}
              <button onClick={() => { setProfileOpen(false); logout(); }} className="drawer-logout-btn">
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .sidebar {
          width: 250px;
          height: calc(100vh - 24px);
          position: fixed;
          top: 12px;
          left: 12px;
          display: flex;
          flex-direction: column;
          padding: 18px 12px 14px;
          z-index: var(--z-sticky);
          overflow-y: auto;
          overflow-x: hidden;
        }

        /* Brand */
        .sb-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 8px 18px;
        }

        .sb-logo {
          width: 38px; height: 38px; min-width: 38px;
          border-radius: var(--radius-md);
          background: var(--gradient-brand);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          box-shadow: 0 4px 14px var(--accent-primary-glow);
        }

        .sb-brand-text {
          display: flex; flex-direction: column;
        }

        .sb-brand-name {
          font-family: var(--font-display);
          font-size: 18px; font-weight: 800; letter-spacing: 1px;
        }

        .sb-brand-sub {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: -2px;
        }

        /* Navigation */
        .sb-nav-group {
          display: flex; flex-direction: column; gap: 2px;
        }

        .sb-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          text-decoration: none;
          font-weight: 500; font-size: 13px;
          transition: all var(--duration-normal) var(--ease-out);
          position: relative;
        }

        .sb-nav-item:hover {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
        }

        .sb-nav-item.active {
          background: var(--accent-primary-subtle);
          color: var(--accent-primary);
          font-weight: 600;
        }

        .sb-active-bar {
          position: absolute;
          left: 0; top: 50%;
          transform: translateY(-50%);
          width: 3px; height: 18px;
          background: var(--accent-primary);
          border-radius: 0 var(--radius-full) var(--radius-full) 0;
        }

        /* Divider */
        .sb-divider {
          padding: 14px 12px 6px;
          font-size: 10px; font-weight: 700;
          color: var(--text-disabled);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        /* User */
        .sb-user-section {
          margin-top: auto;
          padding: 14px 8px;
          border-top: 1px solid var(--border-glass);
          cursor: pointer;
          border-radius: var(--radius-md);
          transition: background var(--duration-normal);
        }

        .sb-user-section:hover {
          background: var(--bg-surface-hover);
        }

        .sb-user-info {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 6px;
        }

        .sb-avatar {
          width: 36px; height: 36px;
          border-radius: var(--radius-full);
          background: var(--gradient-brand);
          color: #fff;
          font-weight: 700; font-size: 13px;
          display: flex; align-items: center; justify-content: center;
        }

        .sb-user-meta {
          display: flex; flex-direction: column; min-width: 0;
        }

        .sb-user-name {
          font-size: 13px; font-weight: 600; color: var(--text-primary);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .sb-user-email {
          font-size: 11px; color: var(--text-muted);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .sb-role-badge {
          display: inline-block;
          margin-left: 46px; margin-top: 2px;
          background: var(--accent-primary-subtle);
          color: var(--accent-primary);
          padding: 2px 10px;
          border-radius: var(--radius-full);
          font-size: 10px; font-weight: 700;
          text-transform: uppercase;
          width: fit-content;
        }

        /* Storage */
        .sb-storage-section {
          padding: 10px 8px 0;
        }

        .sb-storage-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600; color: var(--text-secondary);
          margin-bottom: 6px;
        }

        .sb-storage-text {
          font-size: 11px; color: var(--text-muted); margin-bottom: 6px;
        }

        .sb-storage-pct {
          font-size: 11px; color: var(--text-muted); text-align: right; margin-top: 3px;
        }

        .sb-upgrade-btn {
          margin: 10px 8px 4px;
          width: calc(100% - 16px);
          font-size: 12px;
          padding: 8px 16px;
        }

        .sb-logout-btn {
          display: flex; align-items: center; gap: 8px;
          margin: 4px 8px;
          padding: 8px 12px;
          background: none; border: none;
          color: var(--text-muted);
          font-family: var(--font-body);
          font-size: 13px; font-weight: 500;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--duration-normal);
        }

        .sb-logout-btn:hover {
          color: var(--color-danger);
          background: var(--color-danger-subtle);
        }

        /* Mobile Bottom Nav Bar */
        .mobile-nav { display: none; }

        @media (max-width: 768px) {
          .sidebar { display: none; }
          .mobile-nav {
            display: flex;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            height: 64px;
            justify-content: space-between;
            align-items: center;
            z-index: var(--z-sticky);
            border-radius: var(--radius-xl) var(--radius-xl) 0 0;
            padding: 0 16px;
            background: hsl(230, 42%, 5%);
            border-top: 1px solid var(--border-glass);
          }
          .mob-link {
            display: flex; flex-direction: column;
            align-items: center; gap: 3px;
            color: var(--text-muted);
            text-decoration: none;
            font-size: 10px; font-weight: 500;
            padding: 6px 12px;
            border-radius: var(--radius-sm);
            transition: all var(--duration-normal);
          }
          .mob-link.active { color: var(--accent-primary); }

          .mob-link-center {
            display: flex;
            align-items: center;
            justify-content: center;
            transform: translateY(-16px);
            z-index: 10;
          }

          .mob-plus-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: var(--gradient-brand);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px var(--accent-primary-glow);
            border: 4px solid hsl(230, 42%, 5%);
            transition: transform 0.2s;
          }

          .mob-plus-icon:active {
            transform: scale(0.92);
          }

          .btn-reset {
            background: none;
            border: none;
            cursor: pointer;
            font-family: inherit;
          }
        }

        /* Drawer Overlay */
        .profile-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          z-index: var(--z-overlay);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .profile-drawer {
          width: 100%;
          max-width: 400px;
          padding: 24px;
          border-radius: var(--radius-2xl);
        }

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .drawer-header h3 {
          font-size: 16px;
          font-weight: 700;
        }

        .close-btn {
          background: none; border: none; color: var(--text-muted); cursor: pointer;
        }

        .drawer-user-meta {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 24px;
        }

        .drawer-avatar {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: var(--gradient-brand);
          color: #fff;
          font-size: 24px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
          box-shadow: 0 4px 16px var(--accent-primary-glow);
        }

        .drawer-username {
          font-size: 18px; font-weight: 700; color: var(--text-primary);
        }

        .drawer-email {
          font-size: 12.5px; color: var(--text-muted); margin-bottom: 8px;
        }

        .drawer-settings-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-bottom: 24px;
        }

        .settings-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: hsl(230, 40%, 7%);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
        }

        .settings-item:hover {
          background: var(--bg-surface-hover);
          border-color: var(--border-standard);
        }

        .settings-item-left {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .chevron {
          color: var(--text-muted);
        }

        .badge-pill {
          background: var(--accent-primary-subtle);
          color: var(--accent-primary);
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }

        .drawer-logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border-radius: var(--radius-md);
          background: var(--color-danger-subtle);
          border: 1px solid hsla(0, 84%, 60%, 0.2);
          color: var(--color-danger);
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .drawer-logout-btn:hover {
          background: var(--color-danger);
          color: #fff;
        }
      `}</style>
    </>
  );
};

export default Sidebar;
