import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../utils/api.js";
import {
  Shield, Users, Edit2, RefreshCw, Save,
  CheckCircle2, X, Search, HardDrive,
  Crown, User, BarChart3, Zap, AlertCircle
} from "lucide-react";

const formatBytes = (b) => {
  if (!b || b === 0) return "0 B";
  const k = 1024, sizes = ["B","KB","MB","GB","TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const RoleBadge = ({ role }) => {
  const cfg = {
    superadmin: { color: "var(--accent-amber)", bg: "hsla(38,92%,50%,0.15)", border: "hsla(38,92%,50%,0.3)", icon: Crown, label: "Super Admin" },
    admin:      { color: "var(--accent-primary)", bg: "var(--accent-primary-subtle)", border: "var(--accent-primary-glow)", icon: Shield, label: "Admin" },
    user:       { color: "var(--text-secondary)", bg: "var(--glass-bg)", border: "var(--glass-border)", icon: User, label: "User" },
  }[role] || { color: "var(--text-muted)", bg: "var(--glass-bg)", border: "var(--glass-border)", icon: User, label: role };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      <cfg.icon size={10} />
      {cfg.label}
    </div>
  );
};

const QuotaBar = ({ used, quota }) => {
  const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  const color = pct > 90 ? "var(--color-danger)" : pct > 70 ? "var(--accent-amber)" : "var(--accent-emerald)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatBytes(used)} / {formatBytes(quota)}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: "var(--glass-bg)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, boxShadow: `0 0 6px ${color}`, transition: "width 0.8s var(--ease-out)" }} />
      </div>
    </div>
  );
};

