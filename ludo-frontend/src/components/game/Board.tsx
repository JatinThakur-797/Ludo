import React from 'react';
import type { PlayerColor, PlayerState, ValidMove, TurnPhase, GameStatus } from '../../engine/types';
import { GLOBAL_TRACK_CELLS_GRID, HOME_PATH_CELLS_GRID } from '../../utils/coordinates';
import { Token } from './Token';

/* ─── Props ─── */
interface BoardProps {
  players: Record<PlayerColor, PlayerState>;
  activeColor: PlayerColor | null;
  availableMoves: ValidMove[];
  turnPhase: TurnPhase;
  onTokenClick: (tokenIndex: number) => void;
  status: GameStatus;
}

/* ─── Constants ─── */
const CELL  = 40;
const BOARD = 600;

/* ─── Color palette (Ludo King Theme) ─── */
const C: Record<PlayerColor, {
  main: string; light: string; border: string; dark: string; glow: string;
}> = {
  RED:    { main: '#d32f2f', light: '#ffebee', border: '#ff8a80', dark: '#b71c1c', glow: 'rgba(211, 47, 47, 0.4)' },
  GREEN:  { main: '#2e7d32', light: '#e8f5e9', border: '#a5d6a7', dark: '#1b5e20', glow: 'rgba(46, 125, 50, 0.4)' },
  YELLOW: { main: '#f57f17', light: '#fffde7', border: '#fff59d', dark: '#e65100', glow: 'rgba(245, 127, 23, 0.4)' },
  BLUE:   { main: '#1565c0', light: '#e3f2fd', border: '#90caf9', dark: '#0d47a1', glow: 'rgba(21, 101, 192, 0.4)' },
};

/* Safe-cell global track indices */
const SAFE_INDICES = new Set([8, 21, 34, 47]);

