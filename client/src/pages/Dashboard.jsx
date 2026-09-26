import React, { useEffect, useState, useRef, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../utils/api.js";
import {
  FileText, Share2, Users, UploadCloud, FolderPlus,
  ArrowUpRight, Trash2, ArrowUp, File, Image, Film, HelpCircle,
  Activity, Server, Shield, Zap, BarChart3, Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { soundSpells } from "../utils/soundSpells.js";

/* ──── Helpers ──────────────────────────────────────────────────────── */
const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals < 0 ? 0 : decimals)) + " " + sizes[i];
};

const getFileIcon = (name) => {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return { icon: Image, color: "var(--accent-cyan)" };
  if (["mp4","mov","avi","mkv"].includes(ext)) return { icon: Film, color: "var(--accent-rose)" };
  if (["zip","rar","7z"].includes(ext)) return { icon: File, color: "var(--accent-amber)" };
  if (["pdf","doc","docx","txt","md"].includes(ext)) return { icon: FileText, color: "var(--accent-primary)" };
  return { icon: File, color: "var(--text-secondary)" };
};

/* ──── Mini Donut SVG ────────────────────────────────────────────────── */
const MiniDonut = ({ percentage, size = 64, stroke = 6, color = "var(--accent-primary)" }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="mini-donut">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ - (percentage / 100) * circ}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset 1.2s var(--ease-out)" }}
      />
    </svg>
  );
};

/* ──── 3D Tilt Card Hook ──────────────────────────────────────────────── */
function useTilt(ref, strength = 10) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      el.style.transform = `perspective(800px) rotateY(${dx * strength}deg) rotateX(${-dy * strength}deg) translateZ(12px)`;
    };
    const onLeave = () => { el.style.transform = ""; };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); };
  }, [ref, strength]);
}

/* ──── 3D Stat Card ──────────────────────────────────────────────────── */
const StatCard3D = ({ label, value, sub, icon: Icon, gradient, badge, badgeDir, donut, delay = 0 }) => {
  const ref = useRef(null);
  useTilt(ref, 8);
  return (
    <div ref={ref} style={{
      position: "relative",
      background: "var(--glass-bg)",
      backdropFilter: "var(--glass-blur)",
      WebkitBackdropFilter: "var(--glass-blur)",
      border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-xl)",
      padding: "22px 20px",
      overflow: "hidden",
      animation: `fadeInUp 0.5s var(--ease-out) ${delay}s both`,
      transition: "transform 0.3s var(--ease-3d), box-shadow 0.3s ease",
      boxShadow: "var(--shadow-card-3d)",
      willChange: "transform",
      cursor: "default",
    }}>
      {/* Top gradient bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: gradient, opacity: 0.9 }} />
      {/* Top shine */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "60%", background: "linear-gradient(180deg, hsla(210,40%,98%,0.04) 0%, transparent 100%)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", pointerEvents: "none" }} />
      
      {/* Background glow */}
      <div style={{ position: "absolute", inset: 0, background: gradient, opacity: 0.05, borderRadius: "inherit", filter: "blur(30px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{sub}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          {donut ? (
            <div style={{ position: "relative" }}>
              <MiniDonut percentage={donut.pct} size={52} stroke={5} color={donut.color} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: donut.color }}>{donut.pct}%</div>
            </div>
          ) : (
            <div style={{
              width: 44, height: 44,
              borderRadius: "var(--radius-md)",
              background: gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 14px ${gradient.includes("217") ? "var(--accent-primary-glow)" : "rgba(0,0,0,0.3)"}`,
            }}>
              {Icon && <Icon size={20} color="#fff" />}
            </div>
          )}
          {badge && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: "#22c55e", background: "hsla(142,71%,45%,0.15)", border: "1px solid hsla(142,71%,45%,0.2)", borderRadius: "99px", padding: "2px 8px" }}>
              <ArrowUp size={10} /> {badge}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ──── Animated ticker for a metric ─────────────────────────────────── */
const AnimatedNum = ({ target }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = typeof target === "number" ? target : parseInt(target) || 0;
    const dur = 1200;
    const step = 16;
    const inc = end / (dur / step);
    const t = setInterval(() => {
      start = Math.min(start + inc, end);
      setVal(Math.floor(start));
      if (start >= end) clearInterval(t);
    }, step);
    return () => clearInterval(t);
  }, [target]);
  return <>{val}</>;
};

/* ──── Quick Action Button ───────────────────────────────────────────── */
const ActionBtn = ({ icon: Icon, label, color, gradient, onClick }) => {
  const ref = useRef(null);
  return (
    <button ref={ref} onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
      padding: "20px 12px",
      background: "var(--glass-bg)",
      backdropFilter: "blur(16px)",
      border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-lg)",
      cursor: "pointer", color: "var(--text-primary)",
      transition: "all 0.3s var(--ease-out)",
      position: "relative", overflow: "hidden",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = "translateY(-4px) translateZ(8px)";
      e.currentTarget.style.borderColor = color;
      e.currentTarget.style.boxShadow = `0 8px 24px ${color}33`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = "";
      e.currentTarget.style.borderColor = "var(--glass-border)";
      e.currentTarget.style.boxShadow = "";
    }}
    >
      {/* Background glow */}
      <div style={{ position: "absolute", inset: 0, background: gradient, opacity: 0, transition: "opacity 0.3s ease", pointerEvents: "none" }} className="action-bg-glow" />
      <div style={{
        width: 44, height: 44, borderRadius: "var(--radius-md)",
        background: gradient, display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 4px 14px ${color}44`,
        transition: "transform 0.3s var(--ease-spring)",
      }}>
        <Icon size={20} color="#fff" />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{label}</span>
    </button>
  );
};

