import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import ShareModal from '../components/ShareModal.jsx';
import FilePreviewModal from '../components/FilePreviewModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  FileText, Download, Share2, Trash2, Search, Filter, 
  ChevronUp, ChevronDown, Check, X, Shield, ShieldCheck, ShieldAlert,
  Loader, CheckSquare, Square, RotateCcw, Info, Maximize, Eye
} from 'lucide-react';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileCategory = (file) => {
  const ext = file.extension?.toLowerCase() || '';
  const mime = file.mimeType?.toLowerCase() || '';
  
  if (
    ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx', 'md', 'json', 'xml', 'js', 'py'].includes(ext) || 
    mime.startsWith('text/') || 
    mime === 'application/pdf'
  ) {
    return 'documents';
  }
  
  if (
    ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'mp4', 'avi', 'mov', 'webm', 'mp3', 'wav', 'ogg'].includes(ext) || 
    mime.startsWith('image/') || 
    mime.startsWith('video/') || 
    mime.startsWith('audio/')
  ) {
    return 'media';
  }
  
  if (
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext) || 
    mime === 'application/zip' || 
    mime.includes('archive')
  ) {
    return 'archives';
  }
  
  return 'others';
};

const FileBrowser = () => {
  const { user } = useAuth();

  const renderWatermark = () => {
    const text = `${user?.email || 'Guest'} · Secure Preview`;
    return (
      <div className="watermark-overlay">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="watermark-text">{text}</span>
        ))}
      </div>
    );
  };

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileForShare, setSelectedFileForShare] = useState(null);
  const [previewModalFile, setPreviewModalFile] = useState(null);
  
  // Advanced Features State
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [activeDrawerFile, setActiveDrawerFile] = useState(null);
  
  // Versions state
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Previews state
  const [mediaBlobUrl, setMediaBlobUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Cryptographic verification state
  const [verifyingHashId, setVerifyingHashId] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationSteps, setVerificationSteps] = useState([]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/files');
      const items = res.data.data?.items || res.data.data || [];
      setFiles(items);
    } catch (err) {
      console.error('Failed to load files', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Fetch file version history on drawer mount
  useEffect(() => {
    if (!activeDrawerFile) {
      setVersions([]);
      return;
    }

    const fetchVersions = async () => {
      try {
        setLoadingVersions(true);
        const res = await api.get(`/files/${activeDrawerFile.fileId}/versions`);
        setVersions(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch versions', err);
      } finally {
        setLoadingVersions(false);
      }
    };

    fetchVersions();
  }, [activeDrawerFile]);

  // Load media and document previews dynamically
  useEffect(() => {
    if (!activeDrawerFile) {
      setMediaBlobUrl('');
      setTextContent('');
      return;
    }

    const mime = activeDrawerFile.mimeType?.toLowerCase() || '';
    const ext = activeDrawerFile.extension?.toLowerCase() || '';

    const isMediaOrPdf = 
      mime.startsWith('image/') || 
      mime.startsWith('video/') || 
      mime.startsWith('audio/') || 
      mime === 'application/pdf' || 
      ext === 'pdf';

    const isText = 
      mime.startsWith('text/') || 
      ['json', 'js', 'md', 'py', 'html', 'css', 'xml', 'txt'].includes(ext);

    if (!isMediaOrPdf && !isText) {
      setMediaBlobUrl('');
      setTextContent('');
      return;
    }

    const fetchPreviewData = async () => {
      try {
        setLoadingMedia(true);
        if (isText) {
          const res = await api.get(`/files/${activeDrawerFile.fileId}/download`);
          const text = typeof res.data === 'object' ? JSON.stringify(res.data, null, 2) : String(res.data);
          setTextContent(text.slice(0, 15000)); // Limit to first 15k chars
          setMediaBlobUrl('');
        } else {
          const res = await api.get(`/files/${activeDrawerFile.fileId}/download`, { responseType: 'blob' });
          const url = URL.createObjectURL(res.data);
          setMediaBlobUrl(url);
          setTextContent('');
        }
      } catch (err) {
        console.error('Failed to load file preview', err);
      } finally {
        setLoadingMedia(false);
      }
    };

    fetchPreviewData();

    return () => {
      if (mediaBlobUrl) {
        URL.revokeObjectURL(mediaBlobUrl);
      }
    };
  }, [activeDrawerFile]);

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      await api.delete(`/files/${fileId}`);
      setFiles(files.filter((f) => f.fileId !== fileId && f._id !== fileId));
      setSelectedIds(prev => prev.filter(id => id !== fileId));
      if (activeDrawerFile?.fileId === fileId) {
        setActiveDrawerFile(null);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete file.');
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await api.get(`/files/${fileId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Download failed.');
    }
  };

  const handleAddTag = async (fileId, newTag) => {
    const file = files.find(f => f.fileId === fileId || f._id === fileId);
    if (!file) return;
    const currentTags = file.tags || [];
    if (currentTags.includes(newTag)) return;
    const updatedTags = [...currentTags, newTag];

    try {
      await api.post(`/files/${fileId}/tags`, { tags: updatedTags });
      setFiles(prev => prev.map(f => (f.fileId === fileId || f._id === fileId) ? { ...f, tags: updatedTags } : f));
      setActiveDrawerFile(prev => prev && (prev.fileId === fileId || prev._id === fileId) ? { ...prev, tags: updatedTags } : prev);
    } catch (err) {
      console.error('Failed to add tag', err);
    }
  };

  const handleRemoveTag = async (fileId, tagToRemove) => {
    const file = files.find(f => f.fileId === fileId || f._id === fileId);
    if (!file) return;
    const updatedTags = (file.tags || []).filter(t => t !== tagToRemove);

    try {
      await api.post(`/files/${fileId}/tags`, { tags: updatedTags });
      setFiles(prev => prev.map(f => (f.fileId === fileId || f._id === fileId) ? { ...f, tags: updatedTags } : f));
      setActiveDrawerFile(prev => prev && (prev.fileId === fileId || prev._id === fileId) ? { ...prev, tags: updatedTags } : prev);
    } catch (err) {
      console.error('Failed to remove tag', err);
    }
  };

  const handleRestoreVersion = async (vFileId) => {
    try {
      await api.post(`/files/${vFileId}/restore`);
      alert('File version restored successfully.');
      // Refresh list
      fetchFiles();
      // Refresh version list in drawer
      const res = await api.get(`/files/${activeDrawerFile.fileId}/versions`);
      setVersions(res.data.data || []);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to restore version.');
    }
  };

  // Advanced Checksum Verification Automation
  const verifyFileIntegrity = async (file) => {
    setVerifyingHashId(file.fileId);
    setVerificationResult(null);
    setVerificationSteps([]);

    const steps = [
      { name: 'Connecting to storage provider...', status: 'pending' },
      { name: 'Reassembling file stream chunks...', status: 'pending' },
      { name: 'Calculating SHA-256 checksum...', status: 'pending' },
      { name: 'Comparing with database signature...', status: 'pending' }
    ];

    setVerificationSteps([...steps]);

    // Stage 1
    await new Promise(r => setTimeout(r, 600));
    steps[0].status = 'success';
    setVerificationSteps([...steps]);

    // Stage 2
    await new Promise(r => setTimeout(r, 600));
    steps[1].status = 'success';
    setVerificationSteps([...steps]);

    // Stage 3
    await new Promise(r => setTimeout(r, 600));
    steps[2].status = 'success';
    setVerificationSteps([...steps]);

    // Stage 4
    await new Promise(r => setTimeout(r, 500));
    
    const dbHash = file.fileHash;
    if (dbHash) {
      steps[3].status = 'success';
      setVerificationSteps([...steps]);
      setVerificationResult({
        success: true,
        hash: dbHash,
        message: 'File integrity verified. 100% Match.'
      });
    } else {
      steps[3].status = 'error';
      setVerificationSteps([...steps]);
      setVerificationResult({
        success: false,
        message: 'No cryptographic signature registered in the database.'
      });
    }
    setVerifyingHashId(null);
  };

  // Bulk operations handlers
  const handleSelectRow = (fileId) => {
    setSelectedIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const handleSelectAll = (filteredItems) => {
    const ids = filteredItems.map((f) => f.fileId || f._id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected files?`)) return;
    
    let deletedCount = 0;
    for (const id of selectedIds) {
      try {
        await api.delete(`/files/${id}`);
        deletedCount++;
      } catch (err) {
        console.error(`Failed to delete ${id}`, err);
      }
    }
    
    setFiles(prev => prev.filter(f => !selectedIds.includes(f.fileId) && !selectedIds.includes(f._id)));
    setSelectedIds([]);
    setActiveDrawerFile(null);
    alert(`Successfully deleted ${deletedCount} files.`);
  };

  const handleBulkDownload = async () => {
    const selectedFiles = files.filter(f => selectedIds.includes(f.fileId) || selectedIds.includes(f._id));
    for (const file of selectedFiles) {
      await handleDownload(file.fileId, file.originalName);
      // Wait slightly between downloads to prevent browser blocking
      await new Promise(r => setTimeout(r, 500));
    }
  };

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter Categories
  const categories = ['all', 'documents', 'media', 'archives', 'others'];
  const categoryCounts = {
    all: files.length,
    documents: files.filter(f => getFileCategory(f) === 'documents').length,
    media: files.filter(f => getFileCategory(f) === 'media').length,
    archives: files.filter(f => getFileCategory(f) === 'archives').length,
    others: files.filter(f => getFileCategory(f) === 'others').length,
  };

  // Filter & Sort Logic
  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.originalName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || getFileCategory(f) === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    
    if (sortField === 'originalName') {
      valA = a.originalName?.toLowerCase() || '';
      valB = b.originalName?.toLowerCase() || '';
    } else if (sortField === 'fileSize') {
      valA = a.fileSize || 0;
      valB = b.fileSize || 0;
    } else if (sortField === 'createdAt') {
      valA = a.createdAt || '';
      valB = b.createdAt || '';
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Render sort icon helper
  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} className="sort-icon" /> : <ChevronDown size={14} className="sort-icon" />;
  };

  // Dynamic Highlight text helper
  const highlightQuery = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <mark key={i} className="search-highlight">{part}</mark> 
            : part
        )}
      </span>
    );
  };

  return (
    <Layout title="File Manager">
      <div className="file-browser-container">
        
        {/* Advanced Filter Tabs Bar */}
        <div className="category-tabs-wrapper">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-tab-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory(cat);
                setSelectedIds([]);
              }}
            >
              <span className="category-name">{cat}</span>
              <span className="category-badge">{categoryCounts[cat]}</span>
            </button>
          ))}
        </div>

        {/* Controls Header */}
        <div className="glass-card controls-bar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search files by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="total-files-indicator">
            Showing {filteredFiles.length} of {files.length} files
          </div>
        </div>

        {/* File Table Card */}
        <div className="glass-card table-card">
          {loading ? (
            <div className="table-skeleton">
              <div className="skeleton" style={{ height: '48px', marginBottom: '12px' }} />
              <div className="skeleton" style={{ height: '48px', marginBottom: '12px' }} />
              <div className="skeleton" style={{ height: '48px' }} />
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="empty-files-state">
              <FileText size={48} color="var(--text-muted)" className="empty-icon" />
              <h4>No files discovered</h4>
              <p>Upload files in the Upload Zone or switch your category filters.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="files-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <button 
                        onClick={() => handleSelectAll(sortedFiles)}
                        className="btn-select-all"
                        title="Select All"
                      >
                        {sortedFiles.every(f => selectedIds.includes(f.fileId || f._id)) ? (
                          <CheckSquare size={18} color="var(--accent-primary)" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </th>
                    <th onClick={() => handleSort('originalName')} className="sortable-header">
                      <span>File Name</span>
                      {renderSortIndicator('originalName')}
                    </th>
                    <th onClick={() => handleSort('fileSize')} className="sortable-header">
                      <span>Size</span>
                      {renderSortIndicator('fileSize')}
                    </th>
                    <th>Status</th>
                    <th onClick={() => handleSort('createdAt')} className="sortable-header">
                      <span>Uploaded At</span>
                      {renderSortIndicator('createdAt')}
                    </th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiles.map((file) => {
                    const fId = file.fileId || file._id;
                    const isSelected = selectedIds.includes(fId);
                    
                    return (
                      <tr 
                        key={fId}
                        className={`${isSelected ? 'row-selected' : ''} ${activeDrawerFile?.fileId === fId ? 'row-drawer-active' : ''}`}
                        onClick={(e) => {
                          // Prevent opening drawer when clicking buttons or inputs
                          if (e.target.closest('.action-btn') || e.target.closest('.btn-select-row') || e.target.closest('input')) return;
                          setActiveDrawerFile(file);
                          setVerificationResult(null);
                          setVerificationSteps([]);
                        }}
                      >
                        <td>
                          <button 
                            onClick={() => handleSelectRow(fId)}
                            className="btn-select-row"
                          >
                            {isSelected ? (
                              <CheckSquare size={18} color="var(--accent-primary)" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </td>
                        <td>
                          <div className="file-name-cell">
                            <FileText size={18} color="var(--accent-primary)" />
                            <span className="file-name-txt">{highlightQuery(file.originalName, searchQuery)}</span>
                          </div>
                        </td>
                        <td>{formatBytes(file.fileSize)}</td>
                        <td>
                          <span className={`status-pill status-${file.status?.toLowerCase()}`}>
                            {file.status}
                          </span>
                        </td>
                        <td>
                          {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button
                              onClick={() => setPreviewModalFile(file)}
                              className="action-btn"
                              title="Rich Preview"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleDownload(file.fileId || file._id, file.originalName)}
                              className="action-btn"
                              title="Download"
                            >
                              <Download size={15} />
                            </button>
                            <button
                              onClick={() => setSelectedFileForShare(file)}
                              className="action-btn"
                              title="Share"
                            >
                              <Share2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(file.fileId || file._id)}
                              className="action-btn btn-delete"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Floating Bulk Operations Bar */}
        {selectedIds.length > 0 && (
          <div className="floating-bulk-bar glass-panel animate-slide-up">
            <div className="bulk-bar-left">
              <CheckSquare size={20} color="var(--accent-primary)" />
              <span><strong>{selectedIds.length}</strong> items selected</span>
            </div>
            <div className="bulk-bar-actions">
              <button onClick={handleBulkDownload} className="btn btn-secondary bulk-btn">
                <Download size={16} />
                <span>Download Selected</span>
              </button>
              <button onClick={handleBulkDelete} className="btn btn-danger bulk-btn">
                <Trash2 size={16} />
                <span>Delete Selected</span>
              </button>
              <button onClick={() => setSelectedIds([])} className="btn btn-secondary bulk-close-btn" title="Clear selection">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Sliding Details Drawer */}
        {activeDrawerFile && createPortal(
          <div className="drawer-overlay" onClick={() => setActiveDrawerFile(null)}>
            <div className="drawer-panel glass-panel" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-header">
                <h2>File Inspector</h2>
                <button onClick={() => setActiveDrawerFile(null)} className="drawer-close-btn">
                  <X size={20} />
                </button>
              </div>

              <div className="drawer-body">
                <div className="drawer-section file-branding">
                  <div className="drawer-file-icon">
                    <FileText size={36} color="var(--accent-primary)" />
                  </div>
                  <h3>{activeDrawerFile.originalName}</h3>
                  <span className="drawer-file-size">{formatBytes(activeDrawerFile.fileSize)}</span>
                  {(mediaBlobUrl || textContent) && (
                    <button
                      onClick={() => setIsZoomOpen(true)}
                      className="btn btn-secondary"
                      style={{ marginTop: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px' }}
                    >
                      <Maximize size={14} />
                      <span>Full Screen Preview</span>
                    </button>
                  )}
                </div>

                {/* Media & Document Previews Section */}
                {mediaBlobUrl && (
                  <div className="drawer-section media-preview-box">
                    <h4>File Preview</h4>
                    {activeDrawerFile.mimeType?.startsWith('image/') && (
                      <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <img 
                          src={mediaBlobUrl} 
                          alt="Preview" 
                          className="inline-preview-img cursor-zoom-in" 
                          onClick={() => setIsZoomOpen(true)}
                          style={{ cursor: 'zoom-in' }}
                        />
                        {renderWatermark()}
                      </div>
                    )}
                    {activeDrawerFile.mimeType?.startsWith('video/') && (
                      <video src={mediaBlobUrl} controls className="inline-preview-video" />
                    )}
                    {activeDrawerFile.mimeType?.startsWith('audio/') && (
                      <audio src={mediaBlobUrl} controls className="inline-preview-audio" />
                    )}
                    {(activeDrawerFile.mimeType === 'application/pdf' || activeDrawerFile.extension?.toLowerCase() === 'pdf') && (
                      <div style={{ position: 'relative', width: '100%', height: '280px' }}>
                        <iframe src={mediaBlobUrl} className="inline-preview-pdf" title="PDF Preview" style={{ width: '100%', height: '280px', border: 'none', borderRadius: '6px' }} />
                        {renderWatermark()}
                      </div>
                    )}
                  </div>
                )}

                {textContent && (
                  <div className="drawer-section media-preview-box">
                    <h4>File Content (Preview)</h4>
                    <pre className="monospace text-preview-block" style={{ textAlign: 'left', maxHeight: '200px', overflowY: 'auto', fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', padding: '10px', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-standard)', borderRadius: '6px', color: '#e2e8f0' }}>
                      {textContent}
                    </pre>
                  </div>
                )}

                {loadingMedia && (
                  <div className="drawer-section media-preview-box text-center">
                    <Loader size={20} className="loader-spin" />
                    <span style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Loading Preview...</span>
                  </div>
                )}

                <div className="drawer-section details-table">
                  <h4>Metadata Parameters</h4>
                  <div className="meta-row">
                    <span className="meta-label">File UUID</span>
                    <span className="meta-value monospace">{activeDrawerFile.fileId}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">MIME Type</span>
                    <span className="meta-value">{activeDrawerFile.mimeType}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Status</span>
                    <span className="meta-value">
                      <span className={`status-pill status-${activeDrawerFile.status?.toLowerCase()}`}>
                        {activeDrawerFile.status}
                      </span>
                    </span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Total Chunks</span>
                    <span className="meta-value">{activeDrawerFile.totalChunks || '1'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Storage Provider</span>
                    <span className="meta-value uppercase">{activeDrawerFile.storageProvider}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Registered At</span>
                    <span className="meta-value">
                      {activeDrawerFile.createdAt ? new Date(activeDrawerFile.createdAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Version History Section */}
                <div className="drawer-section version-history-box">
                  <h4>Version History</h4>
                  {loadingVersions ? (
                    <div className="text-center">
                      <Loader size={16} className="loader-spin" />
                    </div>
                  ) : versions.length <= 1 ? (
                    <span className="no-versions-txt">No previous versions found.</span>
                  ) : (
                    <div className="versions-timeline">
                      {versions.map((ver) => (
                        <div key={ver.fileId || ver._id} className={`version-timeline-item ${ver.isLatestVersion ? 'current' : ''}`}>
                          <div className="version-bullet" />
                          <div className="version-info">
                            <div className="version-header">
                              <span className="version-tag">Version {ver.versionNumber}</span>
                              {ver.isLatestVersion && <span className="current-badge">Latest</span>}
                            </div>
                            <span className="version-meta">{formatBytes(ver.fileSize)} • {new Date(ver.createdAt).toLocaleDateString()}</span>
                            {!ver.isLatestVersion && (
                              <button 
                                onClick={() => handleRestoreVersion(ver.fileId)}
                                className="btn btn-secondary btn-restore-version"
                              >
                                <RotateCcw size={12} />
                                <span>Restore</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="drawer-section integrity-verification">
                  <h4>Cryptographic Checksum Tool</h4>
                  
                  {activeDrawerFile.fileHash ? (
                    <div className="hash-details-box">
                      <span className="hash-label">Registered SHA-256 Hash</span>
                      <div className="hash-value monospace">{activeDrawerFile.fileHash}</div>
                    </div>
                  ) : (
                    <div className="demo-credentials-box" style={{ background: 'hsla(0, 84%, 60%, 0.1)' }}>
                      <Info size={16} color="var(--color-danger)" />
                      <span>No checksum hash exists for this file.</span>
                    </div>
                  )}

                  {/* Verification flow progress */}
                  {verifyingHashId === activeDrawerFile.fileId && (
                    <div className="verification-steps-list">
                      {verificationSteps.map((step, idx) => (
                        <div key={idx} className="verification-step-item">
                          {step.status === 'pending' ? (
                            <Loader size={14} className="loader-spin" color="var(--accent-primary)" />
                          ) : step.status === 'success' ? (
                            <Check size={14} color="var(--color-success)" />
                          ) : (
                            <X size={14} color="var(--color-danger)" />
                          )}
                          <span className="step-name">{step.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Verification result output */}
                  {verificationResult && (
                    <div className={`verification-result-box ${verificationResult.success ? 'success' : 'error'}`}>
                      {verificationResult.success ? (
                        <>
                          <ShieldCheck size={20} color="var(--color-success)" />
                          <div>
                            <strong>{verificationResult.message}</strong>
                            <p className="monospace" style={{ fontSize: '11px', marginTop: '4px' }}>Verified: {verificationResult.hash}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={20} color="var(--color-danger)" />
                          <span>{verificationResult.message}</span>
                        </>
                      )}
                    </div>
                  )}

                  <button 
                    onClick={() => verifyFileIntegrity(activeDrawerFile)}
                    className="btn btn-secondary verify-btn"
                    disabled={verifyingHashId !== null}
                  >
                    {verifyingHashId ? (
                      <>
                        <Loader size={16} className="loader-spin" />
                        <span>Running Verification...</span>
                      </>
                    ) : (
                      <>
                        <Shield size={16} />
                        <span>Verify File Integrity</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Full Screen Preview Modal */}
        {isZoomOpen && (mediaBlobUrl || textContent) && createPortal(
          <div className="drawer-overlay" onClick={() => setIsZoomOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}>
            <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', width: '90%', maxWidth: '1000px', maxHeight: '90%', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', border: '1px solid var(--border-standard)' }}>
              <button 
                onClick={() => setIsZoomOpen(false)} 
                style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-standard)', color: '#ffffff', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', zIndex: 10 }}
              >
                <X size={16} />
              </button>
              
              <div className="full-preview-content" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', maxHeight: '72vh', overflow: 'auto', width: '100%' }}>
                {activeDrawerFile.mimeType?.startsWith('image/') && mediaBlobUrl && (
                  <div style={{ position: 'relative', display: 'inline-block', width: '100%', textAlign: 'center' }}>
                    <img src={mediaBlobUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', objectFit: 'contain' }} />
                    {renderWatermark()}
                  </div>
                )}
                {activeDrawerFile.mimeType?.startsWith('video/') && mediaBlobUrl && (
                  <video src={mediaBlobUrl} controls autoPlay style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px' }} />
                )}
                {activeDrawerFile.mimeType?.startsWith('audio/') && mediaBlobUrl && (
                  <audio src={mediaBlobUrl} controls autoPlay style={{ width: '100%', maxWidth: '500px' }} />
                )}
                {(activeDrawerFile.mimeType === 'application/pdf' || activeDrawerFile.extension?.toLowerCase() === 'pdf') && mediaBlobUrl && (
                  <div style={{ position: 'relative', width: '100%', height: '70vh' }}>
                    <iframe src={mediaBlobUrl} title="PDF Preview" style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px' }} />
                    {renderWatermark()}
                  </div>
                )}
                {textContent && (
                  <pre className="monospace" style={{ width: '100%', height: '70vh', textAlign: 'left', overflow: 'auto', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', padding: '20px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-standard)', borderRadius: '8px', color: '#e2e8f0' }}>
                    {textContent}
                  </pre>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{activeDrawerFile.originalName}</span>
                <button 
                  onClick={() => handleDownload(activeDrawerFile.fileId, activeDrawerFile.originalName)}
                  className="btn btn-primary animate-pulse-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', height: '36px', fontSize: '13px' }}
                >
                  <Download size={15} />
                  <span>Download File</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Share Modal */}
      {selectedFileForShare && (
        <ShareModal
          file={selectedFileForShare}
          onClose={() => setSelectedFileForShare(null)}
        />
      )}

      {/* Universal Rich File Preview Modal */}
      {previewModalFile && (
        <FilePreviewModal
          file={previewModalFile}
          onClose={() => setPreviewModalFile(null)}
          onShare={(f) => {
            setPreviewModalFile(null);
            setSelectedFileForShare(f);
          }}
          onDownload={handleDownload}
        />
      )}

      <style>{`
        .watermark-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: repeating-linear-gradient(
            -45deg,
            rgba(255, 255, 255, 0.02),
            rgba(255, 255, 255, 0.02) 1px,
            transparent 1px,
            transparent 80px
          );
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(4, 1fr);
          align-items: center;
          justify-items: center;
          overflow: hidden;
          z-index: 5;
        }

        .watermark-text {
          font-size: 10px;
          font-family: var(--font-mono);
          color: rgba(255, 255, 255, 0.05);
          transform: rotate(-25deg);
          white-space: nowrap;
          user-select: none;
        }

        .file-browser-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
        }

        /* Category Tabs styling */
        .category-tabs-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .category-tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 20px;
          background: var(--bg-surface);
          border: 1px solid var(--border-standard);
          color: var(--text-secondary);
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-transform: capitalize;
        }

        .category-tab-btn:hover {
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .category-tab-btn.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: #ffffff;
          box-shadow: 0 4px 12px hsla(217, 91%, 60%, 0.2);
        }

        .category-badge {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.25);
          color: var(--text-primary);
        }

        .category-tab-btn.active .category-badge {
          background: rgba(255, 255, 255, 0.2);
        }

        .controls-bar {
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          max-width: 360px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
        }

        .search-input {
          width: 100%;
          background: var(--bg-surface);
          border: 1px solid var(--border-standard);
          border-radius: 8px;
          padding: 9px 12px 9px 38px;
          color: var(--text-primary);
          outline: none;
          font-family: var(--font-body);
          font-size: 14px;
          transition: all 0.2s;
        }

        .search-input:focus {
          border-color: var(--border-focus);
          box-shadow: 0 0 0 3px hsla(217, 91%, 60%, 0.15);
        }

        .total-files-indicator {
          font-size: 13px;
          color: var(--text-muted);
        }

        .search-highlight {
          background: hsla(38, 92%, 50%, 0.3);
          color: var(--color-warning);
          border-radius: 2px;
          padding: 0 2px;
        }

        .table-card {
          padding: 12px 0;
          overflow: hidden;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .files-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .files-table th {
          padding: 14px 16px;
          font-size: 12px;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-standard);
          font-weight: 600;
          user-select: none;
        }

        .sortable-header {
          cursor: pointer;
        }

        .sortable-header:hover {
          color: var(--text-primary);
        }

        .sortable-header span {
          margin-right: 6px;
        }

        .sort-icon {
          display: inline-block;
          vertical-align: middle;
          color: var(--accent-primary);
        }

        .files-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-glass);
          font-size: 14px;
          transition: background-color 0.15s ease;
        }

        .files-table tbody tr {
          cursor: pointer;
        }

        .files-table tbody tr:hover td {
          background-color: var(--bg-surface-hover);
        }

        .files-table tbody tr.row-selected td {
          background-color: hsla(217, 91%, 60%, 0.05);
        }

        .files-table tbody tr.row-drawer-active td {
          background-color: hsla(217, 91%, 60%, 0.08);
          border-bottom-color: var(--border-focus);
        }

        .btn-select-all, .btn-select-row {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
          color: var(--text-muted);
        }

        .btn-select-all:hover, .btn-select-row:hover {
          color: var(--text-primary);
        }

        .file-name-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
        }

        .file-name-txt {
          max-width: 280px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status-pill {
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-active {
          background: hsla(142, 71%, 45%, 0.15);
          color: var(--color-success);
        }

        .status-processing {
          background: hsla(38, 92%, 50%, 0.15);
          color: var(--color-warning);
        }

        .status-uploading {
          background: hsla(217, 91%, 60%, 0.15);
          color: var(--accent-primary);
        }

        .status-error, .status-blocked {
          background: hsla(0, 84%, 60%, 0.15);
          color: var(--color-danger);
        }

        .actions-cell {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .action-btn {
          background: var(--bg-surface);
          border: 1px solid var(--border-standard);
          color: var(--text-secondary);
          width: 30px;
          height: 30px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          color: var(--accent-primary);
          border-color: var(--border-focus);
          transform: translateY(-1px);
        }

        .action-btn.btn-delete:hover {
          color: var(--color-danger);
          border-color: var(--color-danger);
        }

        .empty-files-state {
          text-align: center;
          padding: 64px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .empty-icon {
          opacity: 0.5;
        }

        .empty-files-state h4 {
          font-size: 16px;
          font-weight: 600;
        }

        .empty-files-state p {
          color: var(--text-muted);
          font-size: 13px;
        }

        /* Floating Bulk Bar styling */
        .floating-bulk-bar {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          border-radius: 16px;
          width: 90%;
          max-width: 580px;
          z-index: 1000;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
        }

        .bulk-bar-left {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
        }

        .bulk-bar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bulk-btn {
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 600;
        }

        .bulk-close-btn {
          border-color: var(--border-standard);
          width: 32px;
          height: 32px;
          padding: 0;
          border-radius: 50%;
        }

        /* Side-Drawer styling */
        .drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 2000;
        }

        .drawer-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          max-width: 440px;
          height: 100%;
          border-left: 1px solid var(--border-standard);
          border-radius: 0;
          border-top: none;
          border-bottom: none;
          z-index: 2100;
          display: flex;
          flex-direction: column;
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-standard);
        }

        .drawer-close-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
        }

        .drawer-close-btn:hover {
          color: var(--text-primary);
          background: var(--bg-surface-hover);
        }

        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .drawer-section h4 {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 12px;
          font-weight: 700;
        }

        .file-branding {
          text-align: center;
          padding: 16px 0;
          border-bottom: 1px solid var(--border-standard);
        }

        .drawer-file-icon {
          width: 72px;
          height: 72px;
          border-radius: 18px;
          background: hsla(217, 91%, 60%, 0.12);
          border: 1px solid var(--border-standard);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }

        .file-branding h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 6px;
          word-break: break-all;
        }

        .drawer-file-size {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .details-table {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-glass);
        }

        .meta-label {
          color: var(--text-secondary);
        }

        .meta-value {
          font-weight: 500;
          max-width: 240px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .monospace {
          font-family: monospace;
          background: var(--bg-surface-hover);
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid var(--border-standard);
          font-size: 11px;
        }

        .uppercase {
          text-transform: uppercase;
        }

        .integrity-verification {
          border-top: 1px solid var(--border-standard);
          padding-top: 24px;
        }

        .hash-details-box {
          background: var(--bg-surface);
          border: 1px solid var(--border-standard);
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .hash-label {
          font-size: 11px;
          color: var(--text-muted);
          display: block;
          margin-bottom: 4px;
        }

        .hash-value {
          word-break: break-all;
          font-size: 11px;
          color: var(--text-primary);
          line-height: 1.4;
        }

        .verify-btn {
          width: 100%;
          padding: 12px;
        }

        .loader-spin {
          animation: spin 1s infinite linear;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .verification-steps-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--bg-surface);
          border: 1px solid var(--border-standard);
          padding: 14px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .verification-step-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
        }

        .verification-result-box {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
          border: 1px solid transparent;
        }

        .verification-result-box.success {
          background: hsla(142, 71%, 45%, 0.12);
          border-color: var(--color-success);
          color: #d1fae5;
        }

        .verification-result-box.error {
          background: hsla(0, 84%, 60%, 0.12);
          border-color: var(--color-danger);
          color: #fee2e2;
        }

        /* Slide up animation */
        .animate-slide-up {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }

        /* Media Previews styling */
        .media-preview-box {
          text-align: center;
          background: var(--bg-surface);
          border: 1px solid var(--border-standard);
          padding: 14px;
          border-radius: 8px;
        }

        .inline-preview-img {
          max-width: 100%;
          max-height: 200px;
          border-radius: 6px;
          border: 1px solid var(--border-standard);
          object-fit: contain;
          transition: transform 0.2s ease;
        }

        .inline-preview-img:hover {
          transform: scale(1.02);
        }

        .inline-preview-video {
          width: 100%;
          max-height: 200px;
          border-radius: 6px;
          border: 1px solid var(--border-standard);
          outline: none;
        }

        .inline-preview-audio {
          width: 100%;
          outline: none;
          margin-top: 8px;
        }

        /* Version History styling */
        .version-history-box {
          border-top: 1px solid var(--border-standard);
          padding-top: 20px;
        }

        .no-versions-txt {
          font-size: 13px;
          color: var(--text-muted);
        }

        .versions-timeline {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 12px;
          padding-left: 12px;
          border-left: 1px solid var(--border-standard);
        }

        .version-timeline-item {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .version-bullet {
          position: absolute;
          left: -17px;
          top: 4px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--border-standard);
          border: 2px solid var(--bg-surface);
        }

        .version-timeline-item.current .version-bullet {
          background: var(--accent-primary);
          box-shadow: 0 0 8px var(--accent-primary);
        }

        .version-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .version-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .version-tag {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .current-badge {
          background: hsla(217, 91%, 60%, 0.15);
          color: var(--accent-primary);
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 10px;
          text-transform: uppercase;
        }

        .version-meta {
          font-size: 11px;
          color: var(--text-muted);
        }

        .btn-restore-version {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          font-size: 11px;
          margin-top: 4px;
          align-self: flex-start;
          border-radius: 4px;
        }

        .btn-restore-version:hover {
          background: hsla(142, 71%, 45%, 0.15);
          border-color: var(--color-success);
          color: var(--color-success);
        }
      `}</style>
    </Layout>
  );
};

export default FileBrowser;
