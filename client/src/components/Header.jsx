import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Bell, Search, Sun, Moon, UploadCloud, Plus, Check, Shield, HardDrive, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = ({ title = 'Dashboard' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('cbfds_theme') || 'midnight');
  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      title: 'Welcome to CBFDS',
      desc: 'Your AES-256 encrypted cloud vault is online and ready.',
      time: 'Just now',
      read: false,
      icon: Shield,
      color: '#3b82f6'
    },
    {
      id: 'n2',
      title: 'Chunk Integrity Verified',
      desc: 'All chunk distribution nodes are healthy with 100% SLA.',
      time: '10m ago',
      read: false,
      icon: HardDrive,
      color: '#10b981'
    },
    {
      id: 'n3',
      title: '10 GB Free Storage Active',
      desc: 'Enjoy fast multi-threaded chunk uploads and sharing.',
      time: '1h ago',
      read: false,
      icon: Sparkles,
      color: '#a855f7'
    }
  ]);

  const notifRef = useRef(null);

  useEffect(() => {
    setMounted(true);

    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotification = (id, e) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const cycleTheme = () => {
    const nextTheme = themeMode === 'midnight' ? 'cyberpunk' : themeMode === 'cyberpunk' ? 'amoled' : 'midnight';
    setThemeMode(nextTheme);
    localStorage.setItem('cbfds_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <header className={`app-header ${mounted ? 'header-visible' : ''}`}>
      <div className="header-left">
        {/* Desktop / Laptop Search Bar */}
        <div className="search-bar-wrapper" onClick={openSearch} role="button" tabIndex={0}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input-field"
            placeholder="Search files, shares, actions... (⌘K)"
            readOnly
          />
          <div className="search-kbd-shortcut">
            <kbd>⌘ K</kbd>
          </div>
        </div>
      </div>

      <div className="header-right">
        {/* Mobile Search Button */}
        <button
          type="button"
          className="header-action-btn mobile-search-btn"
          onClick={openSearch}
          title="Search files"
        >
          <Search size={18} />
        </button>

        {/* Notification Bell with Interactive Dropdown */}
        <div className="notification-wrapper" ref={notifRef}>
          <button
            type="button"
            className={`header-action-btn notification-btn ${notificationsOpen ? 'active' : ''}`}
            title="Notifications"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>

          {notificationsOpen && (
            <div className="notification-dropdown glass-panel animate-scaleIn">
              <div className="notif-header">
                <div className="notif-title-row">
                  <h4>Notifications</h4>
                  {unreadCount > 0 && <span className="notif-pill">{unreadCount} new</span>}
                </div>
                {unreadCount > 0 && (
                  <button type="button" className="mark-read-btn" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
              </div>

              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <Bell size={24} className="empty-icon" />
                    <span>No notifications</span>
                  </div>
                ) : (
                  notifications.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className={`notif-item ${item.read ? 'read' : 'unread'}`}
                        onClick={() => {
                          setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
                        }}
                      >
                        <div className="notif-item-icon" style={{ background: `${item.color}20`, color: item.color }}>
                          <Icon size={16} />
                        </div>
                        <div className="notif-item-content">
                          <div className="notif-item-title">{item.title}</div>
                          <div className="notif-item-desc">{item.desc}</div>
                          <div className="notif-item-time">{item.time}</div>
                        </div>
                        <button
                          type="button"
                          className="notif-item-close"
                          onClick={(e) => clearNotification(item.id, e)}
                          title="Dismiss"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          className="header-action-btn theme-toggle-btn"
          title={`Theme: ${themeMode.toUpperCase()} (Click to toggle)`}
          onClick={cycleTheme}
        >
          {themeMode === 'midnight' ? <Moon size={18} /> : themeMode === 'cyberpunk' ? <Sparkles size={18} /> : <Sun size={18} />}
        </button>

        {/* Upload Button */}
        <button className="btn btn-primary header-upload-btn" onClick={() => navigate('/upload')}>
          <Plus size={16} />
          <span>Upload</span>
        </button>
      </div>

      <style>{`
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          margin-bottom: 24px;
          opacity: 0;
          transform: translateY(-8px);
          transition: all 0.5s var(--ease-out);
        }

        .header-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .header-left {
          flex: 1;
          max-width: 480px;
        }

        /* Search Bar */
        .search-bar-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          cursor: pointer;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .search-input-field {
          width: 100%;
          background: hsl(230, 40%, 7%);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          padding: 10px 14px 10px 42px;
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-size: 13.5px;
          outline: none;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out);
        }

        .search-bar-wrapper:hover .search-input-field {
          border-color: var(--accent-primary);
          background: hsl(230, 36%, 9%);
          box-shadow: 0 0 0 3px var(--accent-primary-subtle);
        }

        .search-kbd-shortcut {
          position: absolute;
          right: 14px;
          pointer-events: none;
        }

        .search-kbd-shortcut kbd {
          display: inline-flex;
          align-items: center;
          padding: 2px 6px;
          font-family: var(--font-body);
          font-size: 10px;
          font-weight: 600;
          background: hsl(230, 36%, 12%);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xs);
          color: var(--text-muted);
        }

        /* Header Actions */
        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-action-btn {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-md);
          background: hsl(230, 40%, 7%);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out);
          position: relative;
        }

        .header-action-btn:hover,
        .header-action-btn.active {
          background: var(--bg-surface-hover);
          border-color: var(--border-standard);
          color: var(--text-primary);
          transform: translateY(-1px);
        }

        .mobile-search-btn {
          display: none;
        }

        /* Notification Dropdown */
        .notification-wrapper {
          position: relative;
        }

        .notification-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: var(--accent-rose, #ef4444);
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--bg-base);
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
        }

        .notification-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 340px;
          max-width: calc(100vw - 32px);
          background: hsl(230, 38%, 9%);
          border: 1px solid var(--border-standard);
          border-radius: var(--radius-lg);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.15);
          z-index: 1000;
          overflow: hidden;
        }

        .notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .notif-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .notif-title-row h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .notif-pill {
          background: var(--accent-primary-subtle);
          color: var(--accent-primary);
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 9999px;
        }

        .mark-read-btn {
          background: none;
          border: none;
          color: var(--accent-primary);
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
        }

        .notif-list {
          max-height: 320px;
          overflow-y: auto;
        }

        .notif-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          color: var(--text-muted);
          gap: 8px;
          font-size: 13px;
        }

        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 14px;
          border-bottom: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: background 0.2s;
          position: relative;
        }

        .notif-item:last-child {
          border-bottom: none;
        }

        .notif-item:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .notif-item.unread {
          background: rgba(99, 102, 241, 0.05);
        }

        .notif-item-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .notif-item-content {
          flex: 1;
          min-width: 0;
        }

        .notif-item-title {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .notif-item-desc {
          font-size: 11.5px;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-bottom: 4px;
        }

        .notif-item-time {
          font-size: 10px;
          color: var(--text-muted);
        }

        .notif-item-close {
          background: none;
          border: none;
          color: var(--text-disabled);
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .notif-item:hover .notif-item-close {
          opacity: 1;
        }

        .notif-item-close:hover {
          color: var(--color-danger, #ef4444);
        }

        /* Upload Button */
        .header-upload-btn {
          height: 38px;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 600;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .search-bar-wrapper {
            display: none;
          }
          .mobile-search-btn {
            display: flex;
          }
          .app-header {
            margin-bottom: 14px;
            padding: 6px 0;
          }
          .header-upload-btn span {
            display: none;
          }
          .header-upload-btn {
            width: 38px;
            padding: 0;
            justify-content: center;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
