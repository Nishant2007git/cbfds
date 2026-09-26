import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, UploadCloud, Search, Volume2, VolumeX, 
  Keyboard, ShieldCheck, Moon, Sun, Flame, Zap
} from 'lucide-react';
import { soundSpells } from '../utils/soundSpells.js';

const QuickActionDock = ({ onOpenShortcuts }) => {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(soundSpells.isMuted());
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('cbfds_theme') || 'midnight');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const handleSoundToggle = (e) => {
      setIsMuted(e.detail.muted);
    };
    window.addEventListener('cbfds-sound-toggle', handleSoundToggle);
    return () => window.removeEventListener('cbfds-sound-toggle', handleSoundToggle);
  }, []);

  const toggleSound = () => {
    const nowMuted = soundSpells.toggleMute();
    setIsMuted(nowMuted);
  };

  const cycleTheme = () => {
    soundSpells.playClick();
    const themes = ['midnight', 'cyberpunk', 'solar', 'amoled'];
    const nextIndex = (themes.indexOf(themeMode) + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    setThemeMode(nextTheme);
    localStorage.setItem('cbfds_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const triggerUpload = () => {
    soundSpells.playClick();
    navigate('/upload');
  };

  const triggerSearch = () => {
    soundSpells.playWhoosh();
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  const getThemeIcon = () => {
    switch(themeMode) {
      case 'cyberpunk': return <Zap size={16} className="text-emerald" />;
      case 'solar': return <Flame size={16} className="text-amber" />;
      case 'amoled': return <Moon size={16} className="text-cyan" />;
      default: return <Sparkles size={16} className="text-primary" />;
    }
  };

  return (
    <div className="quick-action-dock-container">
      <div className={`quick-action-dock glass-panel ${isExpanded ? 'dock-expanded' : ''}`}>
        {/* Node status badge */}
        <div className="dock-status-pill" title="AES-256 Distributed Mesh Active">
          <span className="dock-pulse-dot" />
          <span className="dock-status-text">Mesh Online</span>
        </div>

        <div className="dock-divider" />

        {/* Action: Quick Upload */}
        <button 
          className="dock-btn" 
          onClick={triggerUpload}
          title="Rapid File Upload (⌘U)"
          aria-label="Upload Files"
        >
          <UploadCloud size={16} />
          <span className="dock-tooltip">Upload</span>
        </button>

        {/* Action: Command Palette */}
        <button 
          className="dock-btn" 
          onClick={triggerSearch}
          title="Command Palette (⌘K)"
          aria-label="Command Palette"
        >
          <Search size={16} />
          <span className="dock-tooltip">Search</span>
        </button>

        {/* Action: Sound FX Toggle */}
        <button 
          className={`dock-btn ${isMuted ? 'dock-btn-muted' : 'dock-btn-active'}`}
          onClick={toggleSound}
          title={isMuted ? 'Enable Sound FX Spells' : 'Mute Sound FX'}
          aria-label="Toggle Sound Effects"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span className="dock-tooltip">{isMuted ? 'Muted' : 'Audio On'}</span>
        </button>

        {/* Action: Theme Switcher */}
        <button 
          className="dock-btn theme-dock-btn" 
          onClick={cycleTheme}
          title={`Active Theme: ${themeMode.toUpperCase()} (Click to Cycle)`}
          aria-label="Cycle Theme"
        >
          {getThemeIcon()}
          <span className="dock-tooltip">{themeMode}</span>
        </button>

        {/* Action: Shortcuts HUD */}
        <button 
          className="dock-btn" 
          onClick={() => {
            soundSpells.playWhoosh();
            onOpenShortcuts(true);
          }}
          title="Keyboard Shortcuts (?)"
          aria-label="Keyboard Shortcuts"
        >
          <Keyboard size={16} />
          <span className="dock-tooltip">Shortcuts</span>
        </button>
      </div>

      <style>{`
        .quick-action-dock-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: var(--z-sticky);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .quick-action-dock {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: var(--radius-full);
          background: hsla(230, 38%, 9%, 0.85);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid var(--border-glass);
          box-shadow: 0 10px 30px hsla(230, 50%, 3%, 0.5), inset 0 1px 0 hsla(210, 40%, 98%, 0.1);
          transition: all var(--duration-normal) var(--ease-spring);
        }

        .quick-action-dock:hover {
          box-shadow: 0 14px 40px hsla(230, 50%, 3%, 0.6), 0 0 20px var(--accent-primary-glow);
          transform: translateY(-2px);
          border-color: var(--accent-primary-subtle);
        }

        .dock-status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: hsla(160, 84%, 39%, 0.12);
          border: 1px solid hsla(160, 84%, 39%, 0.25);
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 600;
          color: var(--accent-emerald);
          user-select: none;
        }

        .dock-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent-emerald);
          box-shadow: 0 0 8px var(--accent-emerald);
          animation: pulse-ring 2s infinite;
        }

        .dock-divider {
          width: 1px;
          height: 18px;
          background: var(--border-subtle);
          margin: 0 2px;
        }

        .dock-btn {
          position: relative;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-spring);
        }

        .dock-btn:hover {
          background: var(--accent-primary-subtle);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
          transform: scale(1.12);
        }

        .dock-btn-active {
          color: var(--accent-primary);
        }

        .dock-btn-muted {
          color: var(--text-muted);
          opacity: 0.65;
        }

        .dock-tooltip {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          padding: 4px 8px;
          border-radius: var(--radius-xs);
          font-size: 10px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: all var(--duration-fast) var(--ease-out);
          box-shadow: var(--shadow-md);
          text-transform: capitalize;
        }

        .dock-btn:hover .dock-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        @media (max-width: 768px) {
          .quick-action-dock-container {
            bottom: 84px;
            right: 16px;
          }
          .dock-status-text {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default QuickActionDock;
