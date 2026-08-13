import React, { useState, useRef, useEffect, useCallback } from 'react';

const SplashScreen = ({ onComplete, videoSrc = '/intro-animation.mp4' }) => {
  const videoRef = useRef(null);
  const [phase, setPhase] = useState('loading'); // loading | playing | fading | done
  const [progress, setProgress] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const fadeTimeoutRef = useRef(null);
  const skipTimeoutRef = useRef(null);

  const startFadeOut = useCallback(() => {
    if (phase === 'fading' || phase === 'done') return;
    setPhase('fading');
    fadeTimeoutRef.current = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, 1200); // fade duration
  }, [phase, onComplete]);

  // Enable skip button after 1.5 seconds
  useEffect(() => {
    skipTimeoutRef.current = setTimeout(() => setCanSkip(true), 1500);
    return () => {
      clearTimeout(skipTimeoutRef.current);
      clearTimeout(fadeTimeoutRef.current);
    };
  }, []);

  // Handle video load and playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      setPhase('playing');
      video.play().catch(() => {
        // Autoplay blocked – try muted
        video.muted = true;
        video.play().catch(() => setVideoError(true));
      });
    };

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handleEnded = () => {
      startFadeOut();
    };

    const handleError = () => {
      setVideoError(true);
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [startFadeOut]);

  // Fallback: if video fails, auto-complete after 3 seconds with a CSS animation
  useEffect(() => {
    if (videoError) {
      const timer = setTimeout(() => startFadeOut(), 3000);
      return () => clearTimeout(timer);
    }
  }, [videoError, startFadeOut]);

  const handleSkip = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
    startFadeOut();
  };

  if (phase === 'done') return null;

  return (
    <div className={`splash-screen ${phase === 'fading' ? 'splash-fading' : ''}`}>
      {/* Video background */}
      {!videoError && (
        <video
          ref={videoRef}
          className="splash-video"
          src={videoSrc}
          preload="auto"
          playsInline
          muted={false}
        />
      )}

      {/* Fallback animated background when video fails */}
      {videoError && (
        <div className="splash-fallback">
          <div className="splash-fallback-orb splash-orb-1" />
          <div className="splash-fallback-orb splash-orb-2" />
          <div className="splash-fallback-orb splash-orb-3" />
          <div className="splash-fallback-logo">
            <div className="splash-logo-ring" />
            <div className="splash-logo-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5V19A9 3 0 0 0 21 19V5" />
                <path d="M3 12A9 3 0 0 0 21 12" />
              </svg>
            </div>
          </div>
          <h1 className="splash-fallback-title">
            <span className="splash-text-gradient">CBFDS</span>
          </h1>
          <p className="splash-fallback-subtitle">Initializing Secure Environment...</p>
        </div>
      )}

      {/* Cinematic overlay vignette */}
      <div className="splash-vignette" />

      {/* Loading spinner for video load phase */}
      {phase === 'loading' && !videoError && (
        <div className="splash-loader">
          <div className="splash-loader-ring" />
          <span className="splash-loader-text">Loading...</span>
        </div>
      )}

      {/* Skip button */}
      {canSkip && phase !== 'fading' && (
        <button className="splash-skip-btn" onClick={handleSkip}>
          <span>Skip</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
          </svg>
        </button>
      )}

      {/* Progress bar */}
      {phase === 'playing' && !videoError && (
        <div className="splash-progress-track">
          <div className="splash-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      <style>{`
        /* ═══ SPLASH SCREEN ═══ */
        .splash-screen {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 1;
          transition: opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .splash-screen.splash-fading {
          opacity: 0;
          pointer-events: none;
        }

        /* Video */
        .splash-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
        }

        /* Cinematic vignette overlay */
        .splash-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%);
          z-index: 1;
          pointer-events: none;
        }

        /* ═══ LOADER ═══ */
        .splash-loader {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          animation: splashFadeIn 0.6s ease-out both;
        }

        .splash-loader-ring {
          width: 48px;
          height: 48px;
          border: 3px solid hsla(217, 91%, 60%, 0.15);
          border-top-color: hsl(217, 91%, 60%);
          border-radius: 50%;
          animation: splashSpin 0.8s linear infinite;
        }

        .splash-loader-text {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: hsla(210, 40%, 98%, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }

        /* ═══ SKIP BUTTON ═══ */
        .splash-skip-btn {
          position: absolute;
          bottom: 40px;
          right: 40px;
          z-index: 20;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 22px;
          background: hsla(230, 38%, 9%, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid hsla(210, 40%, 98%, 0.1);
          border-radius: 9999px;
          color: hsla(210, 40%, 98%, 0.8);
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          animation: splashFadeIn 0.5s ease-out both 0.3s;
        }

        .splash-skip-btn:hover {
          background: hsla(230, 38%, 14%, 0.85);
          border-color: hsla(217, 91%, 60%, 0.4);
          color: #fff;
          transform: scale(1.04);
          box-shadow: 0 4px 20px hsla(217, 91%, 60%, 0.2);
        }

        .splash-skip-btn:active {
          transform: scale(0.97);
        }

        /* ═══ PROGRESS BAR ═══ */
        .splash-progress-track {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: hsla(210, 40%, 98%, 0.06);
          z-index: 20;
        }

        .splash-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, hsl(217, 91%, 60%), hsl(262, 83%, 58%));
          border-radius: 0 3px 3px 0;
          transition: width 0.3s linear;
          box-shadow: 0 0 12px hsla(217, 91%, 60%, 0.4);
        }

        /* ═══ FALLBACK ANIMATION ═══ */
        .splash-fallback {
          position: relative;
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          animation: splashFadeIn 0.8s ease-out both;
        }

        .splash-fallback-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
        }

        .splash-orb-1 {
          width: 600px;
          height: 600px;
          background: hsla(217, 91%, 60%, 0.12);
          top: -15%;
          left: -10%;
          animation: splashFloat 6s ease-in-out infinite;
        }

        .splash-orb-2 {
          width: 500px;
          height: 500px;
          background: hsla(262, 83%, 58%, 0.1);
          bottom: -15%;
          right: -10%;
          animation: splashFloat 8s ease-in-out infinite reverse;
        }

        .splash-orb-3 {
          width: 350px;
          height: 350px;
          background: hsla(160, 84%, 39%, 0.06);
          top: 45%;
          left: 45%;
          animation: splashFloat 10s ease-in-out infinite 1s;
        }

        .splash-fallback-logo {
          position: relative;
          width: 100px;
          height: 100px;
          animation: splashPulse 2s ease-in-out infinite;
        }

        .splash-logo-ring {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2px solid transparent;
          background: conic-gradient(from 0deg, hsl(217, 91%, 60%), hsl(262, 83%, 58%), hsl(160, 84%, 39%), hsl(217, 91%, 60%)) border-box;
          -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: splashSpin 4s linear infinite;
        }

        .splash-logo-icon {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, hsl(217, 91%, 60%), hsl(262, 83%, 58%));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 0 50px hsla(217, 91%, 60%, 0.35);
        }

        .splash-fallback-title {
          font-family: 'Outfit', sans-serif;
          font-size: 48px;
          font-weight: 800;
          letter-spacing: 6px;
          animation: splashFadeIn 1s ease-out both 0.3s;
        }

        .splash-text-gradient {
          background: linear-gradient(135deg, hsl(217, 91%, 60%), hsl(262, 83%, 58%));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .splash-fallback-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: hsla(215, 20%, 65%, 0.8);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          animation: splashFadeIn 1s ease-out both 0.6s;
        }

        /* ═══ KEYFRAMES ═══ */
        @keyframes splashSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes splashFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes splashFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }

        @keyframes splashPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }

        /* ═══ RESPONSIVE ═══ */
        @media (max-width: 640px) {
          .splash-skip-btn {
            bottom: 24px;
            right: 24px;
            padding: 8px 18px;
            font-size: 12px;
          }

          .splash-fallback-title {
            font-size: 36px;
            letter-spacing: 4px;
          }

          .splash-fallback-subtitle {
            font-size: 12px;
          }

          .splash-fallback-logo {
            width: 80px;
            height: 80px;
          }

          .splash-logo-icon {
            width: 80px;
            height: 80px;
          }

          .splash-logo-icon svg {
            width: 32px;
            height: 32px;
          }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
