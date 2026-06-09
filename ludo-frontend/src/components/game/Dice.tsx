import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PlayerColor } from '../../engine/types';

interface DiceProps {
  value: number | null;
  activeColor: PlayerColor | null;
  isRollable: boolean;
  rollId: number;
  onRoll: () => void;
}

/* ── Dot positions (cx%, cy%) inside each face (0-100 space) ── */
const DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]],
};

const COLOR_THEME: Record<PlayerColor, { face: string; darkFace: string; ring: string; dot: string; shadow: string }> = {
  RED:    { face: '#d32f2f', darkFace: '#9b2c2c', ring: '#ff8a80', dot: '#ffffff', shadow: 'rgba(211,47,47,0.5)' },
  GREEN:  { face: '#2e7d32', darkFace: '#1b5e20', ring: '#a5d6a7', dot: '#ffffff', shadow: 'rgba(46,125,50,0.5)' },
  YELLOW: { face: '#f57f17', darkFace: '#e65100', ring: '#fff59d', dot: '#ffffff', shadow: 'rgba(245,127,23,0.5)' },
  BLUE:   { face: '#1565c0', darkFace: '#0d47a1', ring: '#90caf9', dot: '#ffffff', shadow: 'rgba(21,101,192,0.5)' },
};

const DEFAULT_THEME = { face: '#3b4270', darkFace: '#1f243e', ring: '#8892b0', dot: '#ffffff', shadow: 'rgba(59,66,112,0.4)' };

