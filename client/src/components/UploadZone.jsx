import React, { useState } from 'react';
import * as tus from 'tus-js-client';
import { getAccessToken } from '../utils/api.js';
import {
  UploadCloud, Play, Pause, CheckCircle2, AlertCircle,
  FileText, Image, Film, Archive, File, X
} from 'lucide-react';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileIcon = (name) => {
  const ext = name?.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return { icon: Image, color: 'var(--accent-secondary)' };
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return { icon: Film, color: 'var(--accent-rose)' };
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { icon: Archive, color: 'var(--accent-amber)' };
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xls', 'xlsx'].includes(ext)) return { icon: FileText, color: 'var(--accent-primary)' };
  return { icon: File, color: 'var(--text-muted)' };
};

const CircularProgress = ({ progress, size = 44, stroke = 4 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width={size} height={size} className="circular-prog">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-inset)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={progress >= 100 ? 'var(--color-success)' : 'var(--accent-primary)'}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
      />
    </svg>
  );
};

const UploadZone = ({ onUploadComplete }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploads, setUploads] = useState([]);

  const handleFiles = (files) => {
    Array.from(files).forEach((file) => startUpload(file));
  };

  const startUpload = (file) => {
    const uploadId = Date.now() + Math.random().toString(36).substr(2, 5);
    const token = getAccessToken();
    const uploadItem = {
      id: uploadId, name: file.name, size: file.size,
      progress: 0, status: 'uploading', speed: 0, errorMessage: '', tusInstance: null
    };

    let lastBytes = 0;
    let lastTime = Date.now();

    const apiBase = import.meta.env.VITE_API_URL || '/api/v1';

    const tusUpload = new tus.Upload(file, {
      endpoint: `${apiBase}/uploads`,
      retryDelays: [0, 1000, 3000, 5000],
      headers: { Authorization: `Bearer ${token}` },
      metadata: { filename: file.name, filetype: file.type || 'application/octet-stream' },
      onError: (error) => {
        setUploads((prev) => prev.map((u) =>
          u.id === uploadId ? { ...u, status: 'error', errorMessage: error.message || 'Upload failed' } : u
        ));
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        let speed = 0;
        if (timeDiff > 0.5) {
          speed = (bytesUploaded - lastBytes) / timeDiff;
          lastBytes = bytesUploaded;
          lastTime = now;
        }
        setUploads((prev) => prev.map((u) =>
          u.id === uploadId ? { ...u, progress: percentage, speed: speed || u.speed } : u
        ));
      },
      onSuccess: () => {
        setUploads((prev) => prev.map((u) =>
          u.id === uploadId ? { ...u, progress: 100, status: 'completed' } : u
        ));
        if (onUploadComplete) onUploadComplete();
      }
    });

    uploadItem.tusInstance = tusUpload;
    setUploads((prev) => [uploadItem, ...prev]);
    tusUpload.start();
  };

  const handlePause = (id) => {
    setUploads((prev) => prev.map((u) => {
      if (u.id === id && u.tusInstance) { u.tusInstance.abort(); return { ...u, status: 'paused' }; }
      return u;
    }));
  };

  const handleResume = (id) => {
    setUploads((prev) => prev.map((u) => {
      if (u.id === id && u.tusInstance) { u.tusInstance.start(); return { ...u, status: 'uploading' }; }
      return u;
    }));
  };

  const removeUpload = (id) => {
    setUploads((prev) => prev.filter(u => u.id !== id));
  };

  const completedCount = uploads.filter(u => u.status === 'completed').length;
  const totalCount = uploads.length;

  return (
    <div className="upload-wrapper">
      {/* Drop Zone */}
      <div
        className={`drop-zone glass-panel ${dragActive ? 'drag-active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files?.length > 0) handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="drop-icon-ring">
          <div className="drop-icon-inner">
            <UploadCloud size={32} strokeWidth={1.5} />
          </div>
        </div>
        <h3 className="drop-title">Drop files to upload</h3>
        <p className="drop-subtitle">or click browse to select files from your device</p>
        <div className="drop-features">
          <span className="drop-feature">Resumable</span>
          <span className="drop-dot">·</span>
          <span className="drop-feature">Chunked</span>
          <span className="drop-dot">·</span>
          <span className="drop-feature">Any Size</span>
        </div>
        <label className="btn btn-primary drop-browse">
          <UploadCloud size={16} />
          <span>Browse Files</span>
          <input type="file" multiple style={{ display: 'none' }}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </label>
      </div>

      {/* Upload Queue */}
      {uploads.length > 0 && (
        <div className="glass-card queue-card animate-fadeInUp">
          <div className="queue-header">
            <h3>Upload Queue</h3>
            {totalCount > 0 && (
              <span className="badge badge-primary">{completedCount}/{totalCount} complete</span>
            )}
          </div>
          <div className="queue-list">
            {uploads.map((item) => {
              const { icon: FIcon, color } = getFileIcon(item.name);
              return (
                <div key={item.id} className={`queue-item ${item.status === 'completed' ? 'completed' : ''}`}>
                  <div className="queue-item-left">
                    <div className="queue-prog-ring">
                      <CircularProgress progress={item.progress} size={42} stroke={3} />
                      <div className="queue-prog-icon" style={{ color }}>
                        {item.status === 'completed' ? <CheckCircle2 size={16} color="var(--color-success)" /> :
                          item.status === 'error' ? <AlertCircle size={16} color="var(--color-danger)" /> :
                            <FIcon size={16} />}
                      </div>
                    </div>
                    <div className="queue-meta">
                      <span className="queue-name">{item.name}</span>
                      <span className="queue-stats">
                        {formatBytes(item.size)}
                        {item.status === 'uploading' && ` · ${item.progress}%`}
                        {item.status === 'uploading' && item.speed > 0 && ` · ${formatBytes(item.speed)}/s`}
                        {item.status === 'error' && ` · ${item.errorMessage}`}
                      </span>
                    </div>
                  </div>
                  <div className="queue-actions">
                    <span className={`status-chip status-${item.status}`}>{item.status}</span>
                    {item.status === 'uploading' && (
                      <button onClick={() => handlePause(item.id)} className="btn-icon" title="Pause"><Pause size={14} /></button>
                    )}
                    {item.status === 'paused' && (
                      <button onClick={() => handleResume(item.id)} className="btn-icon" title="Resume"><Play size={14} /></button>
                    )}
                    {(item.status === 'completed' || item.status === 'error') && (
                      <button onClick={() => removeUpload(item.id)} className="btn-icon" title="Dismiss"><X size={14} /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .upload-wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Drop Zone */
        .drop-zone {
          padding: 56px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          border: 2px dashed var(--border-subtle);
          transition: all var(--duration-slow) var(--ease-out);
          position: relative;
          overflow: hidden;
        }

        .drop-zone::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 40%, var(--accent-primary-subtle) 0%, transparent 60%);
          opacity: 0;
          transition: opacity var(--duration-slow);
        }

        .drop-zone.drag-active {
          border-color: var(--accent-primary);
          background: hsla(217, 91%, 60%, 0.05);
          transform: scale(1.01);
        }

        .drop-zone.drag-active::before {
          opacity: 1;
        }

        .drop-icon-ring {
          width: 80px;
          height: 80px;
          border-radius: var(--radius-full);
          background: var(--accent-primary-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          animation: bounce-gentle 3s ease-in-out infinite;
        }

        .drop-icon-ring::after {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: var(--radius-full);
          border: 2px dashed var(--accent-primary);
          opacity: 0.3;
          animation: spin-slow 12s linear infinite;
        }

        .drop-icon-inner {
          color: var(--accent-primary);
        }

        .drop-title {
          font-size: 18px;
          font-weight: 700;
          margin-top: 8px;
          position: relative;
        }

        .drop-subtitle {
          color: var(--text-muted);
          font-size: 13px;
          position: relative;
        }

        .drop-features {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 4px 0;
          position: relative;
        }

        .drop-feature {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .drop-dot {
          color: var(--text-disabled);
        }

        .drop-browse {
          margin-top: 8px;
          position: relative;
        }

        /* Queue */
        .queue-card {
          padding: 22px;
        }

        .queue-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .queue-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .queue-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: var(--bg-inset);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          transition: all var(--duration-normal) var(--ease-out);
        }

        .queue-item.completed {
          border-color: hsla(152, 69%, 41%, 0.2);
        }

        .queue-item:hover {
          border-color: var(--border-standard);
        }

        .queue-item-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
          flex: 1;
        }

        .queue-prog-ring {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .queue-prog-icon {
          position: absolute;
          display: flex;
        }

        .queue-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .queue-name {
          font-weight: 600;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .queue-stats {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .queue-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .status-chip {
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
          padding: 3px 10px;
          border-radius: var(--radius-full);
        }

        .status-chip.status-uploading { background: var(--accent-primary-subtle); color: var(--accent-primary); }
        .status-chip.status-paused { background: var(--color-warning-subtle); color: var(--accent-amber); }
        .status-chip.status-completed { background: var(--color-success-subtle); color: var(--color-success); }
        .status-chip.status-error { background: var(--color-danger-subtle); color: var(--color-danger); }
      `}</style>
    </div>
  );
};

export default UploadZone;
