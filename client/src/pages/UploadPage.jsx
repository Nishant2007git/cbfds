import React from "react";
import Layout from "../components/Layout.jsx";
import UploadZone from "../components/UploadZone.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { UploadCloud, Zap, Shield, HardDrive } from "lucide-react";

const UploadPage = () => {
  const { refreshUserData } = useAuth();

  return (
    <Layout title="Upload Zone">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Header */}
        <div style={{ animation: "fadeInUp 0.4s var(--ease-out) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-primary)", animation: "pulse-glow 2s infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Resumable Upload</span>
          </div>
          <h1 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Upload <span className="text-gradient">Files</span>
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 4 }}>Drag & drop files or browse. Uploads are resumable and encrypted in transit.</p>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", animation: "fadeInUp 0.4s var(--ease-out) 0.05s both" }}>
          {[
            { icon: Zap, text: "Resumable via TUS protocol", color: "var(--accent-primary)" },
            { icon: Shield, text: "AES-256 encrypted transit", color: "var(--accent-emerald)" },
            { icon: HardDrive, text: "Chunked streaming upload", color: "var(--accent-secondary)" },
          ].map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "7px 14px",
              background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)",
              border: "1px solid var(--glass-border)", borderRadius: 99,
              fontSize: 12, fontWeight: 600, color: f.color,
              boxShadow: "var(--shadow-card-3d)",
            }}>
              <f.icon size={12} />
              {f.text}
            </div>
          ))}
        </div>

        {/* Upload zone panel */}
        <div style={{
          background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-2xl)",
          padding: 28, boxShadow: "var(--shadow-card-3d)",
          animation: "fadeInUp 0.5s var(--ease-out) 0.1s both",
          position: "relative", overflow: "hidden",
        }}>
          {/* Top gradient bar */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--gradient-brand)" }} />
          {/* Glow */}
          <div style={{ position: "absolute", inset: 0, background: "var(--gradient-brand)", opacity: 0.03, borderRadius: "inherit", pointerEvents: "none" }} />
          
          <UploadZone onUploadComplete={refreshUserData} />
        </div>
      </div>
    </Layout>
  );
};

export default UploadPage;