export const Dice: React.FC<DiceProps> = ({
  value, activeColor, isRollable, rollId, onRoll,
}) => {
  /* ── Internal state ── */
  const [displayFace, setDisplayFace] = useState<number>(value ?? 1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLanding, setIsLanding] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  /* ── Refs for animation sync and timer guards ── */
  const animationLockRef = useRef(false);
  const lastProcessedRollIdRef = useRef(0);
  const animStartTimeRef = useRef(0);
  const pendingFinalFaceRef = useRef<number | null>(null);
  const minDurationElapsedRef = useRef(false);

  const minDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (minDurationTimerRef.current) {
      clearTimeout(minDurationTimerRef.current);
      minDurationTimerRef.current = null;
    }
  }, []);

  const commitStop = useCallback((finalFace: number) => {
    clearAllTimers();
    animationLockRef.current = false;
    pendingFinalFaceRef.current = null;
    minDurationElapsedRef.current = false;
    setIsAnimating(false);
    setDisplayFace(finalFace);
    setIsLanding(true);
    setTimeout(() => setIsLanding(false), 350);
  }, [clearAllTimers]);

  const startAnimation = useCallback(() => {
    if (animationLockRef.current) return;
    animationLockRef.current = true;
    minDurationElapsedRef.current = false;
    pendingFinalFaceRef.current = value;
    animStartTimeRef.current = Date.now();

    setIsAnimating(true);
    setIsLanding(false);

    /* Guarantee tumble animation plays for MIN_ANIM_MS = 1500 */
    minDurationTimerRef.current = setTimeout(() => {
      minDurationElapsedRef.current = true;
      if (pendingFinalFaceRef.current !== null) {
        commitStop(pendingFinalFaceRef.current);
      }
    }, 1500);
  }, [commitStop, value]);

  /* ── Effect: rollId triggers animation start ── */
  useEffect(() => {
    if (rollId === 0) return;
    if (rollId <= lastProcessedRollIdRef.current) return;
    lastProcessedRollIdRef.current = rollId;
    startAnimation();
  }, [rollId, startAnimation]);

  /* ── Effect: value updates commit final face ── */
  useEffect(() => {
    if (value === null) return;

    if (!animationLockRef.current) {
      setDisplayFace(value);
      return;
    }

    if (minDurationElapsedRef.current) {
      commitStop(value);
    } else {
      pendingFinalFaceRef.current = value;
    }
  }, [value, commitStop]);

  /* ── Effect: cleanup on unmount ── */
  useEffect(() => {
    return () => {
      clearAllTimers();
      animationLockRef.current = false;
    };
  }, [clearAllTimers]);

  const handleClick = useCallback(() => {
    if (!isRollable || animationLockRef.current) return;
    onRoll();
  }, [isRollable, onRoll]);

  const getCubeTransform = (face: number) => {
    switch (face) {
      case 1: return 'rotateX(0deg) rotateY(0deg)';
      case 2: return 'rotateX(0deg) rotateY(-90deg)';
      case 3: return 'rotateX(-90deg) rotateY(0deg)';
      case 4: return 'rotateX(90deg) rotateY(0deg)';
      case 5: return 'rotateX(0deg) rotateY(90deg)';
      case 6: return 'rotateX(0deg) rotateY(180deg)';
      default: return 'rotateX(0deg) rotateY(0deg)';
    }
  };

  const theme = activeColor ? COLOR_THEME[activeColor] : DEFAULT_THEME;
  const faces = [1, 2, 3, 4, 5, 6];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      userSelect: 'none',
    }}>
      {/* ── CSS 3D Scene Styles ── */}
      <style>{`
        .dice-scene {
          width: 64px;
          height: 64px;
          perspective: 300px;
          position: relative;
        }
        .dice-cube {
          width: 100%;
          height: 100%;
          position: absolute;
          transform-style: preserve-3d;
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.25);
        }
        .dice-face {
          position: absolute;
          width: 64px;
          height: 64px;
          border-radius: 12px;
          border: 2px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          backface-visibility: hidden;
        }
        
        /* 3D Cube faces translate relative to center */
        .face-1 { transform: rotateY(0deg) translateZ(32px); }
        .face-6 { transform: rotateY(180deg) translateZ(32px); }
        .face-2 { transform: rotateY(90deg) translateZ(32px); }
        .face-5 { transform: rotateY(-90deg) translateZ(32px); }
        .face-3 { transform: rotateX(90deg) translateZ(32px); }
        .face-4 { transform: rotateX(-90deg) translateZ(32px); }

        .dice-rolling {
          animation: diceSpin3d 0.5s linear infinite;
        }
        .dice-landing {
          animation: diceLand 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes diceSpin3d {
          0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg); }
        }
        @keyframes diceLand {
          0% { transform: scale(1.08); }
          50% { transform: scale(0.92); }
          75% { transform: scale(1.04); }
          100% { transform: scale(1.0); }
        }
        @keyframes dicePulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.45); }
          50% { box-shadow: 0 0 0 10px rgba(255,255,255,0); }
        }
      `}</style>

      {/* ── Dice Button Wrapper ── */}
      <button
        onClick={handleClick}
        disabled={!isRollable}
        title={isRollable ? 'Click to roll!' : undefined}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: isRollable && !isAnimating ? 'pointer' : 'default',
          outline: 'none',
          position: 'relative',
          width: 64,
          height: 64,
          flexShrink: 0,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Outer pulsating gold glow when active and ready to roll */}
        {isRollable && !isAnimating && (
          <span style={{
            position: 'absolute',
            inset: -8,
            borderRadius: 18,
            border: `2.5px solid ${theme.ring}80`,
            animation: 'dicePulseGlow 1.6s ease-in-out infinite',
            zIndex: 0,
          }} />
        )}

        {/* ── 3D Scene Zone ── */}
        <div className="dice-scene" style={{ zIndex: 1 }}>
          <div
            className={`dice-cube ${isAnimating ? 'dice-rolling' : isLanding ? 'dice-landing' : ''}`}
            style={{
              transform: isAnimating ? undefined : getCubeTransform(displayFace),
              transformOrigin: '32px 32px',
            }}
          >
            {faces.map((n) => (
              <div
                key={n}
                className={`dice-face face-${n}`}
                style={{
                  background: `linear-gradient(135deg, ${theme.face}, ${theme.darkFace})`,
                  borderColor: isHovered && isRollable ? '#fbc02d' : `${theme.ring}60`, // gold highlight on hover
                  boxShadow: `inset 0 2.5px 5px rgba(255,255,255,0.3), inset 0 -2.5px 5px rgba(0,0,0,0.4), 0 6px 12px ${theme.shadow}`,
                  borderWidth: isHovered && isRollable ? 2.5 : 2,
                }}
              >
                {/* Dots */}
                <svg viewBox="0 0 100 100" style={{ width: '75%', height: '75%', display: 'block' }}>
                  {DOTS[n].map(([cx, cy], i) => (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={9}
                      fill={theme.dot}
                      style={{ filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.45))' }}
                    />
                  ))}
                </svg>
              </div>
            ))}
          </div>
        </div>
      </button>

      {/* ── Status Label ── */}
      <div style={{
        fontSize: 10,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: isAnimating ? theme.ring : isRollable ? theme.ring : 'var(--text-muted)',
        transition: 'color 0.3s',
        minHeight: 14,
      }}>
        {isAnimating
          ? '🎲 Rolling...'
          : isRollable
          ? '🎲 Roll'
          : value !== null
          ? `Rolled ${value}`
          : '— Waiting —'}
      </div>
    </div>
  );
};
