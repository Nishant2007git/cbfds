import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Bell, Search, Sun, Moon, UploadCloud, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = ({ title = 'Dashboard' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className={`app-header ${mounted ? 'header-visible' : ''}`}>
      <div className="header-left">
        <div className="search-bar-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input-field"
            placeholder="Search files, folders, users..."
          />
          <div className="search-kbd-shortcut">
            <kbd>⌘ K</kbd>
          </div>
        </div>
      </div>

      <div className="header-right">
        {/* Notification Bell with Badge */}
        <button className="header-action-btn notification-btn" title="Notifications">
          <Bell size={18} />
          <span className="notification-badge">3</span>
        </button>

        {/* Theme Toggle */}
        <button className="header-action-btn" title="Toggle Theme">
          <Moon size={18} />
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
          transition: all var(--duration-normal) var(--ease-out);
        }

        .search-input-field:focus {
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
          gap: 12px;
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

        .header-action-btn:hover {
          background: var(--bg-surface-hover);
          border-color: var(--border-standard);
          color: var(--text-primary);
          transform: translateY(-1px);
        }

        .notification-btn {
          position: relative;
        }

        .notification-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: var(--accent-rose);
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--bg-base);
        }

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

        @media (max-width: 768px) {
          .search-bar-wrapper {
            display: none;
          }
          .app-header {
            margin-bottom: 16px;
            padding: 8px 0;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