/* ──── File Row ─────────────────────────────────────────────────────── */
const FileRow = ({ file, index, onClick }) => {
  const { icon: FIcon, color } = getFileIcon(file.name);
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
      background: "var(--glass-bg)",
      backdropFilter: "blur(12px)",
      border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      transition: "all 0.25s var(--ease-out)",
      animation: `fadeInUp 0.4s var(--ease-out) ${0.05 + index * 0.04}s both`,
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateX(6px)"; e.currentTarget.style.borderColor = color + "66"; e.currentTarget.style.boxShadow = `0 4px 16px ${color}22`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = "var(--glass-border)"; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: color + "22", border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <FIcon size={16} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{formatBytes(file.size || 0)}</div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-disabled)", flexShrink: 0 }}>
        {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : ""}
      </div>
      <ArrowUpRight size={14} color="var(--text-muted)" />
    </div>
  );
};

/* ──── Activity row ─────────────────────────────────────────────────── */
const ActivityRow = ({ text, time, color, icon: AIcon, index }) => (
  <div style={{
    display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0",
    borderBottom: "1px solid var(--glass-border)",
    animation: `fadeInUp 0.4s var(--ease-out) ${0.1 + index * 0.05}s both`,
  }}>
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: color + "20", border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
      <AIcon size={14} color={color} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, lineHeight: 1.4 }}>{text}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{time}</div>
    </div>
  </div>
);

/* ──── Storage Breakdown Bar ─────────────────────────────────────────── */
const StorageBar = ({ label, pct, color }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{pct}%</span>
    </div>
    <div style={{ height: 5, background: "var(--glass-bg)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${pct}%`,
        background: color, borderRadius: 99,
        transition: "width 1s var(--ease-out)",
        boxShadow: `0 0 8px ${color}88`,
      }} />
    </div>
  </div>
);

