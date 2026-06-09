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
  light: string;
  dark: string;
}> = {
  RED:    { outer: '#d32f2f', inner: '#ff8a80', center: '#b71c1c', glow: 'rgba(211, 47, 47, 0.6)',   stroke: '#fff', pulse: 'rgba(211, 47, 47, 0.4)', light: '#ff8a80', dark: '#b71c1c' },
  GREEN:  { outer: '#2e7d32', inner: '#a5d6a7', center: '#1b5e20', glow: 'rgba(46, 125, 50, 0.6)',   stroke: '#fff', pulse: 'rgba(46, 125, 50, 0.4)', light: '#a5d6a7', dark: '#1b5e20' },
  YELLOW: { outer: '#f57f17', inner: '#fff59d', center: '#e65100', glow: 'rgba(245, 127, 23, 0.6)',  stroke: '#fff', pulse: 'rgba(245, 127, 23, 0.4)', light: '#fff59d', dark: '#e65100' },
  BLUE:   { outer: '#1565c0', inner: '#90caf9', center: '#0d47a1', glow: 'rgba(21, 101, 192, 0.6)',  stroke: '#fff', pulse: 'rgba(21, 101, 192, 0.4)', light: '#90caf9', dark: '#0d47a1' },
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

const TokenComponent: React.FC<TokenProps> = ({ color, index, position, isMovable, onClick }) => {
  const coords = getTokenCoordinates(color, position, index);
  const { dx, dy } = getDispersion(position, index);
  const x = coords.x + dx;
  const y = coords.y + dy;
  const c = COLOR_MAP[color];

  const gradientId = `token-grad-${color}-${index}`;
  const shadowGradId = `token-shadow-grad-${color}-${index}`;

  return (
    <g
      onClick={isMovable ? onClick : undefined}
      style={{ cursor: isMovable ? 'pointer' : 'default' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.inner} />
          <stop offset="50%" stopColor={c.outer} />
          <stop offset="100%" stopColor={c.dark} />
        </linearGradient>
        <linearGradient id={shadowGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0.12)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
        </linearGradient>
      </defs>

      {/* ── PULSE RINGS when movable ── */}
      {isMovable && (
        <>
          <circle
            cx={x} cy={y + 3}
            r={19}
            fill="none"
            stroke={c.pulse}
            strokeWidth={2}
            style={{
              animation: 'tokenPulse 1.3s ease-out infinite',
              transformOrigin: `${x}px ${y + 3}px`,
            }}
          />
          <circle
            cx={x} cy={y + 3}
            r={15}
            fill={`${c.outer}15`}
            stroke={c.pulse}
            strokeWidth={1.5}
            style={{
              animation: 'tokenPulse 1.3s ease-out 0.45s infinite',
              transformOrigin: `${x}px ${y + 3}px`,
            }}
          />
        </>
      )}

      {/* ── DROP SHADOW ── */}
      <ellipse
        cx={x} cy={y + 10}
        rx={13} ry={4}
        fill="rgba(0,0,0,0.35)"
        style={{ filter: 'blur(2px)' }}
      />

      {/* ── 3D Pawn Shape ── */}
      <g style={{
        filter: isMovable
          ? `drop-shadow(0 0 6px ${c.glow}) drop-shadow(0 2px 4px rgba(0,0,0,0.35))`
          : `drop-shadow(0 2px 4px rgba(0,0,0,0.25))`,
        transition: 'filter 0.3s ease',
      }}>
        {/* Pawn Base Plate Lip */}
        <path
          d={`M ${x - 11} ${y + 8} C ${x - 11} ${y + 10}, ${x + 11} ${y + 10}, ${x + 11} ${y + 8} L ${x + 11} ${y + 6} C ${x + 11} ${y + 8}, ${x - 11} ${y + 8}, ${x - 11} ${y + 6} Z`}
          fill={`url(#${shadowGradId})`}
        />
        <ellipse cx={x} cy={y + 6} rx={11} ry={3.5} fill={`url(#${gradientId})`} stroke="#fff" strokeWidth={0.8} />

        {/* Pawn Body Cone */}
        <path
          d={`M ${x - 9} ${y + 6} C ${x - 7.5} ${y - 1}, ${x - 4} ${y - 3}, ${x - 4} ${y - 4} L ${x + 4} ${y - 4} C ${x + 4} ${y - 3}, ${x + 7.5} ${y - 1}, ${x + 9} ${y + 6} Z`}
          fill={`url(#${gradientId})`}
          stroke="#fff"
          strokeWidth={0.8}
        />

        {/* Gold Collar Ring */}
        <ellipse cx={x} cy={y - 4} rx={5} ry={1.6} fill="#fbc02d" stroke="#fff" strokeWidth={0.5} />

        {/* Head Sphere */}
        <circle cx={x} cy={y - 9} r={5.8} fill={`url(#${gradientId})`} stroke="#fff" strokeWidth={0.8} />

        {/* Radial sheen reflection highlight on head */}
        <circle cx={x - 1.8} cy={y - 10.8} r={1.6} fill="rgba(255,255,255,0.65)" />
      </g>

      {/* ── MOVE ARROW (bouncing gold arrow pointing down) ── */}
      {isMovable && (
        <text
          x={x}
          y={y - 18}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fill="#fbc02d"
          fontWeight="900"
          stroke="#000000"
          strokeWidth={1.2}
          style={{
            animation: 'tokenBounce 0.55s ease-in-out infinite alternate',
            transformOrigin: `${x}px ${y - 18}px`,
            pointerEvents: 'none',
            userSelect: 'none',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          }}
        >
          ▼
        </text>
      )}
    </g>
  );
};

const arePropsEqual = (prevProps: TokenProps, nextProps: TokenProps) => {
  return prevProps.color === nextProps.color &&
         prevProps.index === nextProps.index &&
         prevProps.position === nextProps.position &&
         prevProps.isMovable === nextProps.isMovable;
};

export const Token = React.memo(TokenComponent, arePropsEqual);
