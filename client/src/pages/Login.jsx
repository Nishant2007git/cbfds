import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { HardDrive, Lock, Mail, User as UserIcon, ArrowRight, Eye, EyeOff, Shield, Zap, Check, AlertCircle } from "lucide-react";
import { soundSpells } from "../utils/soundSpells.js";

const ThreeBackground = React.lazy(() => import("../components/ThreeBackground.jsx"));

/* ─── 3D Tilt card hook ────────────────────────────────────────────── */
function useTilt(strength = 12) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      el.style.transform = `perspective(900px) rotateY(${dx * strength}deg) rotateX(${-dy * strength}deg) translateZ(20px)`;
      el.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
      el.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
    };
    const onLeave = () => { el.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg) translateZ(0)"; };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); };
  }, [strength]);
  return ref;
}

/* ─── Floating label input ─────────────────────────────────────────── */
const FloatInput = ({ icon: Icon, label, type = "text", value, onChange, suffix, autoComplete }) => {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  return (
    <div className="float-input-wrap" style={{ position: "relative", marginBottom: 20 }}>
      <div style={{
        position: "relative",
        background: "var(--glass-bg)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${focused ? "var(--accent-primary)" : "var(--glass-border)"}`,
        borderRadius: "var(--radius-md)",
        transition: "border-color 0.25s ease, box-shadow 0.25s ease",
        boxShadow: focused ? "0 0 0 3px var(--accent-primary-subtle), 0 4px 20px var(--accent-primary-subtle)" : "var(--shadow-md)",
      }}>
        {/* Label */}
        <label style={{
          position: "absolute",
          left: Icon ? 44 : 14,
          top: active ? 8 : "50%",
          transform: active ? "none" : "translateY(-50%)",
          fontSize: active ? 10 : 14,
          fontWeight: 600,
          color: focused ? "var(--accent-primary)" : "var(--text-muted)",
          letterSpacing: active ? "0.07em" : "0",
          textTransform: active ? "uppercase" : "none",
          transition: "all 0.2s var(--ease-out)",
          pointerEvents: "none",
          userSelect: "none",
        }}>
          {label}
        </label>
        {/* Icon */}
        {Icon && (
          <div style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            color: focused ? "var(--accent-primary)" : "var(--text-muted)",
            transition: "color 0.2s ease",
            display: "flex",
          }}>
            <Icon size={16} />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            padding: active ? "26px 14px 10px" : "18px 14px",
            paddingLeft: Icon ? (active ? 44 : 44) : 14,
            paddingRight: suffix ? 44 : 14,
            color: "var(--text-primary)",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            transition: "padding 0.2s ease",
          }}
        />
        {suffix && (
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
            {suffix}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Password strength bar ─────────────────────────────────────────── */
const StrengthBar = ({ checks }) => {
  const score = Object.values(checks).filter(Boolean).length;
  const colors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#22c55e"];
  const labels = ["", "Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  return (
    <div style={{ marginTop: -12, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i <= score ? colors[score] : "var(--glass-border)",
            transition: "background 0.3s ease",
          }} />
        ))}
      </div>
      {score > 0 && <div style={{ fontSize: 11, color: colors[score], fontWeight: 600, textAlign: "right" }}>{labels[score]}</div>}
    </div>
  );
};

/* ─── Check row ─────────────────────────────────────────────────────── */
const CheckRow = ({ ok, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: ok ? "var(--color-success)" : "var(--text-muted)", transition: "color 0.2s ease" }}>
    <Check size={12} strokeWidth={ok ? 3 : 1.5} />
    {label}
  </div>
);

/* ─── Decorative 3D floating shapes ─────────────────────────────────── */
const FloatingShapes = () => (
  <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
    {[
      { size: 200, top: "8%", left: "-60px", color: "var(--accent-primary)", dur: "20s" },
      { size: 140, bottom: "12%", right: "-40px", color: "var(--accent-secondary)", dur: "26s" },
      { size: 100, top: "45%", left: "8%", color: "var(--accent-cyan)", dur: "18s" },
      { size: 80, top: "20%", right: "12%", color: "var(--accent-emerald)", dur: "22s" },
    ].map((s, i) => (
      <div key={i} style={{
        position: "absolute",
        width: s.size, height: s.size,
        top: s.top, bottom: s.bottom, left: s.left, right: s.right,
        background: `radial-gradient(circle, ${s.color} 0%, transparent 70%)`,
        borderRadius: "50%",
        filter: "blur(60px)",
        opacity: 0.25,
        animation: `orb-float ${s.dur} ease-in-out infinite alternate`,
        animationDelay: `${-i * 4}s`,
      }} />
    ))}
    {/* Grid lines */}
    <div style={{
      position: "absolute", inset: 0,
      backgroundImage: "linear-gradient(to right, hsla(210,40%,98%,0.025) 1px, transparent 1px), linear-gradient(to bottom, hsla(210,40%,98%,0.025) 1px, transparent 1px)",
      backgroundSize: "56px 56px",
      maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 0%, transparent 100%)",
      WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 0%, transparent 100%)",
    }} />
    {/* 3D perspective grid bottom */}
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
      background: "linear-gradient(to top, var(--bg-base) 0%, transparent 100%)",
      backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, hsla(210,40%,98%,0.015) 40px, hsla(210,40%,98%,0.015) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, hsla(210,40%,98%,0.015) 40px, hsla(210,40%,98%,0.015) 41px)",
      transform: "perspective(300px) rotateX(60deg) translateY(20%)",
      transformOrigin: "bottom center",
      opacity: 0.5,
    }} />
  </div>
);