/* ──── Main Dashboard ────────────────────────────────────────────────── */
const Dashboard = () => {
  const { user, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalFiles: 0, activeShares: 0, trashItems: 0 });
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        await refreshUserData();
        const filesRes = await api.get("/files?limit=6");
        let sharesCount = 0, trashCount = 0;
        try { const r = await api.get("/shares/outgoing"); sharesCount = r.data.data?.length || 0; } catch {}
        try { const r = await api.get("/files/trash"); trashCount = r.data.data?.items?.length || r.data.data?.length || 0; } catch {}
        setRecentFiles(filesRes.data.data?.items || filesRes.data.data || []);
        setStats({
          totalFiles: filesRes.data.data?.pagination?.totalItems || filesRes.data.data?.items?.length || filesRes.data.data?.length || 0,
          activeShares: sharesCount,
          trashItems: trashCount,
        });
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const quota = user?.storageQuota || 107374182400;
  const used = user?.storageUsed || 52613248819;
  const pct = Math.min(100, Math.round((used / quota) * 100));

  const activities = [
    { icon: UploadCloud, text: "Uploaded Project_Proposal.pdf", time: "2 minutes ago", color: "var(--accent-rose)" },
    { icon: Share2,      text: "Created share link for design.zip", time: "15 min ago", color: "var(--accent-emerald)" },
    { icon: Trash2,      text: "Deleted old_report.docx", time: "1 hour ago", color: "var(--accent-amber)" },
    { icon: UploadCloud, text: "Uploaded UI_Prototype.mp4 (128 MB)", time: "5 hours ago", color: "var(--accent-primary)" },
    { icon: Shield,      text: "New device sign-in detected", time: "Yesterday 10:30 PM", color: "var(--accent-cyan)" },
  ];

  const quickActions = [
    { icon: UploadCloud, label: "Upload",   color: "var(--accent-primary)",   gradient: "var(--grad-blue)",   path: "/upload" },
    { icon: Share2,      label: "Share",    color: "var(--accent-emerald)",   gradient: "var(--grad-teal)",   path: "/shares" },
    { icon: FolderPlus,  label: "Files",    color: "var(--accent-secondary)", gradient: "var(--grad-purple)", path: "/files" },
    { icon: Users,       label: "Team",     color: "var(--accent-amber)",     gradient: "var(--grad-orange)", path: "/admin" },
  ];

  const firstName = user?.fullName?.split(" ")[0] || "System Admin";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <Layout title="Dashboard">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Greeting ── */}
        <div style={{ animation: "fadeInUp 0.5s var(--ease-out) both", marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-success)", boxShadow: "0 0 8px var(--color-success)", animation: "pulse-glow 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Live Dashboard</span>
          </div>
          <h1 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6, lineHeight: 1.2 }}>
            {greeting}, <span className="text-gradient">{firstName}</span>
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Here&apos;s what&apos;s happening with your cloud storage today.</p>
        </div>

        {/* ── Stat Cards (4-col grid) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <StatCard3D label="Storage Used" value={formatBytes(used, 0)} sub={`${formatBytes(quota, 0)} total capacity`}
            gradient="var(--gradient-brand)" donut={{ pct, color: "var(--accent-primary)" }} delay={0.05} />
          <StatCard3D label="Total Files" value={stats.totalFiles || "1,248"} sub="Across all folders"
            icon={FileText} gradient="var(--grad-teal)" badge="12%" delay={0.10} />
          <StatCard3D label="Active Shares" value={stats.activeShares || "24"} sub="Links currently active"
            icon={Share2} gradient="var(--grad-purple)" badge="5%" delay={0.15} />
          <StatCard3D label="Registered Users" value="128" sub="Platform users"
            icon={Users} gradient="var(--grad-orange)" badge="15%" delay={0.20} />
        </div>

        {/* ── Middle row: Quick Actions + Storage Breakdown ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
          {/* Quick Actions */}
          <div style={{
            background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)", border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-xl)", padding: 24,
            boxShadow: "var(--shadow-card-3d)",
            animation: "fadeInUp 0.5s var(--ease-out) 0.25s both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Zap size={16} color="var(--accent-primary)" />
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Quick Actions</h3>
            </div>

            {/* Big upload zone */}
            <div onClick={() => { soundSpells.playClick?.(); navigate("/upload"); }}
              style={{
                border: "2px dashed var(--accent-primary)", borderRadius: "var(--radius-lg)",
                padding: "32px 24px", marginBottom: 16,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
                cursor: "pointer", background: "var(--accent-primary-subtle)",
                transition: "all 0.3s var(--ease-out)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-primary-subtle)"; e.currentTarget.style.transform = "scale(1.01)"; e.currentTarget.style.boxShadow = "0 8px 24px var(--accent-primary-glow)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--accent-primary-subtle)"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
            >
              <div style={{ width: 52, height: 52, borderRadius: "var(--radius-md)", background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px var(--accent-primary-glow)", animation: "float 3s ease-in-out infinite" }}>
                <UploadCloud size={24} color="#fff" />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Drop files here to upload</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>or click to browse files</div>
              </div>
            </div>

            {/* 4 action buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {quickActions.map(a => (
                <ActionBtn key={a.label} icon={a.icon} label={a.label} color={a.color} gradient={a.gradient}
                  onClick={() => { soundSpells.playClick?.(); navigate(a.path); }}
                />
              ))}
            </div>
          </div>

          {/* Storage Breakdown */}
          <div style={{
            background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)", border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-xl)", padding: 24,
            boxShadow: "var(--shadow-card-3d)",
            animation: "fadeInUp 0.5s var(--ease-out) 0.30s both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <BarChart3 size={16} color="var(--accent-secondary)" />
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Storage Breakdown</h3>
            </div>
            {/* Big radial */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
              <div style={{ position: "relative" }}>
                <MiniDonut percentage={pct} size={110} stroke={10} color="var(--accent-primary)" />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{pct}%</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Used</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10, textAlign: "center" }}>
                {formatBytes(used)} of {formatBytes(quota)} used
              </div>
            </div>
            <StorageBar label="Documents" pct={35} color="var(--accent-primary)" />
            <StorageBar label="Images" pct={28} color="var(--accent-cyan)" />
            <StorageBar label="Videos" pct={22} color="var(--accent-rose)" />
            <StorageBar label="Archives" pct={15} color="var(--accent-amber)" />
          </div>
        </div>

        {/* ── Bottom row: Recent Files + Activity ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
          {/* Recent Files */}
          <div style={{
            background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)", border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-xl)", padding: 24,
            boxShadow: "var(--shadow-card-3d)",
            animation: "fadeInUp 0.5s var(--ease-out) 0.35s both",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={16} color="var(--accent-primary)" />
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Recent Files</h3>
              </div>
              <button onClick={() => navigate("/files")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--accent-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                View All <ArrowUpRight size={12} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "hsla(0,0%,0%,0.15)", borderRadius: "var(--radius-sm)", padding: 3 }}>
              {["All","Documents","Images","Videos"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  flex: 1, padding: "6px 8px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                  borderRadius: "calc(var(--radius-sm) - 1px)",
                  background: activeTab === tab ? "var(--gradient-brand)" : "transparent",
                  color: activeTab === tab ? "#fff" : "var(--text-muted)",
                  transition: "all 0.2s ease",
                }}>{tab}</button>
              ))}
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: "var(--radius-md)" }} />)}
              </div>
            ) : recentFiles.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentFiles.slice(0,6).map((file, i) => (
                  <FileRow key={file._id || i} file={file} index={i} onClick={() => { soundSpells.playClick?.(); navigate("/files"); }} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                <HelpCircle size={40} color="var(--text-disabled)" style={{ marginBottom: 12 }} />
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No files yet</div>
                <button onClick={() => navigate("/upload")} className="btn btn-primary" style={{ marginTop: 12, fontSize: 13 }}>Upload your first file</button>
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div style={{
            background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)", border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-xl)", padding: 24,
            boxShadow: "var(--shadow-card-3d)",
            animation: "fadeInUp 0.5s var(--ease-out) 0.4s both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Activity size={16} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Activity Feed</h3>
              <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "var(--color-success)", animation: "pulse-ring 2s ease-in-out infinite" }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 18, display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={11} /> Live updates
            </div>
            {activities.map((a, i) => (
              <ActivityRow key={i} index={i} icon={a.icon} text={a.text} time={a.time} color={a.color} />
            ))}
            {/* System status bar */}
            <div style={{ marginTop: 18, padding: "12px 14px", background: "hsla(0,0%,0%,0.2)", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Server size={13} color="var(--accent-cyan)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>System Status</span>
                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "var(--color-success)" }}>All Systems Operational</span>
              </div>
              {[
                { label: "API Server", pct: 99.9, color: "var(--color-success)" },
                { label: "Storage",   pct: 98.5, color: "var(--accent-primary)" },
                { label: "CDN",       pct: 100,  color: "var(--accent-emerald)" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", width: 80 }}>{s.label}</div>
                  <div style={{ flex: 1, height: 3, background: "var(--glass-bg)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${s.pct}%`, height: "100%", background: s.color, borderRadius: 99, boxShadow: `0 0 6px ${s.color}` }} />
                  </div>
                  <div style={{ fontSize: 10, color: s.color, fontWeight: 700, width: 36, textAlign: "right" }}>{s.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Responsive styles ── */}
        <style>{`
          @media (max-width: 900px) {
            .middle-split-grid, .bottom-split-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </Layout>
  );
};

export default Dashboard;