/* ─── Star sub-component ─── */
const Star: React.FC<{ cx: number; cy: number; r?: number }> = ({ cx, cy, r = 8 }) => {
  const pts: string[] = [];
  for (let i = 0; i < 12; i++) {
    const a   = (Math.PI / 6) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return (
    <polygon
      points={pts.join(' ')}
      fill="rgba(255,255,255,0.95)"
      stroke="rgba(0,0,0,0.1)"
      strokeWidth={0.5}
    />
  );
};

/* ─── Arrow sub-component ─── */
const Arrow: React.FC<{ cx: number; cy: number; dir: 'right'|'down'|'left'|'up' }> = ({ cx, cy, dir }) => {
  const s = 9;
  const p: Record<string, string> = {
    right: `${cx-s},${cy-s*.55} ${cx+s},${cy} ${cx-s},${cy+s*.55}`,
    down:  `${cx-s*.55},${cy-s} ${cx},${cy+s} ${cx+s*.55},${cy-s}`,
    left:  `${cx+s},${cy-s*.55} ${cx-s},${cy} ${cx+s},${cy+s*.55}`,
    up:    `${cx-s*.55},${cy+s} ${cx},${cy-s} ${cx+s*.55},${cy+s}`,
  };
  return (
    <polygon
      points={p[dir]}
      fill="rgba(255,255,255,0.92)"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
    />
  );
};

/* ─── Player name label in yard outer band ─── */
const YardLabel: React.FC<{
  color: PlayerColor; name: string;
  x: number; y: number; w: number; h: number;
}> = ({ color, name, x, y, w, h }) => {
  const col   = C[color];
  const labelX = x + w / 2;
  const labelY = y + h - 13;
  const display = name.length > 11 ? name.slice(0, 10) + '…' : name;
  return (
    <>
      {/* Subtle pill background */}
      <rect
        x={labelX - 52} y={labelY - 10}
        width={104} height={18}
        rx={9} ry={9}
        fill="rgba(0,0,0,0.22)"
      />
      <text
        x={labelX} y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontWeight="800"
        fontFamily="Inter, sans-serif"
        letterSpacing={0.4}
        fill="rgba(255,255,255,0.95)"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {display}
      </text>
      {col && null /* keep linter happy */}
    </>
  );
};

/* ─── Board Base Component ─── */
const BoardComponent: React.FC<BoardProps> = ({
  players, activeColor, availableMoves, turnPhase, onTokenClick, status,
}) => {
  /* Home yard definitions */
  const yards: Array<{
    color: PlayerColor;
    x: number; y: number; w: number; h: number;
    circles: [number, number][];
  }> = [
    { color: 'RED',    x: 0,   y: 0,   w: 240, h: 240,
      circles: [[80,80],[160,80],[80,160],[160,160]] },
    { color: 'GREEN',  x: 360, y: 0,   w: 240, h: 240,
      circles: [[440,80],[520,80],[440,160],[520,160]] },
    { color: 'YELLOW', x: 360, y: 360, w: 240, h: 240,
      circles: [[440,440],[520,440],[440,520],[520,520]] },
    { color: 'BLUE',   x: 0,   y: 360, w: 240, h: 240,
      circles: [[80,440],[160,440],[80,520],[160,520]] },
  ];

  return (
    <div className="ludo-board-wrap">
      <svg
        viewBox={`0 0 ${BOARD} ${BOARD}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', width: '100%', height: '100%' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* ── SVG DEFS ── */}
        <defs>
          <style>{`
            @keyframes tokenPulse {
              0%   { transform: scale(1);   opacity: 0.85; }
              100% { transform: scale(2.0); opacity: 0; }
            }
            @keyframes tokenBounce {
              from { transform: translateY(0); }
              to   { transform: translateY(-4px); }
            }
            @keyframes yardPulse {
              0%, 100% { stroke-opacity: 0.65; }
              50%      { stroke-opacity: 0.12; }
            }
          `}</style>

          {/* Board shadow filter */}
          <filter id="board-shadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>

          {/* Center glow radial gradient */}
          <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          {/* Safe-cell star gradient */}
          <radialGradient id="safe-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#e8edff" />
            <stop offset="100%" stopColor="#d8e3ff" />
          </radialGradient>
        </defs>

        {/* ══ BACKGROUND ══ */}
        <rect x={0} y={0} width={BOARD} height={BOARD} fill="#f4f6fb" />

        {/* ══ HOME YARDS ══ */}
        {yards.map(({ color, x, y, w, h, circles }) => {
          const col      = C[color];
          const isActive = activeColor === color;
          const player   = players[color];

          return (
            <g key={color}>
              {/* Outer colored square with subtle inner gradient */}
              <defs>
                <linearGradient id={`yard-grad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%"   stopColor={col.main} />
                  <stop offset="100%" stopColor={col.dark} />
                </linearGradient>
              </defs>
              <rect x={x} y={y} width={w} height={h} fill={`url(#yard-grad-${color})`} />

              {/* Inner white panel */}
              <rect
                x={x + 22} y={y + 22}
                width={w - 44} height={h - 44}
                fill="white"
                rx={16} ry={16}
                style={{ filter: 'url(#board-shadow)' }}
              />

              {/* Active pulse ring */}
              {isActive && (
                <rect
                  x={x + 5} y={y + 5}
                  width={w - 10} height={h - 10}
                  fill="none"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth={3}
                  strokeDasharray="8 5"
                  rx={5}
                  style={{
                    pointerEvents: 'none',
                    animation: 'yardPulse 1.5s ease-in-out infinite',
                    transformOrigin: `${x + w / 2}px ${y + h / 2}px`,
                  }}
                />
              )}

              {/* Token holding circles */}
              {circles.map(([cx, cy], i) => (
                <g key={i}>
                  <circle cx={cx} cy={cy} r={32} fill={col.light} />
                  <circle cx={cx} cy={cy} r={28} fill="none" stroke={col.main} strokeWidth={2.5} strokeOpacity={0.25} />
                  <circle cx={cx} cy={cy} r={22} fill="none" stroke={col.border} strokeWidth={1} strokeOpacity={0.35} />
                </g>
              ))}

              {/* Player name label */}
              {player && (
                <YardLabel color={color} name={player.displayName} x={x} y={y} w={w} h={h} />
              )}
            </g>
          );
        })}

        {/* ══ GLOBAL TRACK CELLS ══ */}
        {GLOBAL_TRACK_CELLS_GRID.map(([col, row], idx) => {
          const x  = col * CELL;
          const y  = row * CELL;
          const cx = x + CELL / 2;
          const cy = y + CELL / 2;

          const isStart = idx === 0 || idx === 13 || idx === 26 || idx === 39;
          const isSafe  = SAFE_INDICES.has(idx);

          let fill = '#f0f4fb';
          if (idx === 0)  fill = C.RED.main;
          if (idx === 13) fill = C.GREEN.main;
          if (idx === 26) fill = C.YELLOW.main;
          if (idx === 39) fill = C.BLUE.main;
          if (isSafe && !isStart) fill = 'url(#safe-bg)';

          return (
            <g key={`t-${idx}`}>
              <rect
                x={x} y={y}
                width={CELL} height={CELL}
                fill={fill}
                stroke="#ccd5e8"
                strokeWidth={0.7}
              />
              {isSafe && !isStart && <Star cx={cx} cy={cy} r={9} />}
              {idx === 0  && <Arrow cx={cx} cy={cy} dir="right" />}
              {idx === 13 && <Arrow cx={cx} cy={cy} dir="down"  />}
              {idx === 26 && <Arrow cx={cx} cy={cy} dir="left"  />}
              {idx === 39 && <Arrow cx={cx} cy={cy} dir="up"    />}
            </g>
          );
        })}

        {/* ══ HOME PATH LANES ══ */}
        {(Object.keys(HOME_PATH_CELLS_GRID) as PlayerColor[]).map(color =>
          HOME_PATH_CELLS_GRID[color].map(([col, row], idx) => {
            const opacity = 0.4 + (idx / 5) * 0.6;
            return (
              <rect
                key={`hp-${color}-${idx}`}
                x={col * CELL} y={row * CELL}
                width={CELL} height={CELL}
                fill={C[color].main}
                stroke="#ccd5e8"
                strokeWidth={0.7}
                opacity={opacity}
              />
            );
          })
        )}

        {/* ══ CENTER GOAL ══ */}
        <rect x={240} y={240} width={120} height={120} fill="#ecf0fa" />
        {/* Triangles (color matches each player's home path) */}
        <polygon points="240,240 360,240 300,300" fill={C.GREEN.main}  />
        <polygon points="360,240 360,360 300,300" fill={C.YELLOW.main} />
        <polygon points="360,360 240,360 300,300" fill={C.BLUE.main}   />
        <polygon points="240,360 240,240 300,300" fill={C.RED.main}    />

        {/* Crossroads dividers (Gold metallic lines) */}
        <line x1={240} y1={240} x2={360} y2={360} stroke="#fbc02d" strokeWidth={3.5} />
        <line x1={360} y1={240} x2={240} y2={360} stroke="#fbc02d" strokeWidth={3.5} />

        {/* Center glow overlay */}
        <rect x={240} y={240} width={120} height={120} fill="url(#center-glow)" />
        {/* Big center star */}
        <Star cx={300} cy={300} r={20} />
        {/* Border ring */}
        <rect x={240} y={240} width={120} height={120}
          fill="none"
          stroke="#fbc02d"
          strokeWidth={2}
        />

        {/* ══ TRACK ARM GRID LINES (visual guide) ══ */}
        {[6,7,8].map(r => (
          <line key={`hl${r}`}
            x1={0} y1={r * CELL} x2={BOARD} y2={r * CELL}
            stroke="#ccd5e8" strokeWidth={0.5} opacity={0.6}
          />
        ))}
        {[6,7,8].map(c => (
          <line key={`vl${c}`}
            x1={c * CELL} y1={0} x2={c * CELL} y2={BOARD}
            stroke="#ccd5e8" strokeWidth={0.5} opacity={0.6}
          />
        ))}

        {/* ══ BOARD OUTER BORDER (Ludo King style gold frame) ══ */}
        <rect
          x={3} y={3}
          width={BOARD - 6} height={BOARD - 6}
          fill="none"
          stroke="#fbc02d"
          strokeWidth={6}
          rx={10}
        />
        <rect
          x={8} y={8}
          width={BOARD - 16} height={BOARD - 16}
          fill="none"
          stroke="#07080d"
          strokeWidth={1.5}
          rx={6}
        />

        {/* ══ TOKENS ══ */}
        {(Object.values(players) as PlayerState[]).flatMap(player =>
          player.tokens.map(token => {
            const canMove =
              turnPhase === 'WAITING_FOR_MOVE' &&
              activeColor === player.color &&
              availableMoves.some(m => m.tokenIndex === token.index);
            return (
              <Token
                key={`${player.color}-${token.index}`}
                color={player.color}
                index={token.index}
                position={token.position}
                isMovable={canMove}
                onClick={() => onTokenClick(token.index)}
                gameStatus={status}
              />
            );
          })
        )}
      </svg>
    </div>
  );
};

