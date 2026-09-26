import React, { useState, useRef, useEffect, useCallback } from 'react';
import { animate, stagger, createTimeline } from 'animejs';
import { Shield, Lock, Volume2, VolumeX, SkipForward, Sparkles, Terminal, Zap, HardDrive, Globe, Cpu, Activity } from 'lucide-react';

const PROTOCOL_STEPS = [
  { threshold: 0,  tag: 'BOOT',   message: 'Initializing Distributed Enclave Architecture...',   color: '#3b82f6' },
  { threshold: 18, tag: 'KEYS',   message: 'Deriving Ephemeral Zero-Knowledge Cipher Keys...',    color: '#8b5cf6' },
  { threshold: 38, tag: 'SHARD',  message: 'Connecting Sharded Storage Nodes [AES-256-GCM]...',   color: '#06b6d4' },
  { threshold: 58, tag: 'MESH',   message: 'Establishing P2P Merkle-Sync Neural Mesh...',          color: '#10b981' },
  { threshold: 78, tag: 'AUDIT',  message: 'Verifying Quantum Hash Proofs & Node Integrity...',    color: '#f59e0b' },
  { threshold: 96, tag: 'READY',  message: 'Quantum Handshake Verified - Access Granted',          color: '#34d399' },
];

const HEX_CHARS = '0123456789ABCDEF';
const SATELLITE_NODES = [
  { id: 'N', icon: HardDrive, angle:  90, label: 'Node 01' },
  { id: 'E', icon: Zap,       angle:   0, label: 'Node 02' },
  { id: 'S', icon: Lock,      angle: 270, label: 'Node 03' },
  { id: 'W', icon: Globe,     angle: 180, label: 'Node 04' },
];

function hexRand(len) {
  let s = '0x';
  for (let i = 0; i < (len || 6); i++) s += HEX_CHARS[Math.floor(Math.random() * 16)];
  return s;
}

