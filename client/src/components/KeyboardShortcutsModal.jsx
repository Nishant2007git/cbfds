import React, { useEffect } from 'react';
import { X, Command, Keyboard } from 'lucide-react';
import { soundSpells } from '../utils/soundSpells.js';

const shortcuts = [
  { group: 'Navigation & Actions', items: [
    { key: '⌘ + K / Ctrl + K', label: 'Open Command Palette & Global Search' },
    { key: '⌘ + U / Ctrl + U', label: 'Go to Rapid Upload Zone' },
    { key: '⌘ + D / Ctrl + D', label: 'Return to Dashboard' },
    { key: '⌘ + F / Ctrl + F', label: 'Open File Vault' },
    { key: '?', label: 'Open Keyboard Shortcuts' },
    { key: 'Esc', label: 'Close Modals & Drawers' },
  ]},
  { group: 'File Actions', items: [
    { key: 'Space', label: 'Quick Preview Selected File' },
    { key: 'Enter', label: 'Open File Details Drawer' },
    { key: 'Delete / Backspace', label: 'Move Selected Item to Trash' },
  ]}
];

const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        soundSpells.playWhoosh();
        onClose(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        onClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop animate-fadeIn" onClick={() => onClose(false)}>
      <div className="shortcuts-modal glass-panel animate-scaleIn" onClick={e => e.stopPropagation()}>
        <div className="shortcuts-header">
          <div className="shortcuts-title">
            <div className="shortcuts-icon-badge">
              <Keyboard size={18} />
            </div>
            <div>
              <h3>Keyboard Navigation</h3>
              <p>Power-user controls & quick access</p>
            </div>
          </div>
          <button className="btn-icon" onClick={() => onClose(false)} aria-label="Close shortcuts">
            <X size={16} />
          </button>
        </div>

        <div className="shortcuts-body">
          {shortcuts.map((group, idx) => (
            <div key={idx} className="shortcuts-group">
              <h4 className="shortcuts-group-title">{group.group}</h4>
              <div className="shortcuts-list">
                {group.items.map((item, i) => (
                  <div key={i} className="shortcut-row">
                    <span className="shortcut-label">{item.label}</span>
                    <kbd className="shortcut-key">{item.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="shortcuts-footer">
          <span>Pro tip: Press <kbd>?</kbd> anytime to summon this HUD</span>
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: hsla(230, 42%, 4%, 0.82);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: var(--z-modal);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .shortcuts-modal {
          width: 100%;
          max-width: 540px;
          background: var(--bg-surface);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          overflow: hidden;
        }

        .shortcuts-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .shortcuts-title {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .shortcuts-icon-badge {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          background: var(--accent-primary-subtle);
          color: var(--accent-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .shortcuts-title h3 {
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .shortcuts-title p {
          font-size: 12px;
          color: var(--text-muted);
        }

        .shortcuts-body {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-height: 60vh;
          overflow-y: auto;
        }

        .shortcuts-group-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--accent-primary);
          margin-bottom: 10px;
        }

        .shortcuts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .shortcut-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: var(--bg-inset);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          transition: all var(--duration-fast) var(--ease-out);
        }

        .shortcut-row:hover {
          border-color: var(--border-standard);
          background: var(--bg-card);
        }

        .shortcut-label {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .shortcut-key {
          padding: 3px 8px;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          background: var(--bg-surface);
          border: 1px solid var(--border-standard);
          color: var(--text-primary);
          border-radius: var(--radius-xs);
          box-shadow: 0 2px 0 var(--border-standard);
        }

        .shortcuts-footer {
          padding: 14px 24px;
          background: var(--bg-inset);
          border-top: 1px solid var(--border-subtle);
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
        }

        .shortcuts-footer kbd {
          padding: 2px 6px;
          font-size: 11px;
          font-family: var(--font-mono);
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xs);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};

export default KeyboardShortcutsModal;
