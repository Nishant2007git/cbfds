import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../utils/api.js";
import {
  Share2, Link2, Copy, Check, EyeOff, Lock,
  Trash2, Calendar, Search, ExternalLink, Clock,
  ShieldCheck, AlertCircle, Download, Filter
} from "lucide-react";

const formatBytes = (b) => {
  if (!b || b === 0) return "0 B";
  const k = 1024, sizes = ["B","KB","MB","GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const isActive = (share) => {
  if (share.isRevoked) return false;
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) return false;
  if (share.downloadLimit !== null && share.downloadCount >= share.downloadLimit) return false;
  return true;
};

const StatusPill = ({ active }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
    background: active ? "hsla(142,71%,45%,0.15)" : "hsla(0,0%,100%,0.06)",
    border: `1px solid ${active ? "hsla(142,71%,45%,0.3)" : "hsla(0,0%,100%,0.1)"}`,
    color: active ? "var(--color-success)" : "var(--text-muted)",
  }}>
    <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "var(--color-success)" : "var(--text-muted)", animation: active ? "pulse-glow 2s infinite" : "none" }} />
    {active ? "Active" : "Expired"}
  </div>
);

const ShareCard = ({ share, onRevoke, onCopy, copied }) => {
  const active = isActive(share);
  const link = `${window.location.origin}/share/${share.shareId}`;
  const expiry = share.expiresAt ? new Date(share.expiresAt).toLocaleDateString() : null;

  return (
    <div style={{
      position: "relative",
      background: "var(--glass-bg)",
      backdropFilter: "var(--glass-blur)",
      border: `1px solid ${active ? "var(--glass-border)" : "hsla(0,0%,100%,0.04)"}`,
      borderRadius: "var(--radius-xl)",
      padding: "20px 22px",
      transition: "transform 0.3s var(--ease-3d), box-shadow 0.3s ease, border-color 0.2s ease",
      boxShadow: "var(--shadow-card-3d)",
      opacity: active ? 1 : 0.55,
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px) translateZ(8px)"; e.currentTarget.style.boxShadow = "var(--shadow-2xl), var(--shadow-glow)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow-card-3d)"; }}
    >
      {/* Top gradient bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", background: active ? "var(--gradient-brand)" : "var(--glass-border)" }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--accent-primary-subtle)", border: "1px solid var(--accent-primary-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Share2 size={18} color="var(--accent-primary)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {share.file?.originalName || "Unnamed File"}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{formatBytes(share.file?.size || 0)}</div>
          </div>
        </div>
        <StatusPill active={active} />
      </div>

      {/* Link bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "hsla(0,0%,0%,0.2)", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)", marginBottom: 14 }}>
        <Link2 size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link}</span>
        <button onClick={() => onCopy(share.shareId)} style={{ background: "none", border: "none", cursor: "pointer", color: copied === share.shareId ? "var(--color-success)" : "var(--text-muted)", display: "flex", transition: "color 0.2s ease" }}>
          {copied === share.shareId ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <a href={link} target="_blank" rel="noreferrer" style={{ color: "var(--text-muted)", display: "flex" }}>
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
        {expiry && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-muted)" }}>
            <Calendar size={11} /> Expires {expiry}
          </div>
        )}
        {share.downloadLimit !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-muted)" }}>
            <Download size={11} /> {share.downloadCount || 0}/{share.downloadLimit} downloads
          </div>
        )}
        {share.passwordHash && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--accent-amber)" }}>
            <Lock size={11} /> Password protected
          </div>
        )}
        {share.isAnonymous && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-muted)" }}>
            <EyeOff size={11} /> Anonymous
          </div>
        )}
      </div>

      {/* Actions */}
      {active && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onCopy(share.shareId)} style={{
            flex: 1, padding: "8px 14px", background: "var(--accent-primary-subtle)", border: "1px solid var(--accent-primary-glow)",
            borderRadius: "var(--radius-md)", color: "var(--accent-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s ease",
          }}>
            {copied === share.shareId ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Link</>}
          </button>
          <button onClick={() => onRevoke(share.shareId)} style={{
            padding: "8px 14px", background: "var(--color-danger-subtle)", border: "1px solid hsla(0,84%,60%,0.25)",
            borderRadius: "var(--radius-md)", color: "var(--color-danger)", fontSize: 12, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s ease",
          }}>
            <Trash2 size={12} /> Revoke
          </button>
        </div>
      )}
    </div>
  );
};

