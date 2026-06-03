import React, { useEffect, useRef, useState } from 'react';
import type { PlayerColor } from '../../engine/types';

interface DiceProps {
  value: number | null;
  activeColor: PlayerColor | null;
  isRollable: boolean;
  isRolling: boolean;
  onRoll: () => void;
}

/* Standard die face dot positions (cx%, cy% in 0–100 space) */
const DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 18], [75, 18], [25, 50], [75, 50], [25, 82], [75, 82]],
};

const ROLL_SEQ = [1, 4, 2, 6, 3, 5, 1, 6, 4, 2, 5, 3, 6];

const COLOR_THEME: Record<PlayerColor, { face: string; shadow: string; ring: string; dot: string }> = {
  RED:    { face: '#b91c1c', shadow: 'rgba(185,28,28,0.6)',   ring: '#fca5a5', dot: 'rgba(255,255,255,0.95)' },
  GREEN:  { face: '#15803d', shadow: 'rgba(21,128,61,0.6)',   ring: '#86efac', dot: 'rgba(255,255,255,0.95)' },
  YELLOW: { face: '#a16207', shadow: 'rgba(161,98,7,0.6)',    ring: '#fde68a', dot: 'rgba(255,255,255,0.95)' },
  BLUE:   { face: '#1d4ed8', shadow: 'rgba(29,78,216,0.6)',   ring: '#93c5fd', dot: 'rgba(255,255,255,0.95)' },
};

const DEFAULT_THEME = { face: '#3b4270', shadow: 'rgba(59,66,112,0.5)', ring: '#8892b0', dot: 'rgba(255,255,255,0.9)' };

export const Dice: React.FC<DiceProps> = ({
  value, activeColor, isRollable, isRolling, onRoll,
}) => {
  const [face, setFace]       = useState<number>(value ?? 1);
  const [rolling, setRolling] = useState(false);
  const [angle, setAngle]     = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevValue   = useRef<number | null>(value);
  const seqIdx      = useRef(0);

  /* Stop animation when roll result arrives */
  useEffect(() => {
    if (value !== null && value !== prevValue.current) {
      prevValue.current = value;
      stopRoll(value);
    }
  }, [value]);

  /* Sync external rolling flag (online game) */
  useEffect(() => {
    if (isRolling && !rolling) startRoll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRolling]);

  const startRoll = () => {
    if (rolling) return;
    setRolling(true);
    seqIdx.current = 0;
    intervalRef.current = setInterval(() => {
      seqIdx.current = (seqIdx.current + 1) % ROLL_SEQ.length;
      setFace(ROLL_SEQ[seqIdx.current]);
      setAngle(a => a + 72);
    }, 80);
  };

  const stopRoll = (finalFace: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRolling(false);
    setFace(finalFace);
    setAngle(0);
  };

  const handleClick = () => {
    if (!isRollable || rolling) return;
    startRoll();
    onRoll();
  };

  const theme = activeColor ? COLOR_THEME[activeColor] : DEFAULT_THEME;
  const dots  = DOTS[face] ?? DOTS[1];
  const SIZE  = 82;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      userSelect: 'none',
    }}>
      {/* Outer button wrapper */}
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
          cursor: isRollable ? 'pointer' : 'default',
          outline: 'none',
          position: 'relative',
          flexShrink: 0,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Outer glow pulse when rollable */}
        {isRollable && !rolling && (
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

        {/* Dice body */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: SIZE,
            height: SIZE,
            borderRadius: 20,
            background: `linear-gradient(145deg, ${theme.face}f0, ${theme.face}cc)`,
            boxShadow: rolling
              ? `0 0 0 2px ${theme.ring}60, 0 12px 32px ${theme.shadow}, inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.3)`
              : isHovered && isRollable
              ? `0 6px 0 ${theme.face}90, 0 10px 28px ${theme.shadow}, inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.25), 0 0 0 2px ${theme.ring}50`
              : `0 6px 0 ${theme.face}90, 0 10px 24px ${theme.shadow}, inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -3px 0 rgba(0,0,0,0.22)`,
            transform: rolling
              ? `rotate(${angle}deg) scale(1.07)`
              : isHovered && isRollable
              ? 'translateY(-3px) scale(1.04)'
              : isRollable
              ? 'scale(1.0)'
              : 'scale(0.94)',
            transition: rolling
              ? 'transform 0.08s linear'
              : 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            perspective: '300px',
          }}
        >
          {/* Top-left sheen for 3-D feel */}
          <span style={{
            position: 'absolute',
            top: 6,
            left: 7,
            width: 28,
            height: 18,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 8,
            pointerEvents: 'none',
          }} />

          {/* Bottom-right shadow inset */}
          <span style={{
            position: 'absolute',
            bottom: 6,
            right: 7,
            width: 22,
            height: 14,
            background: 'rgba(0,0,0,0.15)',
            borderRadius: 6,
            pointerEvents: 'none',
          }} />

          {/* Dots */}
          <svg viewBox="0 0 100 100" style={{ width: 62, height: 62, position: 'relative', zIndex: 1 }}>
            {dots.map(([cx, cy], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={10}
                fill={theme.dot}
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
              />
            ))}
          </svg>
        </div>

        {/* Rollable indicator dot */}
        {isRollable && !rolling && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            zIndex: 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: theme.ring,
            border: `2px solid ${theme.face}`,
            boxShadow: `0 0 8px ${theme.ring}80`,
          }}>
            <span style={{
              position: 'absolute',
              inset: -5,
              borderRadius: '50%',
              background: theme.ring,
              opacity: 0.35,
              animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite',
            }} />
          </span>
        )}
      </button>

      {/* Label */}
      <div style={{
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: rolling
          ? theme.ring
          : isRollable
          ? theme.ring
          : 'var(--text-muted)',
        transition: 'color 0.3s',
        minHeight: 16,
      }}>
        {rolling
          ? '🎲 Rolling...'
          : isRollable
          ? '🎲 Roll Dice'
          : value !== null
          ? `Rolled ${value}`
          : '— Waiting —'}
      </div>

      {/* Inline ping keyframe */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
