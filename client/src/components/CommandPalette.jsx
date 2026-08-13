import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import { 
  Search, Terminal, LayoutDashboard, Folder, Upload, 
  Share2, Activity, Trash2, LogOut, ChevronRight 
} from 'lucide-react';
import { createPortal } from 'react-dom';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const { logout } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Command configurations
  const commands = [
    { label: 'Go to Dashboard', action: () => navigate('/'), icon: LayoutDashboard },
    { label: 'Go to File Browser', action: () => navigate('/files'), icon: Folder },
    { label: 'Go to Upload Zone', action: () => navigate('/upload'), icon: Upload },
    { label: 'Go to Shared Links', action: () => navigate('/shares'), icon: Share2 },
    { label: 'Go to Security Logs', action: () => navigate('/audit-logs'), icon: Activity },
    { label: 'Go to Trash Bin', action: () => navigate('/trash'), icon: Trash2 },
    { label: 'Logout Session', action: () => logout(), icon: LogOut, danger: true },
  ];

  // Fetch files for inline search
  useEffect(() => {
    if (!isOpen) return;
    const fetchSearchFiles = async () => {
      try {
        setLoading(true);
        const res = await api.get('/files');
        setFiles(res.data.data?.items || res.data.data || []);
      } catch (err) {
        console.error('Failed to load files for command search', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSearchFiles();
  }, [isOpen]);

  // Global keys listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter items
  const isCommandQuery = query.startsWith('/');
  const cleanQuery = query.replace(/^\//, '').toLowerCase();

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(cleanQuery)
  );

  const filteredFiles = files.filter(file => 
    file.originalName.toLowerCase().includes(query.toLowerCase())
  );

  // Combine results
  const items = [];
  if (isCommandQuery || query === '') {
    filteredCommands.forEach(c => items.push({ type: 'command', ...c }));
  }
  if (!isCommandQuery && query !== '') {
    filteredFiles.slice(0, 5).forEach(f => items.push({ 
      type: 'file', 
      label: f.originalName, 
      action: () => navigate('/files'), // Navigate to file browser
      id: f.fileId || f._id 
    }));
    // Also suggest command list
    filteredCommands.forEach(c => items.push({ type: 'command', ...c }));
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].action();
        setIsOpen(false);
      }
    }
  };

  return createPortal(
    <div className="palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="palette-panel glass-panel animate-scaleIn" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        
        {/* Search header */}
        <div className="palette-header">
          <Search size={18} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            placeholder="Type a file name or '/' for commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="palette-esc-hint">ESC</kbd>
        </div>

        {/* Results List */}
        <div className="palette-results">
          {items.length === 0 ? (
            <div className="palette-empty">
              <span>No commands or files matching "{query}"</span>
            </div>
          ) : (
            <div className="palette-list">
              {items.map((item, idx) => {
                const Icon = item.icon || Folder;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.label + idx}
                    className={`palette-item ${isSelected ? 'selected' : ''} ${item.danger ? 'danger' : ''}`}
                    onClick={() => {
                      item.action();
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="palette-item-left">
                      <div className="item-icon-wrapper">
                        {item.type === 'command' ? <Icon size={16} /> : <Folder size={16} />}
                      </div>
                      <span className="item-label">{item.label}</span>
                      {item.type === 'file' && <span className="item-badge">File</span>}
                      {item.type === 'command' && item.label.includes('Go to') && <span className="item-badge-cmd">Cmd</span>}
                    </div>
                    <ChevronRight size={14} className="palette-arrow" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="palette-footer">
          <div className="footer-keys">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <div className="footer-mode">
            <span>Ctrl + K to toggle</span>
          </div>
        </div>

      </div>

      <style>{`
        .palette-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 15vh;
        }

        .palette-panel {
          width: 100%;
          max-width: 540px;
          border-radius: var(--radius-xl);
          border: 1px solid var(--border-standard);
          overflow: hidden;
          box-shadow: var(--shadow-xl);
          display: flex;
          flex-direction: column;
        }

        .palette-header {
          display: flex;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid var(--border-subtle);
          position: relative;
        }

        .palette-header .search-icon {
          color: var(--text-muted);
          margin-right: 12px;
        }

        .palette-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 14.5px;
          outline: none;
        }

        .palette-esc-hint {
          font-size: 9px;
          font-weight: 700;
          color: var(--text-muted);
          border: 1px solid var(--border-subtle);
          padding: 2px 6px;
          border-radius: var(--radius-xs);
          background: rgba(255,255,255,0.03);
        }

        .palette-results {
          max-height: 280px;
          overflow-y: auto;
          padding: 6px;
        }

        .palette-empty {
          padding: 24px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }

        .palette-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .palette-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--duration-fast);
        }

        .palette-item.selected {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
        }

        .palette-item.danger.selected {
          background: var(--color-danger-subtle);
          color: var(--color-danger);
        }

        .palette-item-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }

        .item-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }

        .palette-item.selected .item-icon-wrapper {
          color: var(--accent-primary);
        }

        .palette-item.danger.selected .item-icon-wrapper {
          color: var(--color-danger);
        }

        .item-label {
          font-size: 13.5px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-badge {
          background: var(--accent-primary-subtle);
          color: var(--accent-primary);
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
        }

        .item-badge-cmd {
          background: var(--accent-secondary-subtle);
          color: var(--accent-secondary);
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
        }

        .palette-arrow {
          color: var(--text-disabled);
          opacity: 0;
          transition: opacity var(--duration-fast);
        }

        .palette-item.selected .palette-arrow {
          opacity: 1;
        }

        .palette-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 18px;
          background: hsl(230, 40%, 7%);
          border-top: 1px solid var(--border-subtle);
          font-size: 11px;
          color: var(--text-muted);
        }

        .footer-keys {
          display: flex;
          gap: 12px;
        }
      `}</style>
    </div>,
    document.body
  );
};

export default CommandPalette;