const ShareBoard = () => {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("Active");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchShares = async () => {
    try {
      setLoading(true);
      const res = await api.get("/shares");
      setShares(res.data.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchShares(); }, []);

  const handleRevoke = async (shareId) => {
    if (!window.confirm("Revoke this share link? Access will be blocked immediately.")) return;
    try {
      await api.delete(`/shares/${shareId}`);
      setShares(prev => prev.map(s => s.shareId === shareId ? { ...s, isRevoked: true } : s));
    } catch (err) { alert(err.response?.data?.error?.message || "Failed to revoke."); }
  };

  const handleCopy = (shareId) => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${shareId}`);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = shares.filter(s => {
    const active = isActive(s);
    const matchSearch = (s.file?.originalName || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === "Active") return active && matchSearch;
    if (activeFilter === "Expired") return !active && matchSearch;
    return matchSearch;
  });

  const filters = ["All", "Active", "Expired"];
  const activeCount = shares.filter(s => isActive(s)).length;

  return (
    <Layout title="Shared Links">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Page header */}
        <div style={{ animation: "fadeInUp 0.4s var(--ease-out) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-secondary)", animation: "pulse-glow 2s infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Share Manager</span>
          </div>
          <h1 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Shared <span className="text-gradient">Links</span>
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 4 }}>{activeCount} active link{activeCount !== 1 ? "s" : ""} · {shares.length} total</p>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, animation: "fadeInUp 0.5s var(--ease-out) 0.05s both" }}>
          {[
            { label: "Total Shares", value: shares.length, icon: Share2, color: "var(--accent-primary)", gradient: "var(--grad-blue)" },
            { label: "Active Links", value: activeCount, icon: ShieldCheck, color: "var(--accent-emerald)", gradient: "var(--grad-teal)" },
            { label: "Expired / Revoked", value: shares.length - activeCount, icon: AlertCircle, color: "var(--accent-amber)", gradient: "var(--grad-orange)" },
          ].map((s, i) => (
            <div key={i} style={{
              background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)",
              border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
              padding: "18px 20px", display: "flex", alignItems: "center", gap: 14,
              boxShadow: "var(--shadow-card-3d)", position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: s.gradient }} />
              <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: s.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <s.icon size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
          padding: "14px 20px", animation: "fadeInUp 0.5s var(--ease-out) 0.1s both",
          boxShadow: "var(--shadow-card-3d)",
        }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search shares..."
              style={{ width: "100%", background: "hsla(0,0%,0%,0.2)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "9px 12px 9px 36px", color: "var(--text-primary)", fontSize: 13, fontFamily: "var(--font-body)", outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", gap: 4, background: "hsla(0,0%,0%,0.2)", borderRadius: "var(--radius-md)", padding: 3 }}>
            {filters.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)} style={{
                padding: "7px 14px", border: "none", cursor: "pointer", borderRadius: "calc(var(--radius-md) - 2px)",
                background: activeFilter === f ? "var(--gradient-brand)" : "transparent",
                color: activeFilter === f ? "#fff" : "var(--text-muted)",
                fontSize: 12.5, fontWeight: 600, transition: "all 0.2s ease",
              }}>{f}</button>
            ))}
          </div>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: 16 }}>
            {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height: 180, borderRadius: "var(--radius-xl)" }} />)}
          </div>
        ) : filtered.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: 16 }}>
            {filtered.map((s, i) => (
              <div key={s.shareId} style={{ animation: `fadeInUp 0.4s var(--ease-out) ${i * 0.05}s both` }}>
                <ShareCard share={s} onRevoke={handleRevoke} onCopy={handleCopy} copied={copiedId} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: "center", padding: "64px 24px",
            background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)",
            border: "1px solid var(--glass-border)", borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card-3d)",
          }}>
            <Share2 size={48} color="var(--text-disabled)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No shared links</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Create share links from the File Browser to manage them here.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ShareBoard;
