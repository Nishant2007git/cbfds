import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../utils/api.js";
import {
  Activity, LogIn, UploadCloud, DownloadCloud, Trash2, RotateCcw,
  Share2, ShieldAlert, EyeOff, Globe, Smartphone, Laptop,
  Filter, Shield, Search, X, Calendar, Clock, ChevronDown
} from "lucide-react";

const actionConfig = {
  LOGIN:            { icon: LogIn,         color: "var(--accent-primary)",   label: "Login",    gradient: "var(--grad-blue)" },
  UPLOAD_FILE:      { icon: UploadCloud,   color: "var(--accent-emerald)",   label: "Upload",   gradient: "var(--grad-teal)" },
  DOWNLOAD_FILE:    { icon: DownloadCloud, color: "var(--accent-cyan)",      label: "Download", gradient: "var(--grad-blue)" },
  DELETE_FILE:      { icon: Trash2,        color: "var(--accent-amber)",     label: "Delete",   gradient: "var(--grad-orange)" },
  RESTORE_FILE:     { icon: RotateCcw,     color: "var(--accent-emerald)",   label: "Restore",  gradient: "var(--grad-teal)" },
  PERMANENT_DELETE: { icon: Trash2,        color: "var(--color-danger)",     label: "Purge",    gradient: "linear-gradient(135deg,#ef4444,#b91c1c)" },
  CREATE_SHARE:     { icon: Share2,        color: "var(--accent-secondary)", label: "Share",    gradient: "var(--grad-purple)" },
  REVOKE_SHARE:     { icon: EyeOff,        color: "var(--accent-rose)",      label: "Revoke",   gradient: "var(--grad-rose)" },
};

const getDeviceIcon = (ua = "") => {
  const s = ua.toLowerCase();
  if (s.includes("mobi") || s.includes("android") || s.includes("iphone")) return Smartphone;
  return Laptop;
};

const parseUA = (ua = "") => {
  const s = ua.toLowerCase();
  if (s.includes("chrome") && !s.includes("edge")) return "Chrome";
  if (s.includes("firefox")) return "Firefox";
  if (s.includes("safari") && !s.includes("chrome")) return "Safari";
  if (s.includes("edge")) return "Edge";
  return "Browser";
};

const relTime = (d) => {
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
};

