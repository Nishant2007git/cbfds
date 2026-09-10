import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Shield, ShieldCheck, Lock, Cpu, Volume2, VolumeX, SkipForward, Sparkles, Terminal, Activity } from 'lucide-react';

const PROTOCOL_STEPS = [
  { threshold: 0, tag: 'INIT', message: 'Initializing Distributed Enclave Architecture...' },
  { threshold: 22, tag: 'KEYS', message: 'Deriving Ephemeral Zero-Knowledge Cipher Keys...' },
  { threshold: 48, tag: 'MESH', message: 'Establishing Sharded Storage Nodes [AES-256-GCM]...' },
  { threshold: 74, tag: 'AUDIT', message: 'Verifying Merkle Tree Integrity & Access ACLs...' },
  { threshold: 92, tag: 'READY', message: 'Security Handshake Verified • Access Granted' }
];

const SplashScreen = ({ onComplete }) => {
  const canvasRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('active'); // active | fading | done
  const phaseRef = useRef('active');
  const [isMuted, setIsMuted] = useState(true);
  const [audioSupported, setAudioSupported] = useState(false);
  const audioCtxRef = useRef(null);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const particlesRef = useRef([]);

  // Setup Web Audio Synthesizer (Zero external files needed)
  useEffect(() => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      setAudioSupported(true);
    }
  }, []);

  const playSynthesizerTone = useCallback((freq, type = 'sine', duration = 0.15, gainVal = 0.08) => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current && AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'suspended') {
        ctx?.resume();
      }
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }, [isMuted]);

  // Completion chime
  const playCompletionChime = useCallback(() => {
    if (isMuted) return;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      setTimeout(() => {
        playSynthesizerTone(freq, 'triangle', 0.4, 0.06);
      }, idx * 90);
    });
  }, [isMuted, playSynthesizerTone]);

  const triggerCompletion = useCallback(() => {
    if (phaseRef.current !== 'active') return;
    phaseRef.current = 'fading';
    setPhase('fading');
    playCompletionChime();
    setTimeout(() => {
      phaseRef.current = 'done';
      setPhase('done');
      onComplete?.();
    }, 750);
  }, [onComplete, playCompletionChime]);

  // Handle Skip
  const handleSkip = () => {
    triggerCompletion();
  };

  // Toggle Sound
  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      if (audioCtxRef.current?.state === 'running') {
        audioCtxRef.current.suspend();
      }
    } else {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current && AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
      audioCtxRef.current?.resume();
      // Friendly audio chirp
      playSynthesizerTone(880, 'sine', 0.12, 0.08);
    }
  };

  // High-performance Canvas Quantum Node Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };
    window.addEventListener('resize', handleResize);

    // Particle count scaled to screen size
    const count = Math.min(Math.floor((width * height) / 18000), 75);

    const initParticles = () => {
      const p = [];
      const centerX = width / 2;
      const centerY = height / 2;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * Math.max(width, height) * 0.45;
        p.push({
          x: centerX + Math.cos(angle) * dist,
          y: centerY + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          radius: Math.random() * 2 + 1,
          baseAlpha: Math.random() * 0.5 + 0.2,
          color: Math.random() > 0.4 ? '#6366f1' : Math.random() > 0.5 ? '#3b82f6' : '#06b6d4',
          pulse: Math.random() * Math.PI * 2
        });
      }
      particlesRef.current = p;
    };

    initParticles();

    // Mouse / Touch Interactivity
    let mouseX = width / 2;
    let mouseY = height / 2;
    const handlePointerMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      mouseX = clientX;
      mouseY = clientY;
    };
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    let lastTime = performance.now();

    const render = (now) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const particles = particlesRef.current;

      // Draw subtle radial depth gradient
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, Math.max(width, height) * 0.65);
      bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
      bgGrad.addColorStop(0.5, 'rgba(8, 12, 22, 0.95)');
      bgGrad.addColorStop(1, 'rgba(4, 6, 12, 1)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw dynamic laser connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Gravitational drift toward center vortex + slight drift
        const dxCenter = centerX - p1.x;
        const dyCenter = centerY - p1.y;
        const distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);
        
        p1.x += p1.vx + (dxCenter / (distCenter + 100)) * 0.35;
        p1.y += p1.vy + (dyCenter / (distCenter + 100)) * 0.35;

        // Wrap edges smoothly
        if (p1.x < 0) p1.x = width;
        if (p1.x > width) p1.x = 0;
        if (p1.y < 0) p1.y = height;
        if (p1.y > height) p1.y = 0;

        p1.pulse += delta * 3;

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.28;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Draw particle node
        const glowAlpha = p1.baseAlpha + Math.sin(p1.pulse) * 0.15;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = p1.color;
        ctx.shadowColor = p1.color;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = Math.max(0.1, Math.min(1, glowAlpha));
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // Draw glowing central vortex ring
      const ringRadius = Math.min(width, height) * 0.22;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 12]);
      ctx.stroke();
      ctx.setLineDash([]);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
    };
  }, []);

  // Progress Loop (Smooth 3.2s total duration)
  useEffect(() => {
    const totalDuration = 3200; // 3.2 seconds
    let lastPlayedStep = -1;

    const animateProgress = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const currentPct = Math.min(Math.floor((elapsed / totalDuration) * 100), 100);

      setProgress(currentPct);

      // Trigger audio blips at stage milestones
      const stepIdx = PROTOCOL_STEPS.findIndex((s, idx) => {
        const next = PROTOCOL_STEPS[idx + 1];
        return currentPct >= s.threshold && (!next || currentPct < next.threshold);
      });

      if (stepIdx !== lastPlayedStep && stepIdx !== -1) {
        lastPlayedStep = stepIdx;
        const noteFreqs = [330, 440, 554.37, 659.25, 880];
        playSynthesizerTone(noteFreqs[stepIdx] || 500, 'sine', 0.1, 0.04);
      }

      if (currentPct < 100) {
        animFrameRef.current = requestAnimationFrame(animateProgress);
      } else {
        setTimeout(() => {
          triggerCompletion();
        }, 350);
      }
    };

    const frameId = requestAnimationFrame(animateProgress);
    return () => cancelAnimationFrame(frameId);
  }, [triggerCompletion, playSynthesizerTone]);

  // Current Protocol Step
  const currentStep = PROTOCOL_STEPS.slice().reverse().find(s => progress >= s.threshold) || PROTOCOL_STEPS[0];

  if (phase === 'done') return null;

  return (
    <div className={`splash-custom-overlay ${phase === 'fading' ? 'splash-custom-fading' : ''}`}>
      {/* 60fps Interactive HTML5 Canvas */}
      <canvas ref={canvasRef} className="splash-custom-canvas" />

      {/* Cyber Grid Overlay */}
      <div className="splash-cyber-grid" />

      {/* Hologram Stage Container */}
      <div className="splash-custom-stage">
        
        {/* Top HUD Diagnostics Bar */}
        <div className="splash-top-hud">
          <div className="hud-metric">
            <span className="hud-metric-dot live-dot" />
            <span className="hud-metric-label">SECURE ENCLAVE</span>
            <span className="hud-metric-val">MIL-STD 810G</span>
          </div>
          <div className="hud-metric-divider" />
          <div className="hud-metric">
            <Activity size={12} className="text-cyan" />
            <span className="hud-metric-label">MESH STATUS</span>
            <span className="hud-metric-val">32 / 32 SYNCED</span>
          </div>
          <div className="hud-metric-divider hide-mobile" />
          <div className="hud-metric hide-mobile">
            <span className="hud-metric-label">LATENCY</span>
            <span className="hud-metric-val text-emerald">8ms ZERO-LOSS</span>
          </div>
        </div>

        {/* Central Futuristic Holographic Vault Core */}
        <div className="hologram-vault-wrapper">
          {/* Ambient Glow Aura */}
          <div className="hologram-aura" />

          {/* Precision SVG HUD Reticles */}
          <svg className="hologram-svg-rings" viewBox="0 0 300 300">
            <defs>
              <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>

            {/* Outer Target Ticks Circle */}
            <circle
              cx="150"
              cy="150"
              r="138"
              fill="none"
              stroke="rgba(99, 102, 241, 0.25)"
              strokeWidth="1.5"
              strokeDasharray="4 12"
              className="spin-ring-counter"
            />

            {/* Segmented Arc Track */}
            <circle
              cx="150"
              cy="150"
              r="120"
              fill="none"
              stroke="url(#cyberGrad)"
              strokeWidth="2.5"
              strokeDasharray="90 35 150 45"
              className="spin-ring-clockwise"
            />

            {/* Dynamic Progress Fill Arc */}
            <circle
              cx="150"
              cy="150"
              r="104"
              fill="none"
              stroke="rgba(56, 189, 248, 0.85)"
              strokeWidth="3"
              strokeDasharray="653"
              strokeDashoffset={653 - (653 * progress) / 100}
              strokeLinecap="round"
              className="progress-arc"
            />

            {/* Inner Hex-Compass Radar Arc */}
            <circle
              cx="150"
              cy="150"
              r="86"
              fill="none"
              stroke="rgba(168, 85, 247, 0.35)"
              strokeWidth="1.5"
              strokeDasharray="18 8"
              className="spin-ring-counter-fast"
            />

            {/* Crosshairs */}
            <line x1="150" y1="2" x2="150" y2="20" stroke="rgba(56, 189, 248, 0.8)" strokeWidth="2" />
            <line x1="150" y1="280" x2="150" y2="298" stroke="rgba(56, 189, 248, 0.8)" strokeWidth="2" />
            <line x1="2" y1="150" x2="20" y2="150" stroke="rgba(56, 189, 248, 0.8)" strokeWidth="2" />
            <line x1="280" y1="150" x2="298" y2="150" stroke="rgba(56, 189, 248, 0.8)" strokeWidth="2" />
          </svg>

          {/* Central Quantum Vault Emblem */}
          <div className="vault-center-core">
            <div className="core-shimmer" />
            <div className="core-laser-scanner" />
            {progress < 100 ? (
              <Shield className="vault-icon pulse-glow text-cyan" size={44} strokeWidth={1.8} />
            ) : (
              <ShieldCheck className="vault-icon text-emerald" size={48} strokeWidth={2} />
            )}
          </div>
        </div>

        {/* Brand Identity & Holographic Title */}
        <div className="splash-identity">
          <div className="splash-brand-badge">
            <span className="badge-glow-dot" />
            <span className="badge-text">CBFDS SECURE NETWORK</span>
            <span className="badge-code">v2.4</span>
          </div>

          <h1 className="splash-brand-title">
            <span className="text-gradient">CLOUD VAULT</span>
          </h1>

          <p className="splash-brand-sub">
            Autonomous Zero-Knowledge Sharded File Distribution
          </p>
        </div>

        {/* Dynamic Terminal Protocol Diagnostic Box */}
        <div className="splash-protocol-console glass-panel">
          <div className="console-header">
            <div className="console-dots">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
            <div className="console-title">
              <Terminal size={12} className="inline-icon" />
              <span>DIAGNOSTIC PROTOCOL RUNNER</span>
            </div>
            <div className="console-pct">
              {progress}%
            </div>
          </div>

          <div className="console-body">
            <div className="console-line">
              <span className="console-tag">[{currentStep.tag}]</span>
              <span className="console-msg">{currentStep.message}</span>
              <span className="cursor-caret">_</span>
            </div>
          </div>

          {/* High-Tech Glowing Progress Bar */}
          <div className="console-progress-track">
            <div
              className="console-progress-fill"
              style={{ width: `${progress}%` }}
            >
              <div className="progress-light-tip" />
            </div>
          </div>
        </div>

        {/* Bottom Actions: Audio Synthesizer Toggle & Instant Skip */}
        <div className="splash-bottom-actions">
          {audioSupported && (
            <button
              type="button"
              className="custom-splash-btn audio-btn"
              onClick={toggleSound}
              title={isMuted ? 'Unmute Audio Synthesizer' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} className="pulse-audio-icon" />}
              <span>{isMuted ? 'Unmute Synth' : 'Synth ON'}</span>
            </button>
          )}

          <button
            type="button"
            className="custom-splash-btn skip-btn"
            onClick={handleSkip}
            title="Skip to Application"
          >
            <span>Skip Intro</span>
            <SkipForward size={14} />
          </button>
        </div>

      </div>

      <style>{`
        /* ═══ FULLSCREEN IMMERSIVE CONTAINER ═══ */
        .splash-custom-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: #030712;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          opacity: 1;
          transform: scale(1);
          transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
          -webkit-user-select: none;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .splash-custom-overlay.splash-custom-fading {
          opacity: 0;
          transform: scale(1.04);
          pointer-events: none;
        }

        /* ═══ CANVAS BACKGROUND ═══ */
        .splash-custom-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
        }

        /* ═══ CYBER GRID MESH ═══ */
        .splash-cyber-grid {
          position: absolute;
          inset: 0;
          z-index: 2;
          background-image: 
            linear-gradient(to right, rgba(99, 102, 241, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
          -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
        }

        /* ═══ STAGE CONTENT ═══ */
        .splash-custom-stage {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 680px;
          padding: 24px;
          box-sizing: border-box;
          animation: stageAppear 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* ═══ TOP HUD METRICS ═══ */
        .splash-top-hud {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 8px 18px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9999px;
          margin-bottom: 28px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
        }

        .hud-metric {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
        }

        .hud-metric-label {
          color: rgba(255, 255, 255, 0.45);
          text-transform: uppercase;
        }

        .hud-metric-val {
          color: #f8fafc;
          font-family: 'JetBrains Mono', monospace;
        }

        .hud-metric-dot.live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: blinkDot 1.2s infinite ease-in-out;
        }

        .hud-metric-divider {
          width: 1px;
          height: 12px;
          background: rgba(255, 255, 255, 0.12);
        }

        /* ═══ HOLOGRAM VAULT CORE ═══ */
        .hologram-vault-wrapper {
          position: relative;
          width: 220px;
          height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .hologram-aura {
          position: absolute;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.28) 0%, rgba(56, 189, 248, 0.12) 45%, transparent 70%);
          filter: blur(28px);
          pointer-events: none;
          animation: auraPulse 3.5s infinite ease-in-out;
        }

        .hologram-svg-rings {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .spin-ring-clockwise {
          transform-origin: center;
          animation: spinClockwise 16s linear infinite;
        }

        .spin-ring-counter {
          transform-origin: center;
          animation: spinCounter 22s linear infinite;
        }

        .spin-ring-counter-fast {
          transform-origin: center;
          animation: spinCounter 10s linear infinite;
        }

        .progress-arc {
          transform-origin: center;
          transform: rotate(-90deg);
          transition: stroke-dashoffset 0.1s linear;
        }

        .vault-center-core {
          position: relative;
          width: 108px;
          height: 108px;
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95));
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.6),
            inset 0 0 20px rgba(99, 102, 241, 0.25),
            0 0 25px rgba(56, 189, 248, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .core-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, transparent 50%, transparent 100%);
          pointer-events: none;
        }

        .core-laser-scanner {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #38bdf8, #818cf8, transparent);
          box-shadow: 0 0 10px #38bdf8;
          animation: laserScan 2s infinite ease-in-out;
        }

        .vault-icon {
          position: relative;
          z-index: 5;
          filter: drop-shadow(0 0 12px rgba(56, 189, 248, 0.6));
          transition: all 0.3s ease;
        }

        /* ═══ BRAND IDENTITY ═══ */
        .splash-identity {
          text-align: center;
          margin-bottom: 24px;
        }

        .splash-brand-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px;
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.25);
          border-radius: 9999px;
          margin-bottom: 12px;
        }

        .badge-glow-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #38bdf8;
          box-shadow: 0 0 6px #38bdf8;
        }

        .badge-text {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #93c5fd;
        }

        .badge-code {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          font-family: 'JetBrains Mono', monospace;
        }

        .splash-brand-title {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(34px, 7vw, 46px);
          font-weight: 900;
          letter-spacing: 2px;
          line-height: 1.1;
          margin: 0 0 8px 0;
        }

        .splash-brand-sub {
          font-size: clamp(12.5px, 2.8vw, 14px);
          color: rgba(255, 255, 255, 0.55);
          margin: 0;
          font-weight: 400;
          letter-spacing: 0.01em;
        }

        /* ═══ PROTOCOL CONSOLE ═══ */
        .splash-protocol-console {
          width: 100%;
          border-radius: 16px;
          background: rgba(10, 15, 30, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          margin-bottom: 24px;
        }

        .console-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: rgba(15, 23, 42, 0.6);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .console-dots {
          display: flex;
          gap: 6px;
        }

        .console-dots .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .console-dots .dot.red { background: #ef4444; }
        .console-dots .dot.yellow { background: #f59e0b; }
        .console-dots .dot.green { background: #10b981; }

        .console-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.45);
        }

        .console-pct {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 700;
          color: #38bdf8;
        }

        .console-body {
          padding: 14px 16px;
          min-height: 48px;
          display: flex;
          align-items: center;
        }

        .console-line {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12.5px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .console-tag {
          color: #818cf8;
          font-weight: 700;
        }

        .console-msg {
          color: #f1f5f9;
        }

        .cursor-caret {
          color: #38bdf8;
          animation: blinkCaret 0.8s infinite;
          font-weight: bold;
        }

        .console-progress-track {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.06);
          position: relative;
        }

        .console-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #38bdf8, #6366f1, #a855f7);
          transition: width 0.1s linear;
          position: relative;
        }

        .progress-light-tip {
          position: absolute;
          right: 0;
          top: -3px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 10px #38bdf8, 0 0 18px #6366f1;
        }

        /* ═══ BOTTOM CONTROLS ═══ */
        .splash-bottom-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .custom-splash-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 9999px;
          color: #f1f5f9;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
        }

        .custom-splash-btn:hover {
          background: rgba(30, 41, 59, 0.9);
          border-color: rgba(99, 102, 241, 0.5);
          color: #ffffff;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.3);
        }

        .custom-splash-btn:active {
          transform: translateY(0) scale(0.97);
        }

        .pulse-audio-icon {
          animation: pulseAudio 1.2s infinite ease-in-out;
        }

        /* ═══ UTILITY COLORS & KEYFRAMES ═══ */
        .text-cyan { color: #38bdf8; }
        .text-emerald { color: #10b981; }

        @keyframes stageAppear {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes spinClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spinCounter {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes laserScan {
          0% { top: 0; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 106px; opacity: 0; }
        }

        @keyframes auraPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }

        @keyframes blinkDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        @keyframes blinkCaret {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @keyframes pulseAudio {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); color: #38bdf8; }
        }

        /* ═══ MOBILE RESPONSIVENESS ═══ */
        @media (max-width: 640px) {
          .splash-custom-stage {
            padding: 16px;
          }
          .splash-top-hud {
            margin-bottom: 18px;
            padding: 6px 14px;
            gap: 10px;
          }
          .hide-mobile {
            display: none !important;
          }
          .hologram-vault-wrapper {
            width: 170px;
            height: 170px;
            margin-bottom: 18px;
          }
          .vault-center-core {
            width: 88px;
            height: 88px;
            border-radius: 22px;
          }
          .splash-brand-title {
            font-size: 32px;
          }
          .console-line {
            font-size: 11px;
          }
          .custom-splash-btn {
            padding: 8px 14px;
            font-size: 11.5px;
          }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