// Strict props-comparison for optimized rendering
const arePropsEqual = (prevProps: BoardProps, nextProps: BoardProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.activeColor !== nextProps.activeColor) return false;
  if (prevProps.turnPhase !== nextProps.turnPhase) return false;

  // Compare availableMoves length and item values
  if (prevProps.availableMoves.length !== nextProps.availableMoves.length) return false;
  for (let i = 0; i < prevProps.availableMoves.length; i++) {
    const pm = prevProps.availableMoves[i];
    const nm = nextProps.availableMoves[i];
    if (
      pm.tokenIndex !== nm.tokenIndex ||
      pm.fromPosition !== nm.fromPosition ||
      pm.toPosition !== nm.toPosition ||
      pm.isCapture !== nm.isCapture ||
      pm.isGoalEntry !== nm.isGoalEntry
    ) {
      return false;
    }
  }

  // Compare players structure
  const colors: PlayerColor[] = ['RED', 'GREEN', 'YELLOW', 'BLUE'];
  for (const color of colors) {
    const p = prevProps.players[color];
    const n = nextProps.players[color];
    if (!p && !n) continue;
    if (!p || !n) return false;

    if (
      p.displayName !== n.displayName ||
      p.isOnline !== n.isOnline ||
      p.isAi !== n.isAi ||
      p.finishOrder !== n.finishOrder
    ) {
      return false;
    }

    // Compare nested tokens
    for (let i = 0; i < 4; i++) {
      const pt = p.tokens[i];
      const nt = n.tokens[i];
      if (
        pt.index !== nt.index ||
        pt.position !== nt.position ||
        pt.status !== nt.status ||
        pt.isSafe !== nt.isSafe
      ) {
        return false;
      }
    }
  }

  return true;
};

export const Board = React.memo(BoardComponent, arePropsEqual);
