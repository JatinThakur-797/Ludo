import React from 'react';
import type { PlayerColor } from '../../engine/types';
import { getTokenCoordinates } from '../../utils/coordinates';

interface TokenProps {
  color: PlayerColor;
  index: number;
  position: number;
  isMovable: boolean;
  onClick: () => void;
}

const COLOR_MAP: Record<PlayerColor, {
  outer: string;
  inner: string;
  center: string;
  glow: string;
  stroke: string;
  pulse: string;
}> = {
  RED:    { outer: '#dc2626', inner: '#fca5a5', center: '#991b1b', glow: 'rgba(220,38,38,0.55)',   stroke: '#fff', pulse: 'rgba(220,38,38,0.7)' },
  GREEN:  { outer: '#16a34a', inner: '#86efac', center: '#14532d', glow: 'rgba(22,163,74,0.55)',   stroke: '#fff', pulse: 'rgba(22,163,74,0.7)' },
  YELLOW: { outer: '#ca8a04', inner: '#fde68a', center: '#78350f', glow: 'rgba(202,138,4,0.55)',   stroke: '#fff', pulse: 'rgba(202,138,4,0.7)' },
  BLUE:   { outer: '#2563eb', inner: '#93c5fd', center: '#1e3a8a', glow: 'rgba(37,99,235,0.55)',   stroke: '#fff', pulse: 'rgba(37,99,235,0.7)' },
};

/**
 * Small offset so multiple tokens on the same cell don't fully overlap.
 * Applied only on the track (not in yard or goal).
 */
function getDispersion(position: number, tokenIndex: number): { dx: number; dy: number } {
  if (position >= 0 && position <= 56) {
    const dx = (tokenIndex === 0 || tokenIndex === 2) ? -5 : 5;
    const dy = (tokenIndex === 0 || tokenIndex === 1) ? -5 : 5;
    return { dx, dy };
  }
  return { dx: 0, dy: 0 };
}

export const Token: React.FC<TokenProps> = ({ color, index, position, isMovable, onClick }) => {
  const coords = getTokenCoordinates(color, position, index);
  const { dx, dy } = getDispersion(position, index);
  const x = coords.x + dx;
  const y = coords.y + dy;
  const c = COLOR_MAP[color];

  const R_OUTER  = 12;
  const R_INNER  = 7.5;
  const R_CENTER = 3.5;
  const R_SHADOW = 13;

  return (
    <g
      onClick={isMovable ? onClick : undefined}
      style={{ cursor: isMovable ? 'pointer' : 'default' }}
    >
      {/* ── PULSE RINGS when movable ── */}
      {isMovable && (
        <>
          <circle
            cx={x} cy={y}
            r={R_OUTER + 9}
            fill="none"
            stroke={c.pulse}
            strokeWidth={2}
            style={{
              animation: 'tokenPulse 1.3s ease-out infinite',
              transformOrigin: `${x}px ${y}px`,
            }}
          />
          <circle
            cx={x} cy={y}
            r={R_OUTER + 5}
            fill={`${c.outer}18`}
            stroke={c.pulse}
            strokeWidth={1.5}
            style={{
              animation: 'tokenPulse 1.3s ease-out 0.45s infinite',
              transformOrigin: `${x}px ${y}px`,
            }}
          />
        </>
      )}

      {/* ── DROP SHADOW ── */}
      <ellipse
        cx={x} cy={y + 3}
        rx={R_SHADOW} ry={R_SHADOW * 0.55}
        fill="rgba(0,0,0,0.28)"
        style={{ filter: 'blur(3px)' }}
      />

      {/* ── OUTER RING (main color) ── */}
      <circle
        cx={x} cy={y}
        r={R_OUTER}
        fill={c.outer}
        stroke={c.stroke}
        strokeWidth={1.6}
        style={{
          filter: isMovable
            ? `drop-shadow(0 0 7px ${c.glow}) drop-shadow(0 2px 4px rgba(0,0,0,0.4))`
            : `drop-shadow(0 2px 4px rgba(0,0,0,0.35))`,
          transition: 'filter 0.3s ease',
        }}
      />

      {/* ── 3-D HIGHLIGHT SHEEN ── */}
      <ellipse
        cx={x - 3.5} cy={y - 3.5}
        rx={4.5} ry={3}
        fill="rgba(255,255,255,0.4)"
        style={{ pointerEvents: 'none' }}
      />

      {/* ── INNER RING (light color) ── */}
      <circle
        cx={x} cy={y}
        r={R_INNER}
        fill={c.inner}
        style={{ pointerEvents: 'none' }}
      />

      {/* ── CENTER DOT (dark anchor) ── */}
      <circle
        cx={x} cy={y}
        r={R_CENTER}
        fill={c.center}
        style={{ pointerEvents: 'none' }}
      />

      {/* ── CENTER HIGHLIGHT ── */}
      <circle
        cx={x - 1} cy={y - 1}
        r={1.2}
        fill="rgba(255,255,255,0.6)"
        style={{ pointerEvents: 'none' }}
      />

      {/* ── MOVE ARROW above token ── */}
      {isMovable && (
        <text
          x={x}
          y={y - R_OUTER - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fill={c.outer}
          fontWeight="900"
          style={{
            animation: 'tokenBounce 0.55s ease-in-out infinite alternate',
            transformOrigin: `${x}px ${y - R_OUTER - 6}px`,
            pointerEvents: 'none',
            userSelect: 'none',
            filter: `drop-shadow(0 0 3px ${c.glow})`,
          }}
        >
          ▲
        </text>
      )}
    </g>
  );
};
