import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import { Trash2, RotateCcw, AlertTriangle, FileText, Calendar, HardDrive } from 'lucide-react';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const TrashManager = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrashFiles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/files/trash');
      setFiles(res.data.data?.items || res.data.data || []);
    } catch (err) {
      console.error('Failed to load trash files', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashFiles();
  }, []);

  const handleRestore = async (fileId) => {
    try {
      await api.post(`/files/${fileId}/restore-trash`);
      setFiles(prev => prev.filter(f => f.fileId !== fileId && f._id !== fileId));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to restore file.');
    }
  };

  const handlePermanentDelete = async (fileId) => {
    if (!window.confirm('WARNING: This will permanently delete the file metadata and all underlying binary chunks from object storage. This action cannot be undone. Proceed?')) return;
    try {
      await api.delete(`/files/${fileId}/permanent`);
      setFiles(prev => prev.filter(f => f.fileId !== fileId && f._id !== fileId));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to purge file.');
    }
  };

  return (
    <Layout title="Trash Bin">
      <div className="trash-container">
        
        {/* Warning Alert Banner */}
        <div className="warning-banner animate-fadeInUp">
          <AlertTriangle size={18} className="warning-icon" />
          <div className="warning-text">
            <strong>Recycle Bin Notice:</strong> Soft-deleted items are stored here. Restoring a file will reclaim its reference in your file browser. Permanently deleting files will purge all raw binary data and free storage space.
          </div>
        </div>

        {/* Stats Row */}
        <div className="trash-stats-row animate-fadeInUp stagger-1">
          <div className="glass-card trash-stat-card">
            <div className="trash-stat-icon red-glow">
              <Trash2 size={18} />
            </div>
            <div className="trash-stat-meta">
              <span className="stat-label">Deleted Files</span>
              <span className="stat-value text-red">{files.length}</span>
            </div>
          </div>

          <div className="glass-card trash-stat-card">
            <div className="trash-stat-icon orange-glow">
              <HardDrive size={18} />
            </div>
            <div className="trash-stat-meta">
              <span className="stat-label">Pending Recovery Size</span>
              <span className="stat-value text-orange">
                {formatBytes(files.reduce((acc, curr) => acc + (curr.fileSize || 0), 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Table List */}
        <div className="glass-card trash-table-card animate-fadeInUp stagger-2">
          {loading ? (
            <div className="table-skeleton">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 50, borderRadius: 'var(--radius-md)', marginBottom: 8 }} />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <Trash2 size={28} />
              </div>
              <h4>Trash is empty</h4>
              <p>Items deleted from the file browser will appear here for 30 days.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="trash-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>File Size</th>
                    <th>Deleted On</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.fileId || file._id}>
                      <td>
                        <div className="file-cell">
                          <div className="file-icon-wrap">
                            <FileText size={16} />
                          </div>
                          <span className="file-name" title={file.originalName}>{file.originalName}</span>
                        </div>
                      </td>
                      <td>
                        <span className="mono-text">{formatBytes(file.fileSize)}</span>
                      </td>
                      <td>
                        <div className="date-cell">
                          <Calendar size={12} />
                          <span>{new Date(file.deletedAt || file.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            onClick={() => handleRestore(file.fileId || file._id)}
                            className="btn-action restore"
                            title="Restore file"
                          >
                            <RotateCcw size={14} />
                            <span>Restore</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(file.fileId || file._id)}
                            className="btn-action purge"
                            title="Permanently purge"
                          >
                            <Trash2 size={14} />
                            <span>Purge</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      <style>{`
        .trash-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .warning-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 18px;
          background: var(--accent-amber-subtle);
          border: 1px solid hsla(38, 92%, 50%, 0.2);
          border-radius: var(--radius-lg);
        }

        .warning-icon {
          color: var(--accent-amber);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .warning-text {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .warning-text strong {
          color: var(--text-primary);
        }

        /* Stats Row */
        .trash-stats-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .trash-stat-card {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .trash-stat-icon {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .red-glow { background: var(--color-danger-subtle); color: var(--color-danger); }
        .orange-glow { background: var(--accent-orange-subtle); color: var(--accent-orange); }

        .trash-stat-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stat-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 800;
          font-family: var(--font-display);
        }

        .text-red { color: var(--color-danger); }
        .text-orange { color: var(--accent-orange); }

        /* Trash Table */
        .trash-table-card {
          padding: 20px;
        }

        .table-skeleton {
          padding: 8px 0;
        }

        .trash-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .trash-table th {
          padding: 12px 14px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-disabled);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-subtle);
        }

        .trash-table td {
          padding: 14px;
          border-bottom: 1px solid var(--border-subtle);
          font-size: 13.5px;
          vertical-align: middle;
        }

        .trash-table tr:hover td {
          background: rgba(255, 255, 255, 0.01);
        }

        .file-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 320px;
        }

        .file-icon-wrap {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.03);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .file-name {
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mono-text {
          font-family: var(--font-mono);
          color: var(--text-secondary);
        }

        .date-cell {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
        }

        .actions-cell {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .btn-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid var(--border-subtle);
          background: hsl(230, 40%, 7%);
          color: var(--text-secondary);
          transition: all var(--duration-fast);
        }

        .btn-action.restore:hover {
          border-color: var(--accent-emerald);
          color: var(--accent-emerald);
          background: var(--accent-emerald-subtle);
        }

        .btn-action.purge:hover {
          border-color: var(--color-danger);
          color: var(--color-danger);
          background: var(--color-danger-subtle);
        }

        .empty-state {
          padding: 48px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .empty-icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: hsl(230, 40%, 7%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        @media (max-width: 768px) {
          .trash-stats-row {
            grid-template-columns: 1fr;
          }
          .trash-table td:nth-child(2),
          .trash-table th:nth-child(2),
          .trash-table td:nth-child(3),
          .trash-table th:nth-child(3) {
            display: none;
          }
        }
      `}</style>
    </Layout>
  );
};

export default TrashManager;