/* ─── Main Login Component ─────────────────────────────────────────── */
const Login = ({ initialMode = "login" }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(initialMode === "register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cardRef = useTilt(8);

  useEffect(() => { setIsRegister(initialMode === "register"); }, [initialMode]);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

  const checks = {
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    lower:   /[a-z]/.test(password),
    digit:   /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const isPasswordValid = Object.values(checks).every(Boolean);
  const isPasswordMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    soundSpells.playClick?.();
    try {
      if (isRegister) {
        if (!fullName.trim()) throw new Error("Please enter your full name.");
        if (!isPasswordValid) throw new Error("Password does not meet all requirements.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        await register(fullName.trim(), email.trim(), password, confirmPassword);
        soundSpells.playSuccess?.();
      } else {
        if (!email.trim() || !password) throw new Error("Please enter your email and password.");
        await login(email.trim(), password);
        soundSpells.playSuccess?.();
      }
    } catch (err) {
      setError(err.message || "Authentication failed.");
      soundSpells.playError?.();
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(p => !p);
    setError("");
    setPassword("");
    setConfirmPassword("");
    soundSpells.playHover?.();
  };

  /* features column */
  const features = [
    { icon: Shield, color: "var(--accent-primary)", title: "End-to-End Encryption", desc: "AES-256 + RSA hybrid — your files are unreadable to anyone but you." },
    { icon: Zap, color: "var(--accent-cyan)", title: "Lightning Distribution", desc: "Chunked parallel uploads with sub-second latency at global scale." },
    { icon: HardDrive, color: "var(--accent-secondary)", title: "Secure Storage", desc: "Redundant cloud storage with automatic integrity verification." },
  ];

  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-base)",
      overflow: "hidden",
      padding: "24px 16px",
    }}>
      {/* ── 3D WebGL background ── */}
      <React.Suspense fallback={null}>
        <ThreeBackground />
      </React.Suspense>

      <FloatingShapes />

      {/* ── 2-column layout ── */}
      <div style={{
        position: "relative",
        zIndex: 10,
        display: "grid",
        gridTemplateColumns: "1fr 480px",
        gap: 48,
        maxWidth: 1100,
        width: "100%",
        alignItems: "center",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "none" : "translateY(24px)",
        transition: "opacity 0.7s var(--ease-out), transform 0.7s var(--ease-out)",
      }}
      className="login-grid"
      >
        {/* ── Left: hero ── */}
        <div style={{ padding: "0 24px" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <div style={{
              width: 48, height: 48,
              background: "var(--gradient-brand)",
              borderRadius: "var(--radius-md)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px var(--accent-primary-glow)",
              animation: "float 4s ease-in-out infinite",
            }}>
              <HardDrive size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>CBFDS</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>File Distribution</div>
            </div>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 20 }}>
            Secure Files.<br />
            <span className="text-gradient-animated">Anywhere.</span>
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 420, marginBottom: 48, lineHeight: 1.7 }}>
            Enterprise-grade file distribution with military-grade encryption and real-time collaboration tools.
          </p>

          {/* Feature cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {features.map(({ icon: Icon, color, title, desc }, i) => (
              <div key={i} style={{
                display: "flex",
                gap: 16,
                padding: "16px 20px",
                background: "var(--glass-bg)",
                backdropFilter: "blur(20px)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-lg)",
                transition: "transform 0.3s var(--ease-out), box-shadow 0.3s ease",
                animation: `fadeInUp 0.5s var(--ease-out) ${0.1 + i * 0.1}s both`,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateX(8px) translateZ(4px)"; e.currentTarget.style.boxShadow = "var(--shadow-glow)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: "var(--radius-md)",
                  background: `${color}22`,
                  border: `1px solid ${color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon size={18} color={color} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "var(--text-primary)" }}>{title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: 3D glass auth card ── */}
        <div
          ref={cardRef}
          className="spotlight-card"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "var(--glass-blur-heavy)",
            WebkitBackdropFilter: "var(--glass-blur-heavy)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-2xl)",
            padding: "36px 32px",
            boxShadow: "var(--shadow-card-3d)",
            transition: "transform 0.4s var(--ease-3d), box-shadow 0.4s ease",
            transformStyle: "preserve-3d",
            willChange: "transform",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top glow line */}
          <div style={{
            position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
            background: "linear-gradient(90deg, transparent, var(--accent-primary), transparent)",
            opacity: 0.6,
          }} />
          {/* Shine overlay */}
          <div style={{
            position: "absolute", inset: 0,
            background: "var(--gradient-card-shine)",
            borderRadius: "inherit",
            pointerEvents: "none",
          }} />
          {/* Spotlight follows mouse */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
            background: "radial-gradient(circle 250px at var(--mouse-x, 50%) var(--mouse-y, 50%), hsla(210,40%,98%,0.06) 0%, transparent 60%)",
          }} />

          {/* Mode toggle tabs */}
          <div style={{
            display: "flex",
            background: "hsla(0,0%,0%,0.2)",
            borderRadius: "var(--radius-md)",
            padding: 4,
            marginBottom: 28,
            position: "relative",
            zIndex: 1,
          }}>
            {["Sign In", "Sign Up"].map((tab, i) => {
              const active = isRegister ? i === 1 : i === 0;
              return (
                <button key={tab} onClick={i === 0 ? () => { setIsRegister(false); setError(""); } : () => { setIsRegister(true); setError(""); }} style={{
                  flex: 1, padding: "10px", fontSize: 13.5, fontWeight: 600,
                  border: "none", cursor: "pointer", borderRadius: "calc(var(--radius-md) - 2px)",
                  background: active ? "var(--gradient-brand)" : "transparent",
                  color: active ? "#fff" : "var(--text-muted)",
                  transition: "all 0.25s var(--ease-out)",
                  boxShadow: active ? "0 4px 12px var(--accent-primary-glow)" : "none",
                }}>
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", marginBottom: 20,
              background: "var(--color-danger-subtle)",
              border: "1px solid hsla(0,84%,60%,0.25)",
              borderRadius: "var(--radius-md)",
              animation: "scaleIn 0.25s var(--ease-spring)",
            }}>
              <AlertCircle size={15} color="var(--color-danger)" />
              <span style={{ fontSize: 13, color: "var(--color-danger)", fontWeight: 500 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ position: "relative", zIndex: 1 }}>
            {isRegister && (
              <div style={{ animation: "fadeInUp 0.3s var(--ease-out) both" }}>
                <FloatInput icon={UserIcon} label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" />
              </div>
            )}

            <FloatInput icon={Mail} label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />

            <FloatInput
              icon={Lock} label="Password"
              type={showPassword ? "text" : "password"}
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              suffix={
                <button type="button" onClick={() => setShowPassword(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 0 }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            {isRegister && password.length > 0 && <StrengthBar checks={checks} />}

            {isRegister && (
              <div style={{ animation: "fadeInUp 0.3s var(--ease-out) 0.1s both" }}>
                <FloatInput
                  icon={Lock} label="Confirm Password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  suffix={
                    <button type="button" onClick={() => setShowConfirm(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 0 }}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                />
              </div>
            )}

            {isRegister && password.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 20, padding: "12px 14px", background: "hsla(0,0%,0%,0.15)", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)" }}>
                <CheckRow ok={checks.length} label="8+ characters" />
                <CheckRow ok={checks.upper} label="Uppercase" />
                <CheckRow ok={checks.lower} label="Lowercase" />
                <CheckRow ok={checks.digit} label="Number" />
                <CheckRow ok={checks.special} label="Special char" />
                {confirmPassword.length > 0 && <CheckRow ok={isPasswordMatch} label="Passwords match" />}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{
              width: "100%", padding: "13px 24px", fontSize: 15, fontWeight: 700,
              marginTop: 4,
              background: "var(--gradient-brand)",
              border: "none",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 6px 24px var(--accent-primary-glow)",
              cursor: loading ? "wait" : "pointer",
              color: "#fff",
              letterSpacing: "0.01em",
              transition: "all 0.3s var(--ease-out)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              {loading ? (
                <>
                  <div style={{ width: 18, height: 18, border: "2.5px solid hsla(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin-slow 0.7s linear infinite" }} />
                  {isRegister ? "Creating Account..." : "Signing In..."}
                </>
              ) : (
                <>
                  {isRegister ? "Create Account" : "Sign In"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--glass-border)", position: "relative", zIndex: 1 }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {isRegister ? "Already have an account? " : "New to CBFDS? "}
            </span>
            <button onClick={toggleMode} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700, color: "var(--accent-primary)",
              textDecoration: "none",
              transition: "opacity 0.2s",
            }}>
              {isRegister ? "Sign in instead" : "Create free account"}
            </button>
          </div>
        </div>
      </div>

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 900px) {
          .login-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .login-grid > div:first-child { display: none; }
        }
      `}</style>
    </div>
  );
};

export default Login;
