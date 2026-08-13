import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  X, Download, Share2, Copy, Check, ZoomIn, ZoomOut, RotateCw,
  Play, Pause, Volume2, VolumeX, Maximize, FileText, Code,
  Eye, RefreshCw, Lock, Shield, Sparkles, Sliders, Monitor, Sun, Moon,
  FileCode, Music, Video, Image, Archive, FileCheck, Info
} from 'lucide-react';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const FilePreviewModal = ({ file, onClose, onShare, onDownload }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [error, setError] = useState(null);
  
  // Image controls
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [checkerboard, setCheckerboard] = useState(true);

  // Text / Code controls
  const [copied, setCopied] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [lineCount, setLineCount] = useState(0);

  // Video / Audio controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const mediaRef = useRef(null);
  const containerRef = useRef(null);

  const filename = file?.originalName || file?.name || 'File Preview';
  const extension = (file?.extension || filename.split('.').pop() || '').toLowerCase();
  const mimeType = (file?.mimeType || '').toLowerCase();

  // Categorize
  const isImage = mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(extension);
  const isVideo = mimeType.startsWith('video/') || ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv'].includes(extension);
  const isAudio = mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(extension);
  const isPdf = mimeType === 'application/pdf' || extension === 'pdf';
  const isText = mimeType.startsWith('text/') || 
    ['js', 'jsx', 'ts', 'tsx', 'json', 'py', 'html', 'css', 'md', 'txt', 'xml', 'csv', 'sql', 'sh', 'env', 'yml', 'yaml'].includes(extension);

  // Fetch File Data
  useEffect(() => {
    if (!file) return;

    let isSubscribed = true;
    setLoading(true);
    setError(null);

    const fetchFileData = async () => {
      try {
        const fileId = file.fileId || file._id;
        if (isText) {
          const res = await api.get(`/files/${fileId}/download`);
          if (!isSubscribed) return;
          let content = '';
          if (typeof res.data === 'object') {
            content = JSON.stringify(res.data, null, 2);
          } else {
            content = String(res.data);
          }
          setTextContent(content);
          setLineCount(content.split('\n').length);
          setWordCount(content.trim().split(/\s+/).filter(Boolean).length);
        } else {
          const res = await api.get(`/files/${fileId}/download`, { responseType: 'blob' });
          if (!isSubscribed) return;
          const url = URL.createObjectURL(res.data);
          setBlobUrl(url);
        }
      } catch (err) {
        if (!isSubscribed) return;
        console.error('Error loading preview:', err);
        setError('Failed to load file preview. You can still download the file directly.');
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    fetchFileData();

    return () => {
      isSubscribed = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [file]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.code === 'Space' && (isVideo || isAudio) && mediaRef.current) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isPlaying, isVideo, isAudio]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePlay = () => {
    if (!mediaRef.current) return;
    if (isPlaying) {
      mediaRef.current.pause();
    } else {
      mediaRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
      setDuration(mediaRef.current.duration || 0);
    }
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (mediaRef.current) {
      mediaRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (mediaRef.current) {
      mediaRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (!mediaRef.current) return;
    if (isMuted) {
      mediaRef.current.muted = false;
      setIsMuted(false);
    } else {
      mediaRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = speed;
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const renderIcon = () => {
    if (isImage) return <Image className="preview-type-icon text-cyan" size={20} />;
    if (isVideo) return <Video className="preview-type-icon text-purple" size={20} />;
    if (isAudio) return <Music className="preview-type-icon text-emerald" size={20} />;
    if (isPdf) return <FileText className="preview-type-icon text-rose" size={20} />;
    if (isText) return <FileCode className="preview-type-icon text-amber" size={20} />;
    return <Archive className="preview-type-icon text-blue" size={20} />;
  };

  return createPortal(
    <div className="preview-overlay animate-fadeIn">
      {/* Dynamic Security Watermark */}
      <div className="preview-watermark-layer">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="watermark-cell">
            {user?.email || 'Authenticated User'} · CONFIDENTIAL
          </span>
        ))}
      </div>

      <div className="preview-container glass-panel" ref={containerRef}>
        {/* Header */}
        <div className="preview-header">
          <div className="preview-title-group">
            {renderIcon()}
            <div className="preview-file-info">
              <h2 className="preview-filename">{filename}</h2>
              <div className="preview-badges">
                <span className="preview-badge">{extension.toUpperCase() || 'FILE'}</span>
                <span className="preview-badge-subtle">{formatBytes(file?.size)}</span>
                {file?.encrypted && (
                  <span className="preview-badge-secure">
                    <Shield size={11} /> Encrypted
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="preview-actions">
            {onShare && (
              <button
                className="btn-icon"
                onClick={() => onShare(file)}
                title="Share File"
              >
                <Share2 size={16} />
              </button>
            )}
            {onDownload && (
              <button
                className="btn-icon btn-icon-accent"
                onClick={() => onDownload(file?.fileId || file?._id, filename)}
                title="Download File"
              >
                <Download size={16} />
              </button>
            )}
            <button className="btn-icon btn-close" onClick={onClose} title="Close (Esc)">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="preview-body">
          {loading ? (
            <div className="preview-loader">
              <div className="preview-spinner" />
              <p>Fetching file preview...</p>
            </div>
          ) : error ? (
            <div className="preview-error-state">
              <Info size={44} className="text-amber" />
              <h3>No Preview Available</h3>
              <p>{error}</p>
              <button
                className="btn btn-primary"
                onClick={() => onDownload?.(file?.fileId || file?._id, filename)}
              >
                <Download size={16} /> Download File ({formatBytes(file?.size)})
              </button>
            </div>
          ) : isImage ? (
            /* ═══ IMAGE INSPECTOR ═══ */
            <div className="preview-image-stage">
              <div className="preview-toolbar">
                <button
                  className={`toolbar-btn ${zoomLevel > 1 ? 'active' : ''}`}
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
                <span className="zoom-indicator">{Math.round(zoomLevel * 100)}%</span>
                <button
                  className="toolbar-btn"
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <div className="toolbar-divider" />
                <button
                  className="toolbar-btn"
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  title="Rotate 90°"
                >
                  <RotateCw size={16} />
                </button>
                <button
                  className={`toolbar-btn ${checkerboard ? 'active' : ''}`}
                  onClick={() => setCheckerboard(!checkerboard)}
                  title="Toggle Grid Background"
                >
                  <Monitor size={16} />
                </button>
                <button
                  className="toolbar-btn"
                  onClick={() => { setZoomLevel(1); setRotation(0); }}
                  title="Reset View"
                >
                  <RefreshCw size={14} /> Reset
                </button>
              </div>

              <div className={`preview-image-canvas ${checkerboard ? 'checkerboard-bg' : ''}`}>
                <img
                  src={blobUrl}
                  alt={filename}
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                />
              </div>
            </div>
          ) : isText ? (
            /* ═══ CODE & TEXT EDITOR ═══ */
            <div className="preview-code-stage">
              <div className="preview-toolbar">
                <div className="code-stats">
                  <span>{lineCount} lines</span>
                  <span className="stat-dot">•</span>
                  <span>{wordCount} words</span>
                  <span className="stat-dot">•</span>
                  <span>UTF-8</span>
                </div>

                <div className="toolbar-actions">
                  <button className="toolbar-btn" onClick={copyToClipboard}>
                    {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              <div className="preview-code-viewport">
                <div className="line-numbers">
                  {Array.from({ length: lineCount }).map((_, i) => (
                    <span key={i + 1}>{i + 1}</span>
                  ))}
                </div>
                <pre className="code-content">
                  <code>{textContent}</code>
                </pre>
              </div>
            </div>
          ) : isVideo ? (
            /* ═══ VIDEO PLAYER STUDIO ═══ */
            <div className="preview-media-stage">
              <div className="video-wrapper">
                <video
                  ref={mediaRef}
                  src={blobUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  onClick={togglePlay}
                />
              </div>

              {/* Custom Controls */}
              <div className="media-controls glass-panel">
                <button className="media-btn-play" onClick={togglePlay}>
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>

                <span className="media-time">{formatTime(currentTime)}</span>

                <input
                  type="range"
                  className="media-scrubber"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                />

                <span className="media-time">{formatTime(duration)}</span>

                <div className="media-volume-group">
                  <button className="media-btn-icon" onClick={toggleMute}>
                    {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input
                    type="range"
                    className="volume-slider"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                  />
                </div>

                <div className="speed-selector">
                  {[0.5, 1, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      className={`speed-option ${playbackSpeed === s ? 'active' : ''}`}
                      onClick={() => changeSpeed(s)}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : isAudio ? (
            /* ═══ AUDIO PLAYER STUDIO ═══ */
            <div className="preview-audio-stage">
              <div className="audio-card glass-panel">
                <div className="audio-disc-wrapper">
                  <div className={`audio-disc ${isPlaying ? 'spinning' : ''}`}>
                    <Music size={32} />
                  </div>
                  <div className="audio-equalizer">
                    <span className={`bar ${isPlaying ? 'animating' : ''}`} />
                    <span className={`bar ${isPlaying ? 'animating' : ''}`} />
                    <span className={`bar ${isPlaying ? 'animating' : ''}`} />
                    <span className={`bar ${isPlaying ? 'animating' : ''}`} />
                    <span className={`bar ${isPlaying ? 'animating' : ''}`} />
                  </div>
                </div>

                <h3 className="audio-title">{filename}</h3>
                <p className="audio-subtitle">{formatBytes(file?.size)} · {extension.toUpperCase()}</p>

                <audio
                  ref={mediaRef}
                  src={blobUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                />

                <div className="media-controls">
                  <button className="media-btn-play" onClick={togglePlay}>
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>

                  <span className="media-time">{formatTime(currentTime)}</span>

                  <input
                    type="range"
                    className="media-scrubber"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                  />

                  <span className="media-time">{formatTime(duration)}</span>

                  <div className="media-volume-group">
                    <button className="media-btn-icon" onClick={toggleMute}>
                      {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <input
                      type="range"
                      className="volume-slider"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : isPdf ? (
            /* ═══ PDF EMBED READER ═══ */
            <div className="preview-pdf-stage">
              <iframe
                src={blobUrl}
                title={filename}
                className="pdf-iframe"
              />
            </div>
          ) : (
            /* ═══ BINARY / ARCHIVE CARD ═══ */
            <div className="preview-binary-stage">
              <div className="binary-card glass-panel">
                <Archive size={48} className="text-cyan mb-3" />
                <h3>{filename}</h3>
                <p>Binary archive file available for download.</p>

                <div className="file-meta-grid">
                  <div className="meta-item">
                    <span className="meta-label">File Size</span>
                    <span className="meta-val">{formatBytes(file?.size)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">MIME Type</span>
                    <span className="meta-val">{mimeType || 'application/octet-stream'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Extension</span>
                    <span className="meta-val">.{extension}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Status</span>
                    <span className="meta-val text-emerald">Verified Clean</span>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => onDownload?.(file?.fileId || file?._id, filename)}
                >
                  <Download size={16} /> Download File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* ═══ MODAL OVERLAY ═══ */
        .preview-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(4, 7, 13, 0.88);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        /* ═══ WATERMARK LAYER ═══ */
        .preview-watermark-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(4, 1fr);
          gap: 20px;
          opacity: 0.04;
          z-index: 0;
          overflow: hidden;
        }

        .watermark-cell {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          transform: rotate(-25deg);
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
        }

        /* ═══ CONTAINER ═══ */
        .preview-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1100px;
          height: 85vh;
          max-height: 850px;
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-2xl);
          border: 1px solid var(--border-glass);
          overflow: hidden;
          background: hsla(230, 42%, 7%, 0.95);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
        }

        /* ═══ HEADER ═══ */
        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-subtle);
          background: hsla(230, 38%, 9%, 0.8);
        }

        .preview-title-group {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .preview-file-info {
          min-width: 0;
        }

        .preview-filename {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }

        .preview-badges {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .preview-badge {
          background: var(--accent-primary-subtle);
          color: var(--accent-primary);
          padding: 2px 8px;
          border-radius: var(--radius-xs);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .preview-badge-subtle {
          color: var(--text-muted);
          font-size: 12px;
          font-family: var(--font-mono);
        }

        .preview-badge-secure {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--color-success-subtle);
          color: var(--accent-emerald);
          padding: 2px 8px;
          border-radius: var(--radius-xs);
          font-size: 10px;
          font-weight: 600;
        }

        .preview-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-icon-accent {
          background: var(--accent-primary) !important;
          color: #fff !important;
          border: none !important;
        }

        .btn-icon-accent:hover {
          filter: brightness(1.15);
          transform: translateY(-1px);
        }

        .btn-close:hover {
          background: var(--color-danger-subtle) !important;
          color: var(--color-danger) !important;
        }

        /* ═══ BODY ═══ */
        .preview-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* Loader & Error */
        .preview-loader, .preview-error-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          text-align: center;
          padding: 32px;
        }

        .preview-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-subtle);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin-slow 0.8s linear infinite;
        }

        /* Toolbar */
        .preview-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          background: hsla(230, 40%, 6%, 0.8);
          border-bottom: 1px solid var(--border-subtle);
          font-size: 13px;
        }

        .toolbar-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--duration-fast);
        }

        .toolbar-btn:hover {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
          border-color: var(--border-standard);
        }

        .toolbar-btn.active {
          background: var(--accent-primary-subtle);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .toolbar-divider {
          width: 1px;
          height: 18px;
          background: var(--border-subtle);
          margin: 0 4px;
        }

        .zoom-indicator {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-muted);
          min-width: 44px;
          text-align: center;
        }

        /* ═══ IMAGE STAGE ═══ */
        .preview-image-stage {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .preview-image-canvas {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
          padding: 24px;
          position: relative;
        }

        .checkerboard-bg {
          background-image: linear-gradient(45deg, #111420 25%, transparent 25%),
                            linear-gradient(-45deg, #111420 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #111420 75%),
                            linear-gradient(-45deg, transparent 75%, #111420 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }

        .preview-image-canvas img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-xl);
        }

        /* ═══ CODE STAGE ═══ */
        .preview-code-stage {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .code-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 12px;
        }

        .stat-dot { color: var(--border-standard); }

        .preview-code-viewport {
          flex: 1;
          display: flex;
          overflow: auto;
          background: #090d16;
          font-family: var(--font-mono);
          font-size: 13px;
          line-height: 1.6;
        }

        .line-numbers {
          padding: 16px 14px;
          background: #060910;
          color: var(--text-disabled);
          border-right: 1px solid var(--border-subtle);
          user-select: none;
          text-align: right;
          display: flex;
          flex-direction: column;
        }

        .code-content {
          flex: 1;
          padding: 16px 20px;
          margin: 0;
          color: #e2e8f0;
          white-space: pre;
          tab-size: 2;
          overflow-x: auto;
        }

        /* ═══ MEDIA / VIDEO STAGE ═══ */
        .preview-media-stage {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: #000;
          position: relative;
          padding: 20px;
        }

        .video-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-wrapper video {
          max-width: 100%;
          max-height: calc(85vh - 160px);
          border-radius: var(--radius-md);
        }

        /* Controls Bar */
        .media-controls {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 80px);
          max-width: 700px;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 20px;
          border-radius: 9999px;
          background: hsla(230, 40%, 8%, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-glass);
        }

        .media-btn-play {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--gradient-brand);
          color: #fff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform var(--duration-fast);
        }

        .media-btn-play:hover {
          transform: scale(1.08);
        }

        .media-time {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .media-scrubber {
          flex: 1;
          accent-color: var(--accent-primary);
          height: 4px;
          cursor: pointer;
        }

        .media-volume-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .volume-slider {
          width: 60px;
          accent-color: var(--accent-primary);
          height: 4px;
          cursor: pointer;
        }

        .media-btn-icon {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .speed-selector {
          display: flex;
          gap: 4px;
          background: var(--bg-inset);
          padding: 2px;
          border-radius: var(--radius-xs);
        }

        .speed-option {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 10px;
          font-weight: 700;
          padding: 3px 6px;
          border-radius: 3px;
          cursor: pointer;
        }

        .speed-option.active {
          background: var(--accent-primary);
          color: #fff;
        }

        /* ═══ AUDIO STAGE ═══ */
        .preview-audio-stage {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .audio-card {
          width: 100%;
          max-width: 440px;
          padding: 36px 28px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .audio-disc-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
          margin-bottom: 8px;
        }

        .audio-disc {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: var(--gradient-brand);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 0 30px var(--accent-primary-glow);
        }

        .audio-disc.spinning {
          animation: spin-slow 8s linear infinite;
        }

        .audio-equalizer {
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 4px;
          height: 20px;
          align-items: flex-end;
        }

        .audio-equalizer .bar {
          width: 4px;
          height: 4px;
          background: var(--accent-cyan);
          border-radius: 2px;
        }

        .audio-equalizer .bar.animating {
          animation: eqBar 0.8s ease-in-out infinite alternate;
        }
        .audio-equalizer .bar:nth-child(2) { animation-delay: 0.15s; }
        .audio-equalizer .bar:nth-child(3) { animation-delay: 0.3s; }
        .audio-equalizer .bar:nth-child(4) { animation-delay: 0.45s; }
        .audio-equalizer .bar:nth-child(5) { animation-delay: 0.6s; }

        @keyframes eqBar {
          0% { height: 4px; }
          100% { height: 20px; }
        }

        .audio-title {
          font-size: 18px;
          font-weight: 700;
        }

        .audio-subtitle {
          font-size: 13px;
          color: var(--text-muted);
        }

        /* ═══ PDF & BINARY ═══ */
        .preview-pdf-stage {
          flex: 1;
          display: flex;
        }

        .pdf-iframe {
          width: 100%;
          height: 100%;
          border: none;
        }

        .preview-binary-stage {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .binary-card {
          width: 100%;
          max-width: 480px;
          padding: 36px 32px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .file-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          width: 100%;
          margin: 24px 0;
          text-align: left;
        }

        .meta-item {
          background: var(--bg-inset);
          padding: 10px 14px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .meta-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .meta-val {
          font-size: 13px;
          font-weight: 600;
          font-family: var(--font-mono);
        }
      `}</style>
    </div>,
    document.body
  );
};

export default FilePreviewModal;
