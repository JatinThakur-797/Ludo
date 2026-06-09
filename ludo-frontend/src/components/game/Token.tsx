import React, { useEffect, useRef, useState } from 'react';
import type { PlayerColor, GameStatus } from '../../engine/types';
import { getTokenCoordinates } from '../../utils/coordinates';

interface TokenProps {
  color: PlayerColor;
  index: number;
  position: number;
  isMovable: boolean;
  onClick: () => void;
  gameStatus?: GameStatus;
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

/* Start cell and home path thresholds per color for step calculations */
const COLOR_OFFSETS = {
  RED: { start: 0, threshold: 50 },
  GREEN: { start: 13, threshold: 11 },
  YELLOW: { start: 26, threshold: 24 },
  BLUE: { start: 39, threshold: 37 }
};

// Calculate sequential steps for forward movement
function getForwardPath(color: PlayerColor, fromPos: number, toPos: number): number[] {
  if (fromPos === -1) {
    return [toPos];
  }
  
  const path: number[] = [];
  const offsetInfo = COLOR_OFFSETS[color];
  let current = fromPos;
  
  while (current !== toPos) {
    if (current === offsetInfo.threshold) {
      current = 52; // Enters home path
    } else if (current >= 52 && current < 57) {
      current += 1;
    } else if (current >= 0 && current < 52) {
      current = (current + 1) % 52;
    } else {
      break;
    }
    path.push(current);
  }
  return path;
}

// Calculate sequential steps for backtracking on capture
function getBacktrackPath(color: PlayerColor, fromPos: number): number[] {
  const path: number[] = [];
  const startPos = COLOR_OFFSETS[color].start;
  let current = fromPos;
  
  while (current !== startPos) {
    if (current >= 52 && current <= 57) {
      current -= 1;
    } else {
      current = (current - 1 + 52) % 52;
    }
    path.push(current);
  }
  // Finally go back into base yard (-1)
  path.push(-1);
  return path;
}

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

const TokenComponent: React.FC<TokenProps> = ({ color, index, position, isMovable, onClick, gameStatus }) => {
  const [visualPosition, setVisualPosition] = useState<number>(position);
  const prevPositionRef = useRef<number>(position);

  useEffect(() => {
    const prev = prevPositionRef.current;
    prevPositionRef.current = position;
    if (prev === position) return;

    // Trigger instant snaps if the game is resetting or not active
    if (gameStatus !== 'ACTIVE') {
      setVisualPosition(position);
      return;
    }

    let path: number[] = [];
    let intervalMs = 150;

    if (position === -1) {
      // Captured/killed! Retrace steps backward
      path = getBacktrackPath(color, prev);
      intervalMs = 45; // faster backtracking speed
    } else if (prev === -1) {
      // Move out of base
      path = [position];
    } else {
      // Forward movement along path
      path = getForwardPath(color, prev, position);
    }

    if (path.length === 0) return;

    let step = 0;
    const interval = setInterval(() => {
      setVisualPosition(path[step]);
      step++;
      if (step >= path.length) {
        clearInterval(interval);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [position, color, gameStatus]);

  const coords = getTokenCoordinates(color, visualPosition, index);
  const { dx, dy } = getDispersion(visualPosition, index);
  const x = coords.x + dx;
  const y = coords.y + dy;
  const c = COLOR_MAP[color];

  const gradientId = `token-grad-${color}-${index}`;
  const shadowGradId = `token-shadow-grad-${color}-${index}`;

  return (
    <g
      onClick={isMovable ? onClick : undefined}
      style={{
        cursor: isMovable ? 'pointer' : 'default',
        transform: `translate(${x}px, ${y}px)`,
        transition: 'transform 0.15s ease-out',
      }}
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
            cx={0} cy={3}
            r={19}
            fill="none"
            stroke={c.pulse}
            strokeWidth={2}
            style={{
              animation: 'tokenPulse 1.3s ease-out infinite',
              transformOrigin: '0px 3px',
            }}
          />
          <circle
            cx={0} cy={3}
            r={15}
            fill={`${c.outer}15`}
            stroke={c.pulse}
            strokeWidth={1.5}
            style={{
              animation: 'tokenPulse 1.3s ease-out 0.45s infinite',
              transformOrigin: '0px 3px',
            }}
          />
        </>
      )}

      {/* ── DROP SHADOW ── */}
      <ellipse
        cx={0} cy={10}
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
          d="M -11 8 C -11 10, 11 10, 11 8 L 11 6 C 11 8, -11 8, -11 6 Z"
          fill={`url(#${shadowGradId})`}
        />
        <ellipse cx={0} cy={6} rx={11} ry={3.5} fill={`url(#${gradientId})`} stroke="#fff" strokeWidth={0.8} />

        {/* Pawn Body Cone */}
        <path
          d="M -9 6 C -7.5 -1, -4 -3, -4 -4 L 4 -4 C 4 -3, 7.5 -1, 9 6 Z"
          fill={`url(#${gradientId})`}
          stroke="#fff"
          strokeWidth={0.8}
        />

        {/* Gold Collar Ring */}
        <ellipse cx={0} cy={-4} rx={5} ry={1.6} fill="#fbc02d" stroke="#fff" strokeWidth={0.5} />

        {/* Head Sphere */}
        <circle cx={0} cy={-9} r={5.8} fill={`url(#${gradientId})`} stroke="#fff" strokeWidth={0.8} />

        {/* Radial sheen reflection highlight on head */}
        <circle cx={-1.8} cy={-10.8} r={1.6} fill="rgba(255,255,255,0.65)" />
      </g>

      {/* ── MOVE ARROW (bouncing gold arrow pointing down) ── */}
      {isMovable && (
        <text
          x={0}
          y={-18}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fill="#fbc02d"
          fontWeight="900"
          stroke="#000000"
          strokeWidth={1.2}
          style={{
            animation: 'tokenBounce 0.55s ease-in-out infinite alternate',
            transformOrigin: '0px -18px',
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
         prevProps.isMovable === nextProps.isMovable &&
         prevProps.gameStatus === nextProps.gameStatus;
};

export const Token = React.memo(TokenComponent, arePropsEqual);
