import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import { Shield, Users, Edit, RefreshCw, Save, CheckCircle2 } from 'lucide-react';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const AdminPortal = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newQuotaGB, setNewQuotaGB] = useState('');
  const [msg, setMsg] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      const items = res.data.data?.items || [];
      setUsers(items);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateQuota = async (userId) => {
    const quotaBytes = parseFloat(newQuotaGB) * 1073741824; // convert GB to Bytes
    if (isNaN(quotaBytes) || quotaBytes <= 0) {
      alert('Please enter a valid positive number for GB quota.');
      return;
    }

    try {
      await api.put(`/admin/users/${userId}/quota`, { storageQuota: quotaBytes });
      setMsg(`Updated user quota to ${newQuotaGB} GB.`);
      setEditingUserId(null);
      setNewQuotaGB('');
      fetchUsers();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update quota.');
    }
  };

  const handleRecalculate = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/recalculate`);
      setMsg('Quota storage audit triggered successfully.');
      fetchUsers();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Audit failed.');
    }
  };

  return (
    <Layout title="Administrative Control Portal">
      <div className="admin-portal-wrapper">
        {msg && (
          <div className="glass-card success-banner">
            <CheckCircle2 size={18} color="var(--color-success)" />
            <span>{msg}</span>
          </div>
        )}

        <div className="glass-card admin-table-card">
          <div className="card-header-flex">
            <div className="header-title-flex">
              <Users size={20} color="var(--accent-primary)" />
              <h3>User Directory & Quota Management</h3>
            </div>
          </div>

          {loading ? (
            <div className="skeleton-container">
              <div className="skeleton" style={{ height: '48px', marginBottom: '12px' }} />
              <div className="skeleton" style={{ height: '48px', marginBottom: '12px' }} />
              <div className="skeleton" style={{ height: '48px' }} />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Storage Used</th>
                    <th>Storage Quota</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.userId || u._id}>
                      <td>
                        <span className="user-full-name">{u.fullName}</span>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className="role-pill">{u.role}</span>
                      </td>
                      <td>{formatBytes(u.storageUsed)}</td>
                      <td>
                        {editingUserId === (u.userId || u._id) ? (
                          <div className="quota-edit-form">
                            <input
                              type="number"
                              step="0.5"
                              placeholder="Quota in GB"
                              value={newQuotaGB}
                              onChange={(e) => setNewQuotaGB(e.target.value)}
                              className="quota-input"
                            />
                            <button
                              onClick={() => handleUpdateQuota(u.userId || u._id)}
                              className="btn-icon-save"
                              title="Save Quota"
                            >
                              <Save size={16} />
                            </button>
                          </div>
                        ) : (
                          <span>{formatBytes(u.storageQuota)}</span>
                        )}
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            onClick={() => {
                              setEditingUserId(u.userId || u._id);
                              setNewQuotaGB((u.storageQuota / 1073741824).toString());
                            }}
                            className="action-btn"
                            title="Edit Quota"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleRecalculate(u.userId || u._id)}
                            className="action-btn"
                            title="Recalculate Storage Audit"
                          >
                            <RefreshCw size={16} />
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
        .admin-portal-wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .success-banner {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--color-success);
          font-size: 13px;
          border-color: var(--color-success);
        }

        .admin-table-card {
          padding: 24px;
        }

        .header-title-flex {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          margin-top: 16px;
        }

        .admin-table th {
          padding: 12px 16px;
          font-size: 12px;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-standard);
        }

        .admin-table td {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-glass);
          font-size: 14px;
        }

        .user-full-name {
          font-weight: 600;
        }

        .role-pill {
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 11px;
          text-transform: uppercase;
          background: var(--bg-surface);
          border: 1px solid var(--border-standard);
          color: var(--text-secondary);
        }

        .quota-edit-form {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .quota-input {
          width: 80px;
          background: var(--bg-surface);
          border: 1px solid var(--border-focus);
          color: var(--text-primary);
          padding: 4px 8px;
          border-radius: 6px;
        }

        .btn-icon-save {
          background: var(--accent-primary);
          border: none;
          color: #fff;
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
        }

        .actions-cell {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }
      `}</style>
    </Layout>
  );
};

export default AdminPortal;
