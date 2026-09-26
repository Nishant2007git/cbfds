import React, { useState, useRef, useEffect, useCallback } from 'react';
import { animate, createTimeline, stagger } from 'animejs';
import { Shield, Lock, Volume2, VolumeX, SkipForward, Sparkles, Terminal, Activity, Zap, HardDrive } from 'lucide-react';

const PROTOCOL_STEPS = [
  { threshold: 0, tag: 'INIT', message: 'Initializing Distributed Enclave Architecture...' },
  { threshold: 24, tag: 'KEYS', message: 'Deriving Ephemeral Zero-Knowledge Cipher Keys...' },
  { threshold: 52, tag: 'SHARD', message: 'Connecting Sharded Storage Nodes [AES-256-GCM]...' },
  { threshold: 78, tag: 'AUDIT', message: 'Verifying Merkle Tree Hashes & Node Health...' },
  { threshold: 96, tag: 'READY', message: 'Quantum Handshake Verified • Access Granted' }
];

const HEX_CHARS = '0123456789ABCDEF!@#$%&*';

const SplashScreen = ({ onComplete }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const logoRef = useRef(null);
  const ringsRef = useRef(null);
  const progressTextRef = useRef(null);
  const hexStreamRef = useRef(null);
  const tlRef = useRef(null);

  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('active'); // active | fading | done
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('cbfds_sound_muted') === 'true');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hexSnippet, setHexSnippet] = useState('0x7F...AE91');

  const audioCtxRef = useRef(null);
  const particlesRef = useRef([]);

  // Synthesize futuristic tone using Web Audio API
  const playTone = useCallback((freq, type = 'sine', duration = 0.12, gainVal = 0.04) => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current && AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  }, [isMuted]);

  // Grand triumph chime on complete
  const playTriumph = useCallback(() => {
    if (isMuted) return;
    const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    chords.forEach((f, idx) => {
      setTimeout(() => {
        playTone(f, 'triangle', 0.45, 0.05);
      }, idx * 75);
    });
  }, [isMuted, playTone]);

  const triggerCompletion = useCallback(() => {
    if (phase !== 'active') return;
    setPhase('fading');
    playTriumph();

    // Anime.js cinematic warp-out sequence
    animate(containerRef.current, {
      opacity: [1, 0],
      scale: [1, 1.08],
      duration: 650,
      ease: 'inOutExpo',
      onComplete: () => {
        setPhase('done');
        onComplete?.();
      }
    });
  }, [phase, onComplete, playTriumph]);

  // Random hex stream effect generator
  useEffect(() => {
    const interval = setInterval(() => {
      let str = '0x';
      for (let i = 0; i < 8; i++) {
        str += HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
      }
      setHexSnippet(str);
    }, 90);
    return () => clearInterval(interval);
  }, []);

  // Anime.js master timeline setup
  useEffect(() => {
    // Initial sound ping
    setTimeout(() => {
      playTone(440, 'sine', 0.2, 0.04);
    }, 200);

    const progressObj = { val: 0 };

    animate('.splash-core-wrapper', {
      scale: [0.6, 1],
      opacity: [0, 1],
      duration: 800,
      ease: 'outExpo'
    });

    animate('.hud-ring-outer', {
      rotate: 360,
      duration: 4000,
      ease: 'linear',
      loop: true
    });

    animate('.hud-ring-inner', {
      rotate: -360,
      duration: 3200,
      ease: 'linear',
      loop: true
    });

    animate('.satellite-node', {
      scale: [0, 1],
      opacity: [0, 1],
      delay: stagger(120),
      duration: 600,
      ease: 'outBack'
    });

    const progressAnim = animate(progressObj, {
      val: 100,
      duration: 2600,
      ease: 'inOutQuad',
      onUpdate: () => {
        const cur = Math.round(progressObj.val);
        setProgress(cur);

        for (let i = PROTOCOL_STEPS.length - 1; i >= 0; i--) {
          if (cur >= PROTOCOL_STEPS[i].threshold) {
            setCurrentStepIndex(i);
            break;
          }
        }
      },
      onComplete: () => {
        setTimeout(triggerCompletion, 350);
      }
    });

    return () => {
      progressAnim.pause?.();
    };
  }, [playTone, triggerCompletion]);

  // Audio chirp on protocol step shift
  useEffect(() => {
    if (currentStepIndex > 0) {
      playTone(600 + currentStepIndex * 120, 'sine', 0.1, 0.035);
    }
  }, [currentStepIndex, playTone]);

  // 3D Canvas Particle Hyperdrive Vortex
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const count = 90;
    const centerX = width / 2;
    const centerY = height / 2;

    const particles = Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * width * 1.5,
      y: (Math.random() - 0.5) * height * 1.5,
      z: Math.random() * 1000 + 50,
      pz: 1000,
      color: Math.random() > 0.6 ? '#3b82f6' : Math.random() > 0.3 ? '#8b5cf6' : '#06b6d4'
    }));

    let animId;
    let speed = 6;

    const render = () => {
      ctx.fillStyle = 'rgba(4, 7, 15, 0.28)';
      ctx.fillRect(0, 0, width, height);

      const fov = 350;

      for (let i = 0; i < count; i++) {
        const p = particles[i];
        p.pz = p.z;
        p.z -= speed;

        if (p.z <= 0) {
          p.z = 1000;
          p.pz = 1000;
          p.x = (Math.random() - 0.5) * width * 1.5;
          p.y = (Math.random() - 0.5) * height * 1.5;
        }

        const k = fov / p.z;
        const px = p.x * k + width / 2;
        const py = p.y * k + height / 2;

        const pk = fov / p.pz;
        const ppx = p.x * pk + width / 2;
        const ppy = p.y * pk + height / 2;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const alpha = Math.min(1, (1000 - p.z) / 600);
          ctx.beginPath();
          ctx.moveTo(ppx, ppy);
          ctx.lineTo(px, py);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = Math.max(1, (1 - p.z / 1000) * 3);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const currentStep = PROTOCOL_STEPS[currentStepIndex] || PROTOCOL_STEPS[0];

  return (
    <div ref={containerRef} className="splash-fullscreen-overlay">
      {/* 3D Canvas Warp Vortex */}
      <canvas ref={canvasRef} className="splash-canvas" />

      {/* Cybernetic HUD Overlay */}
      <div className="splash-hud-container">
        
        {/* Top Controls Bar */}
        <div className="splash-top-bar">
          <div className="splash-telemetry-badge">
            <span className="telemetry-dot" />
            <span>SYS_VAULT // ENCLAVE v2.0</span>
          </div>

          <div className="splash-actions-group">
            <button
              type="button"
              className="splash-btn-icon"
              onClick={() => {
                const next = !isMuted;
                setIsMuted(next);
                localStorage.setItem('cbfds_sound_muted', next ? 'true' : 'false');
                if (!next) playTone(880, 'sine', 0.15, 0.05);
              }}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <button
              type="button"
              className="splash-btn-skip"
              onClick={triggerCompletion}
              title="Skip Animation"
            >
              <span>Skip</span>
              <SkipForward size={14} />
            </button>
          </div>
        </div>

        {/* Central Core: Shield + HUD Concentric Rings + Satellites */}
        <div className="splash-core-wrapper">
          {/* Rotating Outer HUD Gear Ring */}
          <div className="hud-ring hud-ring-outer" />
          {/* Counter-rotating Inner HUD Ring */}
          <div className="hud-ring hud-ring-inner" />
          
          {/* Satellite Distributed Nodes */}
          <div className="satellite-node sat-north" title="Node 01: North Vault">
            <HardDrive size={13} />
          </div>
          <div className="satellite-node sat-east" title="Node 02: East Vault">
            <Zap size={13} />
          </div>
          <div className="satellite-node sat-south" title="Node 03: South Vault">
            <Lock size={13} />
          </div>
          <div className="satellite-node sat-west" title="Node 04: West Vault">
            <Sparkles size={13} />
          </div>

          {/* Center Hologram Shield Emblem */}
          <div className="splash-emblem-core">
            <div className="emblem-glow-backing" />
            <Shield size={44} className="emblem-icon" />
            <span className="emblem-label">CBFDS</span>
          </div>
        </div>

        {/* Dynamic Telemetry Protocol Text */}
        <div className="splash-progress-section">
          <div className="splash-progress-counter-row">
            <span className="splash-step-tag">[{currentStep.tag}]</span>
            <span className="splash-percentage">{progress}%</span>
          </div>

          {/* Liquid Glowing Progress Bar */}
          <div className="splash-progress-track">
            <div 
              className="splash-progress-fill" 
              style={{ width: `${progress}%` }} 
            />
          </div>

          {/* Current Protocol Status Message */}
          <div className="splash-message-row">
            <span className="splash-message">{currentStep.message}</span>
          </div>

          {/* Real-time Hex Cipher Stream */}
          <div className="splash-hex-row">
            <Terminal size={12} className="hex-icon" />
            <span className="hex-text">{hexSnippet} // SHA-256 MESH ACTIVE</span>
          </div>
        </div>
      </div>

      <style>{`
        .splash-fullscreen-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: #04070f;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          user-select: none;
        }

        .splash-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .splash-hud-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 620px;
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 36px;
        }

        /* Top Bar */
        .splash-top-bar {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .splash-telemetry-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: hsla(217, 91%, 60%, 0.12);
          border: 1px solid hsla(217, 91%, 60%, 0.3);
          border-radius: 9999px;
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          font-weight: 600;
          color: hsl(217, 91%, 60%);
          letter-spacing: 0.06em;
        }

        .telemetry-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: hsl(217, 91%, 60%);
          box-shadow: 0 0 8px hsl(217, 91%, 60%);
          animation: pulse-ring 1.8s infinite;
        }

        .splash-actions-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .splash-btn-icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: hsla(230, 38%, 10%, 0.8);
          border: 1px solid hsla(210, 40%, 98%, 0.1);
          color: hsl(215, 20%, 70%);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .splash-btn-icon:hover {
          color: #fff;
          border-color: hsl(217, 91%, 60%);
          transform: scale(1.08);
        }

        .splash-btn-skip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: hsla(230, 38%, 10%, 0.8);
          border: 1px solid hsla(210, 40%, 98%, 0.12);
          border-radius: 9999px;
          color: hsl(215, 20%, 80%);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .splash-btn-skip:hover {
          color: #fff;
          background: hsla(217, 91%, 60%, 0.2);
          border-color: hsl(217, 91%, 60%);
          transform: scale(1.04);
        }

        /* Core Hologram & Rings */
        .splash-core-wrapper {
          position: relative;
          width: 220px;
          height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hud-ring {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .hud-ring-outer {
          width: 210px;
          height: 210px;
          border: 1px dashed hsla(217, 91%, 60%, 0.35);
          box-shadow: 0 0 24px hsla(217, 91%, 60%, 0.15), inset 0 0 24px hsla(262, 83%, 58%, 0.1);
        }

        .hud-ring-inner {
          width: 160px;
          height: 160px;
          border: 1px solid hsla(262, 83%, 58%, 0.4);
          border-left-color: transparent;
          border-right-color: transparent;
        }

        .satellite-node {
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: hsla(230, 38%, 9%, 0.9);
          border: 1px solid hsla(217, 91%, 60%, 0.4);
          color: hsl(217, 91%, 60%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 12px hsla(217, 91%, 60%, 0.3);
          transition: transform 0.3s ease;
        }

        .sat-north { top: -14px; }
        .sat-east { right: -14px; }
        .sat-south { bottom: -14px; }
        .sat-west { left: -14px; }

        .splash-emblem-core {
          position: relative;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: radial-gradient(circle, hsl(230, 42%, 14%) 0%, hsl(230, 42%, 7%) 100%);
          border: 1px solid hsla(210, 40%, 98%, 0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          box-shadow: 0 0 32px hsla(217, 91%, 60%, 0.4), inset 0 0 16px hsla(210, 40%, 98%, 0.1);
        }

        .emblem-glow-backing {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          background: radial-gradient(circle, hsla(217, 91%, 60%, 0.35) 0%, transparent 70%);
          filter: blur(10px);
          animation: float 3s infinite ease-in-out;
        }

        .emblem-icon {
          color: hsl(217, 91%, 60%);
          filter: drop-shadow(0 0 8px hsl(217, 91%, 60%));
        }

        .emblem-label {
          font-family: var(--font-display, sans-serif);
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.12em;
          color: #fff;
        }

        /* Progress Section */
        .splash-progress-section {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .splash-progress-counter-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: var(--font-mono, monospace);
        }

        .splash-step-tag {
          font-size: 13px;
          font-weight: 700;
          color: hsl(217, 91%, 60%);
          letter-spacing: 0.08em;
        }

        .splash-percentage {
          font-size: 16px;
          font-weight: 800;
          color: #fff;
        }

        .splash-progress-track {
          width: 100%;
          height: 6px;
          background: hsla(230, 40%, 12%, 0.8);
          border-radius: 9999px;
          overflow: hidden;
          border: 1px solid hsla(210, 40%, 98%, 0.08);
        }

        .splash-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, hsl(217, 91%, 60%), hsl(262, 83%, 58%), hsl(187, 85%, 53%));
          border-radius: 9999px;
          box-shadow: 0 0 14px hsl(217, 91%, 60%);
          transition: width 0.1s linear;
        }

        .splash-message-row {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 22px;
        }

        .splash-message {
          font-size: 13px;
          font-weight: 500;
          color: hsl(215, 20%, 75%);
          text-align: center;
          animation: fadeIn 0.3s ease;
        }

        .splash-hex-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: hsl(215, 16%, 45%);
        }

        .hex-icon {
          color: hsl(160, 84%, 45%);
        }

        .hex-text {
          letter-spacing: 0.08em;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