export default function SplashScreen({ onComplete }) {
  const containerRef  = useRef(null);
  const canvasRef     = useRef(null);
  const glowCanvasRef = useRef(null);

  const [progress,     setProgress]     = useState(0);
  const [phase,        setPhase]        = useState('entering');
  const [stepIndex,    setStepIndex]    = useState(0);
  const [hexA,         setHexA]         = useState(hexRand(8));
  const [hexB,         setHexB]         = useState(hexRand(5));
  const [isMuted,      setIsMuted]      = useState(function() { return localStorage.getItem('cbfds_sound_muted') === 'true'; });
  const [scanLine,     setScanLine]     = useState(0);
  const [dataStreams,  setDataStreams]   = useState([]);
  const [nodeStatuses, setNodeStatuses] = useState([false, false, false, false]);

  const audioRef = useRef(null);
  const phaseRef = useRef('entering');
  phaseRef.current = phase;

  const getAudio = useCallback(function() {
    if (!audioRef.current) {
      try {
        var A = window.AudioContext || window.webkitAudioContext;
        if (A) audioRef.current = new A();
      } catch(e) {}
    }
    return audioRef.current;
  }, []);

  const playTone = useCallback(function(freq, type, dur, vol, detune) {
    if (isMuted) return;
    try {
      var ctx = getAudio(); if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      var now  = ctx.currentTime;
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, now);
      if (detune) osc.detune.setValueAtTime(detune, now);
      gain.gain.setValueAtTime(vol || 0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.15));
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + (dur || 0.15));
    } catch(e) {}
  }, [isMuted, getAudio]);

  const playBoot = useCallback(function() {
    var tones = [[220,'sawtooth',0.3,0.02,0],[330,'sine',0.25,0.03,5],[440,'triangle',0.2,0.04,10],[660,'sine',0.35,0.03,15]];
    tones.forEach(function(item, i) {
      setTimeout(function() { playTone(item[0], item[1], item[2], item[3], item[4]); }, i * 60);
    });
  }, [playTone]);

  const playStep = useCallback(function(idx) {
    var freqs = [400, 520, 620, 740, 860, 1080];
    playTone(freqs[idx] || 500, 'sine', 0.12, 0.035);
  }, [playTone]);

  const playTriumph = useCallback(function() {
    if (isMuted) return;
    var chords = [[523,0],[659,70],[784,140],[1047,210],[1319,280],[1568,360]];
    chords.forEach(function(pair) {
      setTimeout(function() { playTone(pair[0], 'triangle', 0.5, 0.05); }, pair[1]);
    });
  }, [isMuted, playTone]);

  const triggerExit = useCallback(function() {
    if (phaseRef.current !== 'active') return;
    setPhase('exiting');
    playTriumph();
    animate('.splash-core-wrapper', { scale: [1, 1.25, 0.0], opacity: [1, 1, 0], duration: 700, ease: 'inOutExpo' });
    animate('.hud-ring-outer',      { scale: [1, 2.5], opacity: [1, 0], duration: 600, ease: 'outExpo' });
    setTimeout(function() {
      animate(containerRef.current, {
        opacity: [1, 0], scale: [1, 1.06],
        duration: 500, ease: 'inOutExpo',
        onComplete: function() { setPhase('done'); if (onComplete) onComplete(); }
      });
    }, 400);
  }, [onComplete, playTriumph]);

  useEffect(function() {
    setTimeout(playBoot, 200);

    var tl = createTimeline({ defaults: { ease: 'outExpo' } });
    tl.add('.splash-scanline-overlay', { opacity: [0, 1], duration: 200 });
    tl.add('.splash-core-wrapper',     { scale: [0.4, 1], opacity: [0, 1], duration: 900, ease: 'outBack(1.2)' }, '-=50');
    tl.add('.hud-ring-outer',          { scale: [0, 1], opacity: [0, 1], duration: 700, ease: 'outBack(1.1)' }, '-=600');
    tl.add('.hud-ring-inner',          { scale: [0, 1], opacity: [0, 1], duration: 600, ease: 'outBack(1.0)' }, '-=500');
    tl.add('.hud-ring-mid',            { scale: [0, 1], opacity: [0, 1], duration: 550, ease: 'outBack(0.9)' }, '-=450');
    tl.add('.satellite-node',          { scale: [0, 1], opacity: [0, 1], delay: stagger(90), duration: 500, ease: 'outBack(1.3)' }, '-=300');
    tl.add('.splash-hud-header',       { translateY: [-30, 0], opacity: [0, 1], duration: 500 }, '-=200');
    tl.add('.splash-progress-section', { translateY: [30, 0],  opacity: [0, 1], duration: 500 }, '-=450');
    tl.add('.data-stream-row',         { translateX: [-20, 0], opacity: [0, 1], delay: stagger(60), duration: 400 }, '-=350');

    setTimeout(function() { setPhase('active'); }, 1100);

    var progObj = { val: 0 };
    setTimeout(function() {
      animate(progObj, {
        val: 100, duration: 3000, ease: 'inOutSine',
        onUpdate: function() {
          var cur = Math.round(progObj.val);
          setProgress(cur);
          for (var i = PROTOCOL_STEPS.length - 1; i >= 0; i--) {
            if (cur >= PROTOCOL_STEPS[i].threshold) {
              var idx = i;
              setStepIndex(function(prev) {
                if (prev !== idx) playStep(idx);
                return idx;
              });
              break;
            }
          }
          if (cur >= 20) setNodeStatuses(function(p) { return [true,  p[1], p[2], p[3]]; });
          if (cur >= 40) setNodeStatuses(function(p) { return [p[0],  true, p[2], p[3]]; });
          if (cur >= 65) setNodeStatuses(function(p) { return [p[0],  p[1], true, p[3]]; });
          if (cur >= 85) setNodeStatuses(function(p) { return [p[0],  p[1], p[2], true ]; });
        },
        onComplete: function() { setTimeout(triggerExit, 400); }
      });
    }, 1200);

    animate('.hud-ring-outer', { rotate: 360,  duration: 5500, ease: 'linear', loop: true });
    animate('.hud-ring-inner', { rotate: -360, duration: 4200, ease: 'linear', loop: true });
    animate('.hud-ring-mid',   { rotate: 360,  duration: 6800, ease: 'linear', loop: true });

    var hexInt = setInterval(function() { setHexA(hexRand(8)); setHexB(hexRand(5)); }, 80);

    var scanPos = 0;
    var scanInt = setInterval(function() { scanPos = (scanPos + 0.8) % 100; setScanLine(scanPos); }, 16);

    var streamInit = [0,1,2,3,4,5].map(function(i) {
      return { id: i, label: ['MEM','CPU','I/O','NET','ENC','PKT'][i], val: Math.round(Math.random() * 80 + 10) };
    });
    setDataStreams(streamInit);
    var streamInt = setInterval(function() {
      setDataStreams(function(prev) {
        return prev.map(function(s) {
          return { id: s.id, label: s.label, val: Math.min(99, Math.max(5, (s.val + ((Math.random() - 0.48) * 12)) | 0)) };
        });
      });
    }, 350);

    return function() {
      clearInterval(hexInt);
      clearInterval(scanInt);
      clearInterval(streamInt);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(function() {
    var canvas = canvasRef.current;
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = (canvas.width  = window.innerWidth);
    var H = (canvas.height = window.innerHeight);
    var onResize = function() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    var colors = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b'];
    var stars = [];
    for (var k = 0; k < 130; k++) {
      stars.push({ x: (Math.random()-0.5)*W*2, y: (Math.random()-0.5)*H*2, z: Math.random()*900+50, pz: 900, color: colors[Math.floor(Math.random()*5)] });
    }
    var raf;
    var draw = function() {
      ctx.fillStyle = 'rgba(4,6,14,0.22)';
      ctx.fillRect(0, 0, W, H);
      var fov = 400;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.pz = s.z; s.z -= 4;
        if (s.z <= 0) { s.z = 900; s.pz = 900; s.x = (Math.random()-0.5)*W*2; s.y = (Math.random()-0.5)*H*2; }
        var kk = fov/s.z, px = s.x*kk+W/2, py = s.y*kk+H/2;
        var pk = fov/s.pz, ppx = s.x*pk+W/2, ppy = s.y*pk+H/2;
        if (px >= -2 && px <= W+2 && py >= -2 && py <= H+2) {
          var alpha = Math.min(1, (900-s.z)/500);
          ctx.beginPath(); ctx.moveTo(ppx, ppy); ctx.lineTo(px, py);
          ctx.strokeStyle = s.color; ctx.globalAlpha = alpha;
          ctx.lineWidth = Math.max(0.5, (1-s.z/900)*3.5); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return function() { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  useEffect(function() {
    var canvas = glowCanvasRef.current;
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = (canvas.width  = window.innerWidth);
    var H = (canvas.height = window.innerHeight);
    var t = 0;
    var raf;
    var orbs = [
      { cx: W*0.25, cy: H*0.35, r: 280, c: 'hsla(217,91%,60%,0.12)', freq: 0.0008, amp: 60 },
      { cx: W*0.75, cy: H*0.55, r: 220, c: 'hsla(262,83%,58%,0.10)', freq: 0.0011, amp: 50 },
      { cx: W*0.50, cy: H*0.20, r: 160, c: 'hsla(187,85%,53%,0.08)', freq: 0.0015, amp: 40 },
    ];
    var draw = function() {
      ctx.clearRect(0, 0, W, H);
      orbs.forEach(function(o) {
        var dx = Math.sin(t * o.freq * 1000) * o.amp;
        var dy = Math.cos(t * o.freq * 700) * o.amp;
        var g = ctx.createRadialGradient(o.cx+dx, o.cy+dy, 0, o.cx+dx, o.cy+dy, o.r);
        g.addColorStop(0, o.c); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });
      t++;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return function() { cancelAnimationFrame(raf); };
  }, []);

  var step = PROTOCOL_STEPS[stepIndex] || PROTOCOL_STEPS[0];

  return (
    <div ref={containerRef} className="sp-root">
      <canvas ref={canvasRef} className="sp-canvas" />
      <canvas ref={glowCanvasRef} className="sp-canvas sp-glow" />

      <div className="splash-scanline-overlay" style={{ opacity: 0 }}>
        <div className="sp-scanmove" style={{ top: scanLine + '%' }} />
      </div>

      <div className="sp-hud">
        <div className="splash-hud-header sp-topbar">
          <div className="sp-badge">
            <span className="sp-dot" />
            <span>CBFDS // ENCLAVE v2.0 // SECURE</span>
          </div>
          <div className="sp-badge sp-badge-mono">
            <Activity size={11} />
            <span>{hexA}</span>
          </div>
          <div className="sp-controls">
            <button type="button" className="sp-btn-icon" title={isMuted ? 'Unmute' : 'Mute'}
              onClick={function() {
                var m = !isMuted;
                setIsMuted(m);
                localStorage.setItem('cbfds_sound_muted', m ? 'true' : 'false');
                if (!m) playTone(880, 'sine', 0.15, 0.05);
              }}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <button type="button" className="sp-btn-skip" onClick={triggerExit}>
              Skip <SkipForward size={13} />
            </button>
          </div>
        </div>

        <div className="sp-core-region">
          <div className="sp-side-panel sp-side-left">
            <div className="sp-panel-title"><Terminal size={11} /> SYS TELEMETRY</div>
            {dataStreams.map(function(s) {
              return (
                <div key={s.id} className="data-stream-row sp-stream-row" style={{ opacity: 0 }}>
                  <span className="sp-stream-label">{s.label}</span>
                  <div className="sp-stream-bar-track">
                    <div className="sp-stream-bar-fill" style={{
                      width: s.val + '%',
                      background: s.val > 70 ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#3b82f6,#8b5cf6)'
                    }} />
                  </div>
                  <span className="sp-stream-val">{s.val}%</span>
                </div>
              );
            })}
            <div className="sp-side-separator" />
            <div className="sp-info-row"><span>PROTO</span><span className="sp-info-val">AES-256-GCM</span></div>
            <div className="sp-info-row"><span>NODES</span><span className="sp-info-val">{nodeStatuses.filter(Boolean).length}/4</span></div>
            <div className="sp-info-row"><span>HASH</span><span className="sp-info-val" style={{ color: step.color }}>{step.tag}</span></div>
          </div>

          <div className="splash-core-wrapper sp-rings-wrap" style={{ opacity: 0 }}>
            <div className="hud-ring hud-ring-outer" style={{ opacity: 0 }} />
            <div className="hud-ring hud-ring-mid"   style={{ opacity: 0 }} />
            <div className="hud-ring hud-ring-inner" style={{ opacity: 0 }} />
            {[0,90,180,270].map(function(a) {
              return <div key={a} className="sp-tick-mark" style={{ transform: 'rotate('+a+'deg) translateY(-108px)' }} />;
            })}
            {SATELLITE_NODES.map(function(node, i) {
              var rad = (node.angle * Math.PI) / 180;
              var r = 108;
              var nx = Math.cos(rad) * r;
              var ny = -Math.sin(rad) * r;
              var Icon = node.icon;
              return (
                <div key={node.id}
                  className={'satellite-node sp-satnode' + (nodeStatuses[i] ? ' sp-satnode--active' : '')}
                  style={{ transform: 'translate('+nx+'px,'+ny+'px)', opacity: 0 }}
                  title={node.label}
                >
                  <Icon size={12} />
                </div>
              );
            })}
            <svg className="sp-connections" viewBox="-120 -120 240 240" xmlns="http://www.w3.org/2000/svg">
              {SATELLITE_NODES.map(function(node, i) {
                var rad = (node.angle * Math.PI) / 180;
                var x = Math.cos(rad) * 108;
                var y = -Math.sin(rad) * 108;
                return (
                  <line key={node.id} x1="0" y1="0" x2={x} y2={y}
                    stroke={nodeStatuses[i] ? step.color : 'hsla(220,30%,40%,0.25)'}
                    strokeWidth="0.8" strokeDasharray="4 3"
                    opacity={nodeStatuses[i] ? 0.6 : 0.25}
                    style={{ transition: 'stroke 0.4s,opacity 0.4s' }}
                  />
                );
              })}
            </svg>
            <div className="sp-emblem">
              <div className="sp-emblem-pulse" style={{ background: 'radial-gradient(circle,' + step.color + '44 0%,transparent 70%)' }} />
              <Shield size={46} className="sp-emblem-icon" style={{ color: step.color, filter: 'drop-shadow(0 0 12px '+step.color+')' }} />
              <span className="sp-emblem-label">CBFDS</span>
            </div>
          </div>

          <div className="sp-side-panel sp-side-right">
            <div className="sp-panel-title"><Cpu size={11} /> NODE STATUS</div>
            {SATELLITE_NODES.map(function(node, i) {
              return (
                <div key={node.id} className="data-stream-row sp-node-row" style={{ opacity: 0 }}>
                  <div className={'sp-node-indicator ' + (nodeStatuses[i] ? 'sp-node--online' : 'sp-node--pending')} />
                  <span className="sp-node-label">{node.label}</span>
                  <span className={'sp-node-status ' + (nodeStatuses[i] ? 'sp-status--online' : 'sp-status--pending')}>
                    {nodeStatuses[i] ? 'ONLINE' : 'LINKING'}
                  </span>
                </div>
              );
            })}
            <div className="sp-side-separator" />
            <div className="sp-info-row"><span>CIPHER</span><span className="sp-info-val">ZK-SNARK</span></div>
            <div className="sp-info-row"><span>REPLICA</span><span className="sp-info-val">4x</span></div>
            <div className="sp-info-row"><span>LATENCY</span><span className="sp-info-val" style={{ color: '#10b981' }}>~2ms</span></div>
          </div>
        </div>

        <div className="splash-progress-section sp-progress-wrap" style={{ opacity: 0 }}>
          <div className="sp-prog-header">
            <span className="sp-step-tag" style={{ color: step.color }}>[{step.tag}]</span>
            <div className="sp-prog-ticks">
              {PROTOCOL_STEPS.map(function(s, i) {
                return (
                  <div key={s.tag} className={'sp-prog-tick' + (i <= stepIndex ? ' sp-tick--done' : '')}
                    style={{ '--c': s.color }}
                  />
                );
              })}
            </div>
            <span className="sp-percentage">{progress}%</span>
          </div>
          <div className="sp-bar-track">
            <div className="sp-bar-fill" style={{
              width: progress + '%',
              background: 'linear-gradient(90deg,' + PROTOCOL_STEPS[0].color + ',' + step.color + ')',
              boxShadow: '0 0 18px ' + step.color + '88'
            }} />
            <div className="sp-bar-shimmer" style={{ left: Math.max(0, progress - 3) + '%' }} />
          </div>
          <div className="sp-msg-row">
            <Sparkles size={13} style={{ color: step.color, flexShrink: 0 }} />
            <span className="sp-msg" style={{ color: stepIndex === 5 ? '#34d399' : undefined }}>{step.message}</span>
          </div>
          <div className="sp-hex-row">
            <Terminal size={11} className="sp-hex-icon" />
            <span className="sp-hex-text">{hexA} :: {hexB} // SHA-256 MESH ACTIVE</span>
          </div>
        </div>
      </div>

      <style>{`
        .sp-root{position:fixed;inset:0;z-index:999999;background:#04060e;display:flex;align-items:center;justify-content:center;overflow:hidden;user-select:none;font-family:'Inter','JetBrains Mono',monospace}
        .sp-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
        .sp-glow{mix-blend-mode:screen}
        .splash-scanline-overlay{position:absolute;inset:0;pointer-events:none;z-index:1;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.08) 3px,rgba(0,0,0,0.08) 4px)}
        .sp-scanmove{position:absolute;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,rgba(59,130,246,0.35),transparent);filter:blur(2px);pointer-events:none}
        .sp-hud{position:relative;z-index:2;width:100%;max-width:880px;padding:24px 20px 28px;display:flex;flex-direction:column;gap:32px;align-items:center}
        .sp-topbar{width:100%;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .sp-badge{display:flex;align-items:center;gap:7px;padding:5px 12px;background:hsla(217,91%,60%,0.10);border:1px solid hsla(217,91%,60%,0.28);border-radius:9999px;font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:600;letter-spacing:0.06em;color:hsl(217,91%,70%)}
        .sp-badge-mono{background:hsla(187,85%,53%,0.08);border-color:hsla(187,85%,53%,0.22);color:hsl(187,85%,60%)}
        .sp-dot{width:6px;height:6px;border-radius:50%;background:hsl(217,91%,60%);box-shadow:0 0 8px hsl(217,91%,60%);animation:sp-pulse 1.6s infinite}
        @keyframes sp-pulse{0%,100%{opacity:1;box-shadow:0 0 8px hsl(217,91%,60%)}50%{opacity:0.5;box-shadow:0 0 3px hsl(217,91%,60%)}}
        .sp-controls{margin-left:auto;display:flex;align-items:center;gap:8px}
        .sp-btn-icon{width:32px;height:32px;border-radius:50%;background:hsla(230,38%,10%,0.8);border:1px solid hsla(210,40%,98%,0.1);color:hsl(215,20%,70%);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.18s ease}
        .sp-btn-icon:hover{color:#fff;border-color:hsl(217,91%,60%);transform:scale(1.1)}
        .sp-btn-skip{display:flex;align-items:center;gap:5px;padding:6px 14px;background:hsla(230,38%,10%,0.8);border:1px solid hsla(210,40%,98%,0.12);border-radius:9999px;color:hsl(215,20%,80%);font-size:11.5px;font-weight:600;cursor:pointer;transition:all 0.18s ease}
        .sp-btn-skip:hover{color:#fff;background:hsla(217,91%,60%,0.2);border-color:hsl(217,91%,60%);transform:scale(1.04)}
        .sp-core-region{display:flex;align-items:center;justify-content:center;gap:28px;width:100%}
        .sp-side-panel{flex:1;max-width:180px;display:flex;flex-direction:column;gap:8px;padding:14px 16px;background:hsla(230,42%,6%,0.7);border:1px solid hsla(217,91%,60%,0.14);border-radius:10px;backdrop-filter:blur(12px)}
        .sp-panel-title{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:700;letter-spacing:0.1em;color:hsl(215,16%,50%);text-transform:uppercase;margin-bottom:4px}
        .sp-stream-row{display:flex;align-items:center;gap:6px}
        .sp-stream-label{font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:600;width:30px;color:hsl(215,20%,55%);flex-shrink:0}
        .sp-stream-bar-track{flex:1;height:3px;border-radius:9999px;background:hsla(220,30%,20%,0.6);overflow:hidden}
        .sp-stream-bar-fill{height:100%;border-radius:9999px;transition:width 0.4s ease}
        .sp-stream-val{font-family:'JetBrains Mono',monospace;font-size:9px;width:28px;text-align:right;color:hsl(215,20%,55%);flex-shrink:0}
        .sp-side-separator{height:1px;background:hsla(220,30%,25%,0.3);margin:4px 0}
        .sp-info-row{display:flex;justify-content:space-between;align-items:center;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:hsl(215,16%,45%)}
        .sp-info-val{color:hsl(215,20%,70%);font-weight:600}
        .sp-node-row{display:flex;align-items:center;gap:7px}
        .sp-node-indicator{width:7px;height:7px;border-radius:50%;flex-shrink:0;transition:background 0.4s,box-shadow 0.4s}
        .sp-node--online{background:#10b981;box-shadow:0 0 8px #10b981;animation:sp-pulse-green 1.4s infinite}
        .sp-node--pending{background:hsl(215,16%,30%)}
        @keyframes sp-pulse-green{0%,100%{box-shadow:0 0 8px #10b981}50%{box-shadow:0 0 3px #10b981}}
        .sp-node-label{font-size:10px;color:hsl(215,20%,60%);flex:1}
        .sp-node-status{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:0.05em}
        .sp-status--online{color:#10b981}
        .sp-status--pending{color:hsl(215,16%,40%)}
        .sp-rings-wrap{position:relative;width:246px;height:246px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .hud-ring{position:absolute;border-radius:50%;pointer-events:none}
        .hud-ring-outer{width:242px;height:242px;border:1px dashed hsla(217,91%,60%,0.38);box-shadow:0 0 30px hsla(217,91%,60%,0.18),inset 0 0 30px hsla(262,83%,58%,0.08)}
        .hud-ring-mid{width:192px;height:192px;border:1px dotted hsla(187,85%,53%,0.30)}
        .hud-ring-inner{width:150px;height:150px;border:1.5px solid hsla(262,83%,58%,0.45);border-top-color:transparent;border-bottom-color:transparent}
        .sp-tick-mark{position:absolute;width:3px;height:10px;background:hsla(217,91%,60%,0.5);border-radius:2px;transform-origin:center 108px}
        .sp-satnode{position:absolute;width:30px;height:30px;border-radius:50%;background:hsla(230,40%,8%,0.92);border:1px solid hsla(217,91%,60%,0.35);color:hsl(217,91%,65%);display:flex;align-items:center;justify-content:center;transition:border-color 0.4s,box-shadow 0.4s,color 0.4s}
        .sp-satnode--active{border-color:hsl(160,84%,45%);color:hsl(160,84%,55%);box-shadow:0 0 14px hsla(160,84%,45%,0.5)}
        .sp-connections{position:absolute;width:240px;height:240px;pointer-events:none}
        .sp-emblem{position:relative;width:108px;height:108px;border-radius:50%;background:radial-gradient(circle,hsl(230,42%,13%) 0%,hsl(230,42%,6%) 100%);border:1px solid hsla(210,40%,98%,0.18);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-shadow:0 0 40px hsla(217,91%,60%,0.35),inset 0 0 20px hsla(210,40%,98%,0.05)}
        .sp-emblem-pulse{position:absolute;inset:-14px;border-radius:50%;filter:blur(12px);animation:sp-float 3.2s ease-in-out infinite}
        @keyframes sp-float{0%,100%{transform:scale(1);opacity:0.7}50%{transform:scale(1.15);opacity:1}}
        .sp-emblem-icon{position:relative;z-index:1}
        .sp-emblem-label{font-family:'Outfit',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.14em;color:#fff;position:relative;z-index:1}
        .sp-progress-wrap{width:100%;max-width:580px;display:flex;flex-direction:column;gap:10px}
        .sp-prog-header{display:flex;align-items:center;gap:12px;font-family:'JetBrains Mono',monospace}
        .sp-step-tag{font-size:12.5px;font-weight:700;letter-spacing:0.08em;min-width:64px}
        .sp-prog-ticks{display:flex;gap:5px;flex:1}
        .sp-prog-tick{flex:1;height:3px;border-radius:9999px;background:hsla(220,30%,20%,0.6);transition:background 0.4s,box-shadow 0.3s}
        .sp-tick--done{background:var(--c,#3b82f6);box-shadow:0 0 6px var(--c,#3b82f6)}
        .sp-percentage{font-size:18px;font-weight:800;color:#fff;min-width:48px;text-align:right}
        .sp-bar-track{position:relative;width:100%;height:7px;background:hsla(230,40%,10%,0.8);border-radius:9999px;overflow:hidden;border:1px solid hsla(210,40%,98%,0.07)}
        .sp-bar-fill{height:100%;border-radius:9999px;transition:width 0.12s linear,background 0.5s,box-shadow 0.5s}
        .sp-bar-shimmer{position:absolute;top:0;width:18px;height:100%;background:rgba(255,255,255,0.35);filter:blur(3px);border-radius:9999px;pointer-events:none;transition:left 0.12s linear}
        .sp-msg-row{display:flex;align-items:center;gap:7px;min-height:22px}
        .sp-msg{font-size:13px;font-weight:500;color:hsl(215,20%,72%);animation:sp-fadein 0.3s ease;transition:color 0.5s}
        @keyframes sp-fadein{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
        .sp-hex-row{display:flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:10.5px;color:hsl(215,16%,40%)}
        .sp-hex-icon{color:hsl(160,84%,45%);flex-shrink:0}
        .sp-hex-text{letter-spacing:0.07em}
        @media(max-width:700px){.sp-side-panel{display:none}.sp-core-region{justify-content:center}.sp-rings-wrap{width:200px;height:200px}.hud-ring-outer{width:196px;height:196px}.hud-ring-mid{width:158px;height:158px}.hud-ring-inner{width:122px;height:122px}.sp-emblem{width:90px;height:90px}.sp-connections{width:196px;height:196px}}
      `}</style>
    </div>
  );
}
