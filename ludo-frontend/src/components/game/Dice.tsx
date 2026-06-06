import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PlayerColor } from '../../engine/types';

interface DiceProps {
  value: number | null;
  activeColor: PlayerColor | null;
  isRollable: boolean;
  /**
   * rollId — increments by 1 each time a new roll is triggered.
   * Using a counter (instead of a boolean isRolling flag) ensures that:
   *  - Every new roll gets a unique identity, so the same face value can
   *    appear twice in a row and the animation still stops correctly.
   *  - Re-renders that don't change rollId never restart the animation.
   *  - Online games (server-driven) and local games (click-driven) use the
   *    same mechanism.
   */
  rollId: number;
  onRoll: () => void;
}

/* ── Standard die face dot positions (cx%, cy% in 0–100 space) ── */
const DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 18], [75, 18], [25, 50], [75, 50], [25, 82], [75, 82]],
};

/* Intermediate faces shown while tumbling (varies enough to feel random) */
const ROLL_SEQ = [1, 4, 2, 6, 3, 5, 1, 6, 4, 2, 5, 3, 6];

/* Minimum animation time in ms — prevents the dice from snapping instantly
   when the server responds very fast.  Max is open-ended (animation keeps
   going until value arrives AND minDuration has elapsed). */
const MIN_ANIM_MS = 1500;

const COLOR_THEME: Record<PlayerColor, { face: string; shadow: string; ring: string; dot: string }> = {
  RED:    { face: '#b91c1c', shadow: 'rgba(185,28,28,0.6)',   ring: '#fca5a5', dot: 'rgba(255,255,255,0.95)' },
  GREEN:  { face: '#15803d', shadow: 'rgba(21,128,61,0.6)',   ring: '#86efac', dot: 'rgba(255,255,255,0.95)' },
  YELLOW: { face: '#a16207', shadow: 'rgba(161,98,7,0.6)',    ring: '#fde68a', dot: 'rgba(255,255,255,0.95)' },
  BLUE:   { face: '#1d4ed8', shadow: 'rgba(29,78,216,0.6)',   ring: '#93c5fd', dot: 'rgba(255,255,255,0.95)' },
};

const DEFAULT_THEME = { face: '#3b4270', shadow: 'rgba(59,66,112,0.5)', ring: '#8892b0', dot: 'rgba(255,255,255,0.9)' };