const LogRow = ({ log, idx }) => {
  const cfg = actionConfig[log.action] || { icon: ShieldAlert, color: "var(--text-muted)", label: log.action, gradient: "var(--glass-border)" };
  const DevIcon = getDeviceIcon(log.userAgent);
  const browser = parseUA(log.userAgent);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
      background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)",
      border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
      transition: "all 0.25s var(--ease-out)",
      animation: `fadeInUp 0.4s var(--ease-out) ${0.025 * idx}s both`,
      boxShadow: "var(--shadow-card-3d)",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateX(6px)"; e.currentTarget.style.borderColor = cfg.color + "55"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = "var(--glass-border)"; }}
    >
      {/* Action icon */}
      <div style={{ width: 38, height: 38, borderRadius: "var(--radius-md)", background: cfg.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 12px ${cfg.color}44` }}>
        <cfg.icon size={16} color="#fff" />
      </div>

      {/* Action label */}
      <div style={{ flexShrink: 0, width: 80 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{cfg.label}</div>
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {log.user?.fullName || log.user?.email || "Unknown User"}
        </div>
        {log.resourceName && (
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {log.resourceName}
          </div>
        )}
      </div>

      {/* Device / Browser */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, color: "var(--text-muted)" }}>
        <DevIcon size={13} />
        <span style={{ fontSize: 11.5 }}>{browser}</span>
      </div>

      {/* IP */}
      {log.ipAddress && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <Globe size={11} color="var(--text-disabled)" />
          <span style={{ fontSize: 11, color: "var(--text-disabled)", fontFamily: "var(--font-mono)" }}>{log.ipAddress}</span>
        </div>
      )}

      {/* Time */}
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 500 }}>{relTime(log.createdAt)}</div>
        <div style={{ fontSize: 10, color: "var(--text-disabled)", marginTop: 2 }}>{log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ""}</div>
      </div>
    </div>
  );
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 40;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: LIMIT, page });
      if (selectedUser) params.set("userId", selectedUser);
      if (selectedAction) params.set("action", selectedAction);
      const res = await api.get(`/audit?${params}`);
      const data = res.data.data;
      setLogs(data?.items || data || []);
      setHasMore(!!data?.hasMore);
      setIsAdmin(true);
    } catch (err) {
      if (err.response?.status === 403) {
        const res = await api.get("/audit");
        setLogs(res.data.data?.items || res.data.data || []);
        setIsAdmin(false);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [selectedUser, selectedAction, page]);

  useEffect(() => {
    if (!isAdmin) return;
    api.get("/admin/users").then(r => setUsers(r.data.data?.items || [])).catch(() => {});
  }, [isAdmin]);

  const displayLogs = logs.filter(log =>
    searchQuery === "" ||
    (log.user?.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.user?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.resourceName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const actionKeys = Object.keys(actionConfig);
  const totalByAction = actionKeys.reduce((acc, k) => {
    acc[k] = logs.filter(l => l.action === k).length;
    return acc;
  }, {});

  return (
    <Layout title="Audit Logs">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Header */}
        <div style={{ animation: "fadeInUp 0.4s var(--ease-out) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-primary)", animation: "pulse-glow 2s infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Security Center</span>
          </div>
          <h1 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Audit <span className="text-gradient">Logs</span>
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 4 }}>{logs.length} event{logs.length !== 1 ? "s" : ""} recorded · Immutable security trail</p>
        </div>

        {/* Action summary chips */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", animation: "fadeInUp 0.4s var(--ease-out) 0.05s both" }}>
          {actionKeys.slice(0, 5).map(k => {
            const cfg = actionConfig[k];
            const count = totalByAction[k];
            if (!count) return null;
            return (
              <button key={k} onClick={() => setSelectedAction(selectedAction === k ? "" : k)} style={{
                display: "flex", alignItems: "center", gap: 7, padding: "7px 14px",
                background: selectedAction === k ? cfg.gradient : "var(--glass-bg)",
                backdropFilter: "blur(12px)",
                border: `1px solid ${selectedAction === k ? cfg.color + "66" : "var(--glass-border)"}`,
                borderRadius: 99, cursor: "pointer",
                color: selectedAction === k ? "#fff" : cfg.color,
                fontSize: 12, fontWeight: 600, transition: "all 0.2s ease",
              }}>
                <cfg.icon size={11} />
                {cfg.label}
                <span style={{ background: "hsla(0,0%,100%,0.15)", borderRadius: 99, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{count}</span>
              </button>
            );
          })}
          {selectedAction && (
            <button onClick={() => setSelectedAction("")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", background: "var(--color-danger-subtle)", border: "1px solid hsla(0,84%,60%,0.2)", borderRadius: 99, cursor: "pointer", color: "var(--color-danger)", fontSize: 12, fontWeight: 600 }}>
              <X size={11} /> Clear filter
            </button>
          )}
        </div>

        {/* Search + Filters */}
        <div style={{
          display: "grid", gridTemplateColumns: isAdmin ? "1fr auto auto" : "1fr", gap: 12,
          background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
          padding: "14px 20px", boxShadow: "var(--shadow-card-3d)",
          animation: "fadeInUp 0.4s var(--ease-out) 0.1s both",
        }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search logs..."
              style={{ width: "100%", background: "hsla(0,0%,0%,0.2)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "9px 12px 9px 36px", color: "var(--text-primary)", fontSize: 13, fontFamily: "var(--font-body)", outline: "none" }}
            />
          </div>
          {isAdmin && (
            <select value={selectedUser} onChange={e => { setSelectedUser(e.target.value); setPage(1); }} style={{
              background: "hsla(0,0%,0%,0.2)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
              padding: "9px 14px", color: "var(--text-primary)", fontSize: 12.5, fontFamily: "var(--font-body)", outline: "none", cursor: "pointer",
            }}>
              <option value="">All Users</option>
              {users.map(u => <option key={u._id} value={u._id}>{u.fullName || u.email}</option>)}
            </select>
          )}
          {isAdmin && (
            <select value={selectedAction} onChange={e => { setSelectedAction(e.target.value); setPage(1); }} style={{
              background: "hsla(0,0%,0%,0.2)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
              padding: "9px 14px", color: "var(--text-primary)", fontSize: 12.5, fontFamily: "var(--font-body)", outline: "none", cursor: "pointer",
            }}>
              <option value="">All Actions</option>
              {actionKeys.map(k => <option key={k} value={k}>{actionConfig[k].label}</option>)}
            </select>
          )}
        </div>

        {/* Log list */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(8)].map((_,i) => <div key={i} className="skeleton" style={{ height: 68, borderRadius: "var(--radius-xl)" }} />)}
          </div>
        ) : displayLogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "72px 24px", background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-card-3d)" }}>
            <Activity size={48} color="var(--text-disabled)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No logs found</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Activity events will appear here as you use the platform.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {displayLogs.map((log, i) => <LogRow key={log._id || i} log={log} idx={i} />)}
          </div>
        )}

        {/* Pagination */}
        {!loading && displayLogs.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "8px 20px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", color: page === 1 ? "var(--text-disabled)" : "var(--text-primary)", fontSize: 13, fontWeight: 600, cursor: page === 1 ? "not-allowed" : "pointer" }}>Previous</button>
            <div style={{ padding: "8px 16px", background: "var(--gradient-brand)", borderRadius: "var(--radius-md)", color: "#fff", fontSize: 13, fontWeight: 700 }}>Page {page}</div>
            <button onClick={() => setPage(p => p + 1)} disabled={!hasMore} style={{ padding: "8px 20px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", color: !hasMore ? "var(--text-disabled)" : "var(--text-primary)", fontSize: 13, fontWeight: 600, cursor: !hasMore ? "not-allowed" : "pointer" }}>Next</button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AuditLogs;
