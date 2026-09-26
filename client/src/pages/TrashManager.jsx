import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../utils/api.js";
import {
  Trash2, RotateCcw, AlertTriangle, FileText,
  Calendar, HardDrive, File, Image, Film,
  Search, X, CheckSquare, Square
} from "lucide-react";

const formatBytes = (b) => {
  if (!b || b === 0) return "0 B";
  const k = 1024, sizes = ["B","KB","MB","GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const getFileIcon = (name = "") => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return { icon: Image, color: "var(--accent-cyan)" };
  if (["mp4","mov","avi","mkv"].includes(ext)) return { icon: Film, color: "var(--accent-rose)" };
  if (["pdf","doc","docx","txt","md"].includes(ext)) return { icon: FileText, color: "var(--accent-primary)" };
  return { icon: File, color: "var(--text-secondary)" };
};

const getDaysLeft = (deletedAt) => {
  const deleted = new Date(deletedAt);
  const purge = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
  const days = Math.max(0, Math.ceil((purge - new Date()) / (1000 * 60 * 60 * 24)));
  return days;
};

const TrashManager = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [restoring, setRestoring] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const res = await api.get("/files/trash");
      setFiles(res.data.data?.items || res.data.data || []);
    } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { fetchTrash(); }, []);

  const handleRestore = async (fileId) => {
    setRestoring(fileId);
    try {
      await api.post(`/files/${fileId}/restore-trash`);
      setFiles(prev => prev.filter(f => (f.fileId || f._id) !== fileId));
      setSelected(prev => prev.filter(id => id !== fileId));
    } catch (err) { alert(err.response?.data?.error?.message || "Failed to restore."); }
    finally { setRestoring(null); }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm("Permanently delete this file? This cannot be undone.")) return;
    setDeleting(fileId);
    try {
      await api.delete(`/files/${fileId}/permanent`);
      setFiles(prev => prev.filter(f => (f.fileId || f._id) !== fileId));
      setSelected(prev => prev.filter(id => id !== fileId));
    } catch (err) { alert(err.response?.data?.error?.message || "Failed to delete."); }
    finally { setDeleting(null); }
  };

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(f => f.fileId || f._id));

  const filtered = files.filter(f => (f.originalName || f.name || "").toLowerCase().includes(searchQuery.toLowerCase()));
  const totalSize = filtered.reduce((acc, f) => acc + (f.size || 0), 0);

  return (
    <Layout title="Trash Bin">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Header */}
        <div style={{ animation: "fadeInUp 0.4s var(--ease-out) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-danger)", animation: "pulse-glow 2s infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Trash Bin</span>
          </div>
          <h1 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Deleted <span style={{ color: "var(--color-danger)" }}>Files</span>
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 4 }}>{files.length} item{files.length !== 1 ? "s" : ""} · {formatBytes(totalSize)} total</p>
        </div>

        {/* Warning banner */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 20px",
          background: "hsla(38,95%,55%,0.08)",
          border: "1px solid hsla(38,95%,55%,0.25)",
          borderRadius: "var(--radius-xl)",
          animation: "fadeInUp 0.4s var(--ease-out) 0.05s both",
        }}>
          <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "hsla(38,95%,55%,0.15)", border: "1px solid hsla(38,95%,55%,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={18} color="var(--accent-amber)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--accent-amber)", marginBottom: 4 }}>Auto-Purge Warning</div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Files in trash are <strong style={{ color: "var(--text-secondary)" }}>permanently purged after 30 days</strong> from deletion. Binary chunks and all metadata are irreversibly destroyed from object storage. Restore important files before the deadline.
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, animation: "fadeInUp 0.4s var(--ease-out) 0.1s both" }}>
          {[
            { label: "Files in Trash", value: files.length, icon: Trash2, gradient: "var(--grad-orange)", color: "var(--accent-amber)" },
            { label: "Space Recoverable", value: formatBytes(totalSize), icon: HardDrive, gradient: "var(--grad-teal)", color: "var(--accent-emerald)" },
            { label: "Auto-purge in", value: "30 days", icon: Calendar, gradient: "var(--grad-purple)", color: "var(--accent-secondary)" },
          ].map((s, i) => (
            <div key={i} style={{ background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "var(--shadow-card-3d)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: s.gradient }} />
              <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: s.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <s.icon size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "14px 20px", boxShadow: "var(--shadow-card-3d)", animation: "fadeInUp 0.4s var(--ease-out) 0.15s both" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search deleted files..."
              style={{ width: "100%", background: "hsla(0,0%,0%,0.2)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "9px 12px 9px 36px", color: "var(--text-primary)", fontSize: 13, fontFamily: "var(--font-body)", outline: "none" }}
            />
          </div>
          {filtered.length > 0 && (
            <button onClick={toggleAll} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              {selected.length === filtered.length ? <CheckSquare size={14} color="var(--accent-primary)" /> : <Square size={14} />}
              {selected.length === filtered.length ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>

        {/* File list */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(5)].map((_,i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: "var(--radius-xl)" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "72px 24px", background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-card-3d)" }}>
            <Trash2 size={52} color="var(--text-disabled)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Trash is empty</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Deleted files will appear here for 30 days before permanent deletion.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "fadeInUp 0.4s var(--ease-out) 0.2s both" }}>
            {filtered.map((file, idx) => {
              const id = file.fileId || file._id;
              const { icon: FIcon, color } = getFileIcon(file.originalName || file.name);
              const daysLeft = file.deletedAt ? getDaysLeft(file.deletedAt) : 30;
              const urgency = daysLeft < 3 ? "var(--color-danger)" : daysLeft < 7 ? "var(--accent-amber)" : "var(--text-muted)";
              const isSelected = selected.includes(id);
              return (
                <div key={id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                  background: isSelected ? "var(--accent-primary-subtle)" : "var(--glass-bg)",
                  backdropFilter: "var(--glass-blur)",
                  border: `1px solid ${isSelected ? "var(--accent-primary-glow)" : "var(--glass-border)"}`,
                  borderRadius: "var(--radius-xl)",
                  transition: "all 0.25s var(--ease-out)",
                  boxShadow: "var(--shadow-card-3d)",
                  animation: `fadeInUp 0.4s var(--ease-out) ${0.02 * idx}s both`,
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.transform = "translateX(6px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
                >
                  {/* Checkbox */}
                  <button onClick={() => toggleSelect(id)} style={{ background: "none", border: "none", cursor: "pointer", color: isSelected ? "var(--accent-primary)" : "var(--text-muted)", display: "flex", flexShrink: 0, padding: 0 }}>
                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>

                  {/* Icon */}
                  <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: color + "22", border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FIcon size={18} color={color} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.originalName || file.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3, display: "flex", alignItems: "center", gap: 10 }}>
                      <span>{formatBytes(file.size || 0)}</span>
                      {file.deletedAt && <span>· Deleted {new Date(file.deletedAt).toLocaleDateString()}</span>}
                      <span style={{ color: urgency, fontWeight: 600 }}>· {daysLeft}d left</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => handleRestore(id)} disabled={restoring === id} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
                      background: "hsla(142,71%,45%,0.12)", border: "1px solid hsla(142,71%,45%,0.25)",
                      borderRadius: "var(--radius-md)", color: "var(--color-success)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      transition: "all 0.2s ease", opacity: restoring === id ? 0.6 : 1,
                    }}>
                      <RotateCcw size={12} style={{ animation: restoring === id ? "spin-slow 0.8s linear infinite" : "none" }} /> Restore
                    </button>
                    <button onClick={() => handleDelete(id)} disabled={deleting === id} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
                      background: "var(--color-danger-subtle)", border: "1px solid hsla(0,84%,60%,0.25)",
                      borderRadius: "var(--radius-md)", color: "var(--color-danger)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      transition: "all 0.2s ease", opacity: deleting === id ? 0.6 : 1,
                    }}>
                      <Trash2 size={12} /> Purge
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TrashManager;