export const Dice: React.FC<DiceProps> = ({
  value, activeColor, isRollable, rollId, onRoll,
}) => {
  /* ── Internal state ── */
  const [displayFace, setDisplayFace] = useState<number>(value ?? 1);
  const [isAnimating, setIsAnimating]  = useState(false);
  const [isLanding, setIsLanding]      = useState(false);
  const [isHovered, setIsHovered]      = useState(false);

  /* ── Refs — all mutable values that must NOT re-trigger effects ── */
  /**
   * animationLock: set to true synchronously in startAnimation() BEFORE any
   * setState calls.  This is the primary guard against double-click and
   * concurrent trigger races.  A ref (not state) so it takes effect
   * immediately without waiting for a re-render.
   */
  const animationLockRef  = useRef(false);

  /**
   * lastRollId: tracks which rollId the current animation was started for.
   * Prevents reacting to the same rollId more than once (e.g. on re-renders).
   */
  const lastRollIdRef     = useRef(0);

  /**
   * animStartTime: timestamp when the animation started, used to enforce
   * MIN_ANIM_MS before stopping even if the value arrives from the server.
   */
  const animStartTimeRef  = useRef(0);

  /**
   * pendingFinalFace: the face we want to show once minDuration elapses.
   * Set when value arrives before MIN_ANIM_MS has passed.
   */
  const pendingFinalFace  = useRef<number | null>(null);

  /* Timer/interval refs for cleanup */
  const faceIntervalRef   = useRef<ReturnType<typeof setInterval>  | null>(null);
  const minDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqIdxRef         = useRef(0);

  /* ── Helpers ── */
  const clearAllTimers = useCallback(() => {
    if (faceIntervalRef.current)     { clearInterval(faceIntervalRef.current);  faceIntervalRef.current = null; }
    if (minDurationTimerRef.current) { clearTimeout(minDurationTimerRef.current); minDurationTimerRef.current = null; }
  }, []);

  /** Commit the final face and reset all animation state */
  const commitStop = useCallback((finalFace: number) => {
    clearAllTimers();
    animationLockRef.current = false;
    pendingFinalFace.current = null;
    setIsAnimating(false);
    setDisplayFace(finalFace);
    /* Brief landing "bounce" animation */
    setIsLanding(true);
    setTimeout(() => setIsLanding(false), 300);
  }, [clearAllTimers]);

  /** Start the tumble animation for a given rollId */
  const startAnimation = useCallback(() => {
    /* Synchronous lock — prevents any second caller from entering */
    if (animationLockRef.current) return;
    animationLockRef.current = true;

    clearAllTimers();
    pendingFinalFace.current = null;
    animStartTimeRef.current = Date.now();
    seqIdxRef.current = 0;

    setIsAnimating(true);
    setIsLanding(false);

    /* Cycle through face sequence every 90ms for the tumbling effect */
    faceIntervalRef.current = setInterval(() => {
      seqIdxRef.current = (seqIdxRef.current + 1) % ROLL_SEQ.length;
      setDisplayFace(ROLL_SEQ[seqIdxRef.current]);
    }, 90);

    /* Safety net: force-stop after 4s even if server never responds */
    minDurationTimerRef.current = setTimeout(() => {
      /* If a value has already arrived, use it; otherwise show a random face */
      const face = pendingFinalFace.current ?? (Math.floor(Math.random() * 6) + 1);
      commitStop(face);
    }, 4000);
  }, [clearAllTimers, commitStop]);

  /* ── Effect: react to rollId changes (new roll triggered) ── */
  useEffect(() => {
    /* rollId 0 is the initial mount value — don't animate on first render */
    if (rollId === 0) return;
    /* Only react when rollId actually increases (not on unrelated re-renders) */
    if (rollId <= lastRollIdRef.current) return;

    lastRollIdRef.current = rollId;
    startAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollId]);

  /* ── Effect: react to value arriving (from server or engine) ── */
  useEffect(() => {
    if (value === null) return;

    /* If no animation is running, just show the face directly */
    if (!animationLockRef.current) {
      setDisplayFace(value);
      return;
    }

    const elapsed = Date.now() - animStartTimeRef.current;
    if (elapsed >= MIN_ANIM_MS) {
      /* Minimum duration already satisfied — stop immediately */
      commitStop(value);
    } else {
      /* Store value and let the minDuration timer handle the stop.
         We replace the safety-net timer with a precise one. */
      pendingFinalFace.current = value;
      if (minDurationTimerRef.current) clearTimeout(minDurationTimerRef.current);
      minDurationTimerRef.current = setTimeout(() => {
        commitStop(value);
      }, MIN_ANIM_MS - elapsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  /* ── Effect: cleanup on unmount ── */
  useEffect(() => {
    return () => {
      clearAllTimers();
      animationLockRef.current = false;
    };
  }, [clearAllTimers]);

  /* ── Click handler (local game) ── */
  const handleClick = useCallback(() => {
    /* Guard: only rollable, no animation in progress */
    if (!isRollable || animationLockRef.current) return;
    onRoll();
    /* Note: startAnimation() will be called by the rollId useEffect once the
       parent increments rollId.  We do NOT call startAnimation() here directly
       to keep a single authoritative trigger path. */
  }, [isRollable, onRoll]);

  /* ── Derived display values ── */
  const theme  = activeColor ? COLOR_THEME[activeColor] : DEFAULT_THEME;
  const dots   = DOTS[displayFace] ?? DOTS[1];
  const SIZE   = 82;

  /* ── Animation class for the dice body div ── */
  const diceBodyClass = isAnimating
    ? 'dice-body dice-rolling'
    : isLanding
    ? 'dice-body dice-landing'
    : 'dice-body';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      userSelect: 'none',
    }}>
      {/* ── Inline keyframes for the dice ── */}
      <style>{`
        .dice-body {
          will-change: transform;
          perspective: 400px;
          transform-style: flat;
          transition: box-shadow 0.2s ease;
        }
        /* 3D tumble: CSS-driven so it's GPU-accelerated and has a fixed
           duration independent of JS timers. The JS timer only controls
           when the FINAL FACE is committed, not the visual speed. */
        .dice-rolling {
          animation: diceSpin3d 0.55s cubic-bezier(0.4, 0.1, 0.6, 0.9) infinite;
        }
        /* Landing bounce: plays once when animation stops */
        .dice-landing {
          animation: diceLand 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes ping {
          75%, 100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>

      {/* ── Button wrapper ── */}
      <button
        onClick={handleClick}
        disabled={!isRollable}
        title={isRollable ? 'Click to roll! (or press Space)' : undefined}
        style={{
          width: SIZE,
          height: SIZE,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: isRollable && !isAnimating ? 'pointer' : 'default',
          outline: 'none',
          position: 'relative',
          flexShrink: 0,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Outer glow pulse when rollable and idle */}
        {isRollable && !isAnimating && (
          <span style={{
            position: 'absolute',
            inset: -10,
            borderRadius: 26,
            background: `${theme.face}12`,
            border: `2px solid ${theme.ring}45`,
            animation: 'pulseGlow 1.6s ease-in-out infinite',
            zIndex: 0,
            transition: 'all 0.2s',
          }} />
        )}

        {/* ── Dice body ── */}
        <div
          className={diceBodyClass}
          style={{
            position: 'relative',
            zIndex: 1,
            width: SIZE,
            height: SIZE,
            borderRadius: 20,
            background: `linear-gradient(145deg, ${theme.face}f0, ${theme.face}cc)`,
            boxShadow: isAnimating
              ? `0 0 0 2px ${theme.ring}60, 0 12px 32px ${theme.shadow}, inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.3)`
              : isHovered && isRollable
              ? `0 6px 0 ${theme.face}90, 0 10px 28px ${theme.shadow}, inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.25), 0 0 0 2px ${theme.ring}50`
              : `0 6px 0 ${theme.face}90, 0 10px 24px ${theme.shadow}, inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -3px 0 rgba(0,0,0,0.22)`,
            /* Only use CSS transform for non-animating states; the rolling
               class handles transform via @keyframes */
            transform: !isAnimating && !isLanding
              ? isHovered && isRollable
                ? 'translateY(-3px) scale(1.04)'
                : isRollable
                ? 'scale(1.0)'
                : 'scale(0.94)'
              : undefined,
            transition: !isAnimating && !isLanding
              ? 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease'
              : 'box-shadow 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Top-left sheen for 3-D feel */}
          <span style={{
            position: 'absolute', top: 6, left: 7,
            width: 28, height: 18,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 8, pointerEvents: 'none',
          }} />

          {/* Bottom-right shadow inset */}
          <span style={{
            position: 'absolute', bottom: 6, right: 7,
            width: 22, height: 14,
            background: 'rgba(0,0,0,0.15)',
            borderRadius: 6, pointerEvents: 'none',
          }} />

          {/* Dots — always showing the displayFace, which cycles during animation */}
          <svg viewBox="0 0 100 100" style={{ width: 62, height: 62, position: 'relative', zIndex: 1 }}>
            {dots.map(([cx, cy], i) => (
              <circle
                key={i}
                cx={cx} cy={cy} r={10}
                fill={theme.dot}
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
              />
            ))}
          </svg>
        </div>

        {/* Rollable indicator dot */}
        {isRollable && !isAnimating && (
          <span style={{
            position: 'absolute', top: -4, right: -4, zIndex: 2,
            width: 14, height: 14, borderRadius: '50%',
            background: theme.ring,
            border: `2px solid ${theme.face}`,
            boxShadow: `0 0 8px ${theme.ring}80`,
          }}>
            <span style={{
              position: 'absolute', inset: -5, borderRadius: '50%',
              background: theme.ring, opacity: 0.35,
              animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite',
            }} />
          </span>
        )}
      </button>

      {/* ── Status label ── */}
      <div style={{
        fontSize: 11, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: 1.2,
        color: isAnimating ? theme.ring : isRollable ? theme.ring : 'var(--text-muted)',
        transition: 'color 0.3s',
        minHeight: 16,
      }}>
        {isAnimating
          ? '🎲 Rolling...'
          : isRollable
          ? '🎲 Roll Dice'
          : value !== null
          ? `Rolled ${value}`
          : '— Waiting —'}
      </div>
    </div>
  );
};