const AdminPortal = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newQuotaGB, setNewQuotaGB] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("success");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/users");
      setUsers(res.data.data?.items || []);
    } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { fetchUsers(); }, []);

  const showMsg = (text, type = "success") => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(""), 3000);
  };

  const handleUpdateQuota = async (userId) => {
    const bytes = parseFloat(newQuotaGB) * 1073741824;
    if (isNaN(bytes) || bytes <= 0) { showMsg("Enter a valid GB value.", "error"); return; }
    setSaving(true);
    try {
      await api.put(`/admin/users/${userId}/quota`, { storageQuota: bytes });
      showMsg(`Quota updated to ${newQuotaGB} GB.`);
      setEditingId(null); setNewQuotaGB("");
      fetchUsers();
    } catch (err) { showMsg(err.response?.data?.error?.message || "Failed.", "error"); }
    finally { setSaving(false); }
  };

  const handleRecalculate = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/recalculate`);
      showMsg("Storage audit triggered.");
    } catch {}
  };

  const filtered = users.filter(u =>
    (u.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = users.length;
  const totalStorage = users.reduce((a, u) => a + (u.storageUsed || 0), 0);
  const totalQuota = users.reduce((a, u) => a + (u.storageQuota || 0), 0);
  const adminCount = users.filter(u => u.role === "admin" || u.role === "superadmin").length;

  return (
    <Layout title="Admin Portal">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Header */}
        <div style={{ animation: "fadeInUp 0.4s var(--ease-out) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-secondary)", animation: "pulse-glow 2s infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Admin Portal</span>
          </div>
          <h1 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
            User <span className="text-gradient">Management</span>
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 4 }}>Manage quotas, roles, and audit storage usage across all registered users.</p>
        </div>

        {/* Toast */}
        {msg && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 18px",
            background: msgType === "success" ? "hsla(142,71%,45%,0.12)" : "var(--color-danger-subtle)",
            border: `1px solid ${msgType === "success" ? "hsla(142,71%,45%,0.3)" : "hsla(0,84%,60%,0.3)"}`,
            borderRadius: "var(--radius-lg)", animation: "scaleIn 0.2s var(--ease-spring) both",
          }}>
            {msgType === "success" ? <CheckCircle2 size={16} color="var(--color-success)" /> : <AlertCircle size={16} color="var(--color-danger)" />}
            <span style={{ fontSize: 13, fontWeight: 600, color: msgType === "success" ? "var(--color-success)" : "var(--color-danger)" }}>{msg}</span>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, animation: "fadeInUp 0.5s var(--ease-out) 0.05s both" }}>
          {[
            { label: "Total Users", value: totalUsers, icon: Users, gradient: "var(--grad-blue)" },
            { label: "Admins", value: adminCount, icon: Shield, gradient: "var(--grad-purple)" },
            { label: "Storage Used", value: formatBytes(totalStorage), icon: HardDrive, gradient: "var(--grad-teal)" },
            { label: "Total Quota", value: formatBytes(totalQuota), icon: BarChart3, gradient: "var(--grad-orange)" },
          ].map((s, i) => (
            <div key={i} style={{ background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "var(--shadow-card-3d)", position: "relative", overflow: "hidden",
              transition: "transform 0.3s var(--ease-3d), box-shadow 0.3s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px) translateZ(8px)"; e.currentTarget.style.boxShadow = "var(--shadow-2xl), var(--shadow-glow)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow-card-3d)"; }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: s.gradient }} />
              <div style={{ width: 42, height: 42, borderRadius: "var(--radius-md)", background: s.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 14px rgba(0,0,0,0.3)" }}>
                <s.icon size={19} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "14px 20px", boxShadow: "var(--shadow-card-3d)", animation: "fadeInUp 0.4s var(--ease-out) 0.1s both" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name or email..."
              style={{ width: "100%", background: "hsla(0,0%,0%,0.2)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "9px 12px 9px 36px", color: "var(--text-primary)", fontSize: 13, fontFamily: "var(--font-body)", outline: "none" }}
            />
          </div>
          <button onClick={fetchUsers} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Users list */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(5)].map((_,i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: "var(--radius-xl)" }} />)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeInUp 0.4s var(--ease-out) 0.15s both" }}>
            {filtered.map((user, idx) => {
              const isEditing = editingId === user._id;
              return (
                <div key={user._id} style={{
                  background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)",
                  border: `1px solid ${isEditing ? "var(--accent-primary-glow)" : "var(--glass-border)"}`,
                  borderRadius: "var(--radius-xl)", padding: "18px 22px",
                  boxShadow: isEditing ? "var(--shadow-card-3d), 0 0 0 1px var(--accent-primary-subtle)" : "var(--shadow-card-3d)",
                  transition: "all 0.3s var(--ease-out)",
                  animation: `fadeInUp 0.4s var(--ease-out) ${0.03 * idx}s both`,
                  position: "relative", overflow: "hidden",
                }}>
                  {/* Shine top */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, hsla(210,40%,98%,0.12), transparent)" }} />

                  {/* User header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: isEditing ? 16 : 12, gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: "var(--gradient-brand)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: 16, color: "#fff",
                        flexShrink: 0,
                        boxShadow: "0 4px 12px var(--accent-primary-glow)",
                      }}>
                        {(user.fullName || user.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>{user.fullName || "Unknown"}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{user.email}</div>
                        <RoleBadge role={user.role} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => handleRecalculate(user._id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", color: "var(--text-muted)", fontSize: 11.5, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease" }}
                        onMouseEnter={e => { e.currentTarget.style.color = "var(--accent-cyan)"; e.currentTarget.style.borderColor = "var(--accent-cyan)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--glass-border)"; }}
                      >
                        <Zap size={11} /> Audit
                      </button>
                      {isEditing ? (
                        <button onClick={() => { setEditingId(null); setNewQuotaGB(""); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "var(--color-danger-subtle)", border: "1px solid hsla(0,84%,60%,0.2)", borderRadius: "var(--radius-md)", color: "var(--color-danger)", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                          <X size={11} /> Cancel
                        </button>
                      ) : (
                        <button onClick={() => { setEditingId(user._id); setNewQuotaGB(String(Math.round((user.storageQuota || 0) / 1073741824))); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "var(--accent-primary-subtle)", border: "1px solid var(--accent-primary-glow)", borderRadius: "var(--radius-md)", color: "var(--accent-primary)", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                          <Edit2 size={11} /> Edit Quota
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quota bar */}
                  <QuotaBar used={user.storageUsed || 0} quota={user.storageQuota || 0} />

                  {/* Edit form */}
                  {isEditing && (
                    <div style={{ marginTop: 14, display: "flex", gap: 10, animation: "fadeInUp 0.25s var(--ease-out) both" }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <input
                          type="number" min={1} step={1}
                          value={newQuotaGB}
                          onChange={e => setNewQuotaGB(e.target.value)}
                          placeholder="New quota (GB)"
                          style={{ width: "100%", background: "hsla(0,0%,0%,0.25)", border: "1px solid var(--accent-primary-glow)", borderRadius: "var(--radius-md)", padding: "9px 44px 9px 14px", color: "var(--text-primary)", fontSize: 13, fontFamily: "var(--font-body)", outline: "none" }}
                        />
                        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>GB</span>
                      </div>
                      <button onClick={() => handleUpdateQuota(user._id)} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "var(--gradient-brand)", border: "none", borderRadius: "var(--radius-md)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                        <Save size={13} /> {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminPortal;
