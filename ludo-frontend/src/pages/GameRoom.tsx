import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { Board } from '../components/game/Board';
import { Dice } from '../components/game/Dice';
import { TimerProgressBar } from '../components/game/TimerProgressBar';
import type { PlayerColor } from '../engine/types';

/* ─── Color config per player ─── */
const CC: Record<PlayerColor, {
  dot: string; bg: string; text: string; border: string; glow: string; dark: string;
}> = {
  RED: { dot: '#e53e3e', bg: 'rgba(229,62,62,0.1)', text: '#fc8181', border: 'rgba(229,62,62,0.3)', glow: 'rgba(229,62,62,0.22)', dark: '#9b2c2c' },
  GREEN: { dot: '#38a169', bg: 'rgba(56,161,105,0.1)', text: '#68d391', border: 'rgba(56,161,105,0.3)', glow: 'rgba(56,161,105,0.22)', dark: '#276749' },
  YELLOW: { dot: '#d69e2e', bg: 'rgba(214,158,46,0.1)', text: '#f6e05e', border: 'rgba(214,158,46,0.3)', glow: 'rgba(214,158,46,0.22)', dark: '#975a16' },
  BLUE: { dot: '#3182ce', bg: 'rgba(49,130,206,0.1)', text: '#63b3ed', border: 'rgba(49,130,206,0.3)', glow: 'rgba(49,130,206,0.22)', dark: '#2c5282' },
};

/* ─── Player card in HUD ─── */
const PlayerCard: React.FC<{
  color: PlayerColor; name: string; isAi: boolean;
  isActive: boolean; tokensHome: number;
}> = ({ color, name, isAi, isActive, tokensHome }) => {
  const c = CC[color];
  return (
    <div
      className={`player-hud-card${isActive ? ' active' : ''}`}
      style={{
        background: isActive ? c.bg : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isActive ? c.border : 'rgba(255,255,255,0.06)'}`,
        boxShadow: isActive ? `0 0 18px ${c.glow}` : 'none',
      }}
    >
      {/* Color indicator */}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: isActive ? c.bg : 'rgba(255,255,255,0.04)',
        border: `2px solid ${isActive ? c.border : 'rgba(255,255,255,0.08)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, position: 'relative',
      }}>
        <span style={{
          width: 14, height: 14, borderRadius: '50%',
          background: c.dot, display: 'block',
          boxShadow: isActive ? `0 0 8px ${c.dot}` : 'none',
        }} />
        {isActive && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 10, height: 10, borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 6px rgba(34,197,94,0.9)',
            animation: 'pulseDot 1.2s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* Name + type */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: isActive ? c.text : 'var(--text-secondary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          transition: 'color 0.3s',
        }}>
          {name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
          {isAi ? '🤖 Bot' : '👤 Human'} · {tokensHome}/4 home
        </div>
      </div>

      {/* Token pips */}
      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {[0, 1, 2, 3].map(i => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: i < tokensHome ? c.dot : 'rgba(255,255,255,0.08)',
            border: `1px solid ${i < tokensHome ? c.dot : 'rgba(255,255,255,0.06)'}`,
            transition: 'background 0.4s ease',
            boxShadow: i < tokensHome ? `0 0 4px ${c.dot}` : 'none',
          }} />
        ))}
      </div>
    </div>
  );
};

/* ─── Log entry ─── */
const LogEntry: React.FC<{ text: string; index: number }> = ({ text, index }) => {
  const isWin = text.startsWith('🏆');
  const isRoll = text.startsWith('🎲');
  const isMove = text.startsWith('♟');
  const isCapture = text.includes('captures') || text.includes('Capture');
  const isStart = text.startsWith('🎮') || text.startsWith('Turn');

  const color = isWin
    ? '#facc15'
    : isCapture
      ? '#f87171'
      : isRoll
        ? '#a78bfa'
        : isStart
          ? '#60a5fa'
          : isMove
            ? '#4ade80'
            : 'var(--text-muted)';

  return (
    <div className="log-entry" style={{
      display: 'flex', gap: 8, paddingBottom: 5, paddingTop: 4,
      borderBottom: '1px solid rgba(255,255,255,0.03)',
    }}>
      <span style={{ opacity: 0.3, flexShrink: 0, fontFamily: 'monospace', fontSize: 10 }}>
        [{index + 1}]
      </span>
      <span style={{ color, fontSize: 11, lineHeight: 1.4 }}>{text}</span>
    </div>
  );
};

/* ─── Confetti burst ─── */
function spawnConfetti() {
  const colors = ['#f5c842', '#8b5cf6', '#ef4444', '#22c55e', '#3b82f6', '#f97316', '#ec4899'];
  const container = document.body;
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-particle';
    const size = 6 + Math.random() * 8;
    Object.assign(el.style, {
      left: `${Math.random() * 100}vw`,
      top: '-20px',
      width: `${size}px`,
      height: `${size}px`,
      background: colors[Math.floor(Math.random() * colors.length)],
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      animationDuration: `${1.8 + Math.random() * 2.4}s`,
      animationDelay: `${Math.random() * 0.8}s`,
    });
    container.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }
}

/* ─── Main component ─── */
export const GameRoom: React.FC = () => {
  const store = useGameStore();
  const hasSpawnedConfetti = useRef(false);

  /* Lobby state */
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [playerNames, setPlayerNames] = useState<Record<PlayerColor, string>>({
    RED: 'Red Player', GREEN: 'Green Player', YELLOW: 'Yellow Player', BLUE: 'Blue Player',
  });
  const [playerTypes, setPlayerTypes] = useState<Record<PlayerColor, 'HUMAN' | 'AI'>>({
    RED: 'HUMAN', GREEN: 'AI', YELLOW: 'AI', BLUE: 'AI',
  });

  /* Game state */
  const [logs, setLogs] = useState<string[]>(['Select players and launch the match!']);

  /* Dice states mapped to individual players */
  const [lastRolls, setLastRolls] = useState<Record<PlayerColor, number | null>>({
    RED: null, GREEN: null, YELLOW: null, BLUE: null
  });
  const [diceRollIds, setDiceRollIds] = useState<Record<PlayerColor, number>>({
    RED: 0, GREEN: 0, YELLOW: 0, BLUE: 0
  });

  const lastSeq = useRef(-1);
  const lastProcessedSequenceRef = useRef(-1);
  const logContainerRef = useRef<HTMLDivElement>(null);

  /* Scroll log container — scoped to the inner div */
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  /* Watch for store updates → generate logs */
  useEffect(() => {
    if (store.status !== 'ACTIVE') return;
    if (store.sequenceNumber === lastSeq.current) return;
    lastSeq.current = store.sequenceNumber;

    const name = store.activeColor ? store.players[store.activeColor]?.displayName : '';
    const entries: string[] = [];

    if (store.turnPhase === 'WAITING_FOR_MOVE' && store.lastRoll !== null) {
      entries.push(`🎲 ${name} rolled a ${store.lastRoll}!${store.lastRoll === 6 ? ' 🎉 Bonus roll!' : ''}`);
    } else if (store.turnPhase === 'WAITING_FOR_ROLL') {
      entries.push(`⏩ ${name}'s turn — roll the dice!`);
    }
    if (store.winnerColor) {
      entries.push(`🏆 ${store.players[store.winnerColor]?.displayName} wins the match!`);
    }
    if (entries.length > 0) setLogs(prev => [...prev, ...entries]);
  }, [store.sequenceNumber, store.turnPhase, store.status, store.players, store.activeColor, store.winnerColor, store.lastRoll]);

  /* Track individual dice roll signals from the store */
  useEffect(() => {
    if (store.status !== 'ACTIVE') return;
    if (store.sequenceNumber === lastProcessedSequenceRef.current) return;
    lastProcessedSequenceRef.current = store.sequenceNumber;

    if (store.lastRoll !== null && store.activeColor) {
      setLastRolls(prev => ({
        ...prev,
        [store.activeColor!]: store.lastRoll
      }));
      if (store.turnPhase === 'WAITING_FOR_MOVE') {
        setDiceRollIds(prev => ({
          ...prev,
          [store.activeColor!]: prev[store.activeColor!] + 1
        }));
      }
    }
  }, [store.sequenceNumber, store.status, store.lastRoll, store.activeColor, store.turnPhase]);

  /* Confetti on win */
  useEffect(() => {
    if (store.status === 'COMPLETED' && !hasSpawnedConfetti.current) {
      hasSpawnedConfetti.current = true;
      spawnConfetti();
    }
    if (store.status !== 'COMPLETED') hasSpawnedConfetti.current = false;
  }, [store.status]);

  /* Auto-move token if only one token is movable */
  useEffect(() => {
    if (store.status !== 'ACTIVE') return;

    const activeColor = store.activeColor;
    if (!activeColor) return;

    const activePlayer = store.players[activeColor];
    const isHuman = activePlayer && !activePlayer.isAi;

    if (isHuman && store.turnPhase === 'WAITING_FOR_MOVE' && store.availableMoves.length === 1) {
      const tokenIndex = store.availableMoves[0].tokenIndex;
      const timer = setTimeout(() => {
        // Fetch current store state to verify no changes occurred during wait
        const checkState = useGameStore.getState();
        if (
          checkState.status === 'ACTIVE' &&
          checkState.activeColor === activeColor &&
          checkState.turnPhase === 'WAITING_FOR_MOVE' &&
          checkState.availableMoves.length === 1 &&
          checkState.availableMoves[0].tokenIndex === tokenIndex
        ) {
          handleTokenClick(tokenIndex);
        }
      }, 1600); // Wait 1.6s for dice animation to complete
      return () => clearTimeout(timer);
    }
  }, [store.sequenceNumber, store.status, store.turnPhase, store.activeColor, store.availableMoves]);

  /* Active colors for selected player count */
  const activeColors: PlayerColor[] =
    playerCount === 2 ? ['RED', 'YELLOW'] :
      playerCount === 3 ? ['RED', 'GREEN', 'YELLOW'] :
        ['RED', 'GREEN', 'YELLOW', 'BLUE'];

  /* Handlers */
  const handleStartGame = () => {
    const configs = activeColors.map(color => ({
      userId: playerTypes[color] === 'HUMAN' ? `user-${color}` : null,
      displayName: playerNames[color],
      color,
      isAi: playerTypes[color] === 'AI',
    }));
    store.startNewLocalGame(configs);
    setLogs(['🎮 Match started!', `Turn order: ${configs.map(c => c.displayName).join(' → ')}`]);
  };

  const handleDiceRoll = useCallback(() => {
    if (store.turnPhase !== 'WAITING_FOR_ROLL') return;
    store.rollDiceAction();
  }, [store]);

  const handleTokenClick = (tokenIndex: number) => {
    const ap = store.activeColor ? store.players[store.activeColor] : null;
    if (!ap) return;
    const move = store.availableMoves.find(m => m.tokenIndex === tokenIndex);
    const toStr = move
      ? (move.toPosition === 57 ? '🏠 Goal!' : `cell ${move.toPosition}`)
      : '?';
    if (move?.isCapture) {
      setLogs(p => [...p, `♟ ${ap.displayName}: Token ${tokenIndex + 1} → ${toStr} 💥 captures!`]);
    } else {
      setLogs(p => [...p, `♟ ${ap.displayName}: Token ${tokenIndex + 1} → ${toStr}`]);
    }
    store.moveTokenAction(tokenIndex);
  };

  const handleReset = () => {
    store.resetGameAction();
    setLastRolls({ RED: null, GREEN: null, YELLOW: null, BLUE: null });
    setDiceRollIds({ RED: 0, GREEN: 0, YELLOW: 0, BLUE: 0 });
    setLogs(['Select players and launch the match!']);
  };

  /* Space bar → roll */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (isHumanTurn) handleDiceRoll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDiceRoll, store.status, store.activeColor, store.turnPhase, store.players]);

  const tokensAtHome = (color: PlayerColor) =>
    store.players[color]?.tokens?.filter(t => t.position === 57).length ?? 0;

  const activePlayers = Object.values(store.players ?? {}).filter(Boolean);

  const isHumanTurn =
    store.status === 'ACTIVE' &&
    !!store.activeColor &&
    store.turnPhase === 'WAITING_FOR_ROLL' &&
    !store.players[store.activeColor]?.isAi;

  /* ─── RENDER ─── */
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div className="glow-orb" style={{ width: 700, height: 700, background: 'rgba(99,102,241,0.05)', top: -200, left: -200 }} />
      <div className="glow-orb" style={{ width: 500, height: 500, background: 'rgba(139,92,246,0.04)', bottom: -150, right: -150 }} />

      {/* ── TOP BAR ── */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(7,8,13,0.92)',
        backdropFilter: 'blur(20px)',
        padding: '0 20px',
        height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px rgba(139,92,246,0.4)',
          }}>
            <span className="font-game" style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>L</span>
          </div>
          <div>
            <h1 className="font-game text-shimmer" style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>
              LOCAL LUDO
            </h1>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: -2, letterSpacing: 0.3 }}>
              Pass & Play · AI Bots · Offline
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {store.status === 'ACTIVE' && (
            <button onClick={handleReset} className="btn-danger">
              ↺ Reset
            </button>
          )}
          <Link to="/" className="btn-secondary" style={{ fontSize: 12, padding: '7px 14px' }}>
            ← Dashboard
          </Link>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <div style={{ position: 'relative', zIndex: 10 }}>

        {/* ══ LOBBY ══ */}
        {store.status === 'LOBBY' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 'calc(100vh - 58px)', padding: '24px 16px',
          }}>
            <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 520, padding: '36px 40px' }}>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ fontSize: 44, marginBottom: 14, animation: 'floatY 3s ease-in-out infinite' }}>🎲</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Configure Your Match
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Set up players, choose human or bot, then launch!
                </p>
              </div>

              {/* Player count */}
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, padding: '14px 18px', marginBottom: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Number of Players
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[2, 3, 4].map(n => (
                    <button
                      key={n}
                      onClick={() => setPlayerCount(n)}
                      style={{
                        width: 42, height: 42, borderRadius: 12,
                        fontWeight: 900, fontSize: 16, cursor: 'pointer', border: 'none',
                        transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                        background: playerCount === n
                          ? 'linear-gradient(135deg,#8b5cf6,#6366f1)'
                          : 'rgba(255,255,255,0.05)',
                        color: playerCount === n ? '#fff' : 'var(--text-muted)',
                        boxShadow: playerCount === n ? '0 0 20px rgba(139,92,246,0.5)' : 'none',
                        transform: playerCount === n ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2-player notice */}
              {playerCount === 2 && (
                <div style={{
                  background: 'rgba(245,200,66,0.06)', border: '1px solid rgba(245,200,66,0.18)',
                  borderRadius: 10, padding: '8px 14px', marginBottom: 16,
                  fontSize: 12, color: 'rgba(245,200,66,0.85)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span>⚡</span>
                  <span>2-player uses <strong>opposite corners</strong> (Red + Yellow) for balance.</span>
                </div>
              )}

              {/* Player slot configs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {activeColors.map(color => {
                  const c = CC[color];
                  return (
                    <div key={color} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${c.border}`,
                      borderRadius: 14, padding: '11px 14px',
                    }}>
                      {/* Color badge */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: c.bg, border: `2px solid ${c.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span style={{ width: 13, height: 13, borderRadius: '50%', background: c.dot, display: 'block' }} />
                      </div>

                      {/* Name input */}
                      <input
                        type="text"
                        value={playerNames[color]}
                        onChange={e => setPlayerNames(p => ({ ...p, [color]: e.target.value.slice(0, 16) }))}
                        placeholder={`${color} player name`}
                        className="input-field"
                        style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
                      />

                      {/* Human / Bot toggle */}
                      <div style={{
                        display: 'flex', borderRadius: 9,
                        overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)',
                        flexShrink: 0,
                      }}>
                        {(['HUMAN', 'AI'] as const).map(type => (
                          <button
                            key={type}
                            onClick={() => setPlayerTypes(p => ({ ...p, [color]: type }))}
                            style={{
                              padding: '7px 12px', fontSize: 11, fontWeight: 700,
                              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                              background: playerTypes[color] === type ? c.bg : 'transparent',
                              color: playerTypes[color] === type ? c.text : 'var(--text-muted)',
                            }}
                          >
                            {type === 'HUMAN' ? '👤' : '🤖'} {type === 'HUMAN' ? 'Human' : 'Bot'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleStartGame}
                className="btn-primary"
                style={{ width: '100%', padding: '15px', fontSize: 16, letterSpacing: 0.5 }}
              >
                🚀 Launch Match
              </button>
            </div>
          </div>
        )}

        {/* ══ ACTIVE GAME ══ */}
        {store.status === 'ACTIVE' && (
          <div className="game-layout animate-fade-in">

            {/* ── BOARD ── */}
            <div className="game-board-col">
              <Board
                players={store.players}
                activeColor={store.activeColor}
                availableMoves={store.availableMoves}
                turnPhase={store.turnPhase}
                onTokenClick={handleTokenClick}
                status={store.status}
              />
            </div>

            {/* ── HUD ── */}
            <div className="game-hud-col">

              {/* ── Active Turn Card ── */}
              {store.activeColor && (() => {
                const ac = store.activeColor;
                const c = CC[ac];
                const ap = store.players[ac];
                const isAi = !!ap?.isAi;
                const isWaitingForMove = store.turnPhase === 'WAITING_FOR_MOVE';

                return (
                  <div style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 18,
                    padding: '16px 18px',
                    boxShadow: `0 0 28px ${c.glow}`,
                    transition: 'all 0.4s ease',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      {/* Player avatar */}
                      <div style={{
                        width: 46, height: 46, borderRadius: 13,
                        background: `${c.dot}20`,
                        border: `2px solid ${c.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: `0 0 16px ${c.glow}`,
                      }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: c.dot, display: 'block',
                          boxShadow: `0 0 8px ${c.glow}`,
                        }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: c.text, marginBottom: 2 }}>
                          {ap?.displayName}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                          {isAi
                            ? <><span style={{ animation: 'pulseDot 1s infinite', display: 'inline-block' }}>⚙️</span> Bot is thinking...</>
                            : isWaitingForMove
                              ? '👆 Tap a highlighted token to move!'
                              : '🎲 Roll the dice to play!'}
                        </div>
                      </div>
                      {/* Phase badge */}
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '4px 9px', borderRadius: 8, letterSpacing: 0.3,
                        background: isWaitingForMove ? 'rgba(74,222,128,0.12)' : 'rgba(250,204,21,0.12)',
                        color: isWaitingForMove ? '#4ade80' : '#facc15',
                        border: `1px solid ${isWaitingForMove ? 'rgba(74,222,128,0.25)' : 'rgba(250,204,21,0.25)'}`,
                        flexShrink: 0,
                      }}>
                        {isWaitingForMove ? 'MOVE' : 'ROLL'}
                      </span>
                    </div>

                    {/* Decoupled Countdown Progress Bar */}
                    <TimerProgressBar
                      status={store.status}
                      sequenceNumber={store.sequenceNumber}
                      turnTimerSeconds={15}
                      playerColorTheme={c}
                    />
                  </div>
                );
              })()}

              {/* ── Players Scoreboard with 4 independent dice slots ── */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 18, padding: '14px 16px',
              }}>
                <div className="section-label">Players & Dice</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {activePlayers.map(p => {
                    if (!p) return null;
                    const isCurrentActive = store.activeColor === p.color;
                    const isDiceRollable = isCurrentActive && store.turnPhase === 'WAITING_FOR_ROLL' && !p.isAi;

                    const diceVal = isCurrentActive ? store.lastRoll : lastRolls[p.color];

                    return (
                      <div key={p.color} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <PlayerCard
                            color={p.color}
                            name={p.displayName}
                            isAi={p.isAi}
                            isActive={isCurrentActive}
                            tokensHome={tokensAtHome(p.color)}
                          />
                        </div>
                        <div style={{
                          flexShrink: 0,
                          opacity: isCurrentActive || isDiceRollable ? 1 : 0.45,
                          transition: 'opacity 0.3s ease'
                        }}>
                          <Dice
                            value={diceVal}
                            activeColor={p.color}
                            isRollable={isDiceRollable}
                            rollId={diceRollIds[p.color]}
                            onRoll={handleDiceRoll}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Match Log ── */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 18, padding: '14px 16px',
                display: 'flex', flexDirection: 'column',
                maxHeight: 210,
              }}>
                <div className="section-label" style={{ flexShrink: 0 }}>Match Log</div>
                <div ref={logContainerRef} style={{ overflowY: 'auto', flex: 1 }}>
                  {logs.map((log, i) => (
                    <LogEntry key={i} text={log} index={i} />
                  ))}
                </div>
              </div>

              {/* Space-bar hint */}
              {isHumanTurn && (
                <div style={{
                  textAlign: 'center', fontSize: 11, color: 'var(--text-muted)',
                  fontWeight: 600, letterSpacing: 0.3,
                }}>
                  Press <kbd style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 5, padding: '1px 7px', fontFamily: 'monospace', fontSize: 10,
                  }}>Space</kbd> to roll
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ VICTORY OVERLAY ══ */}
      {store.status === 'COMPLETED' && store.winnerColor && (() => {
        const c = CC[store.winnerColor];
        const winnerName = store.players[store.winnerColor]?.displayName;

        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(7,8,13,0.88)',
            backdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }} className="animate-fade-in-scale">
            <div className="glass-card" style={{
              maxWidth: 460, width: '100%',
              padding: '48px 44px',
              textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
              borderTop: `3px solid ${c.dot}`,
              boxShadow: `0 0 80px ${c.glow}, 0 0 0 1px ${c.border}, 0 30px 60px rgba(0,0,0,0.7)`,
            }}>
              {/* Trophy */}
              <div style={{
                width: 96, height: 96, borderRadius: '50%',
                background: c.bg,
                border: `3px solid ${c.border}`,
                boxShadow: `0 0 60px ${c.glow}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 44,
              }} className="animate-float">
                🏆
              </div>

              {/* Text */}
              <div>
                <h2 className="font-game text-gold" style={{
                  fontSize: 48, fontWeight: 700, letterSpacing: 3, marginBottom: 10,
                  textShadow: '0 0 30px rgba(245,200,66,0.4)',
                }}>
                  VICTORY!
                </h2>
                <p style={{ fontSize: 20, color: c.text, fontWeight: 700, marginBottom: 4 }}>
                  {winnerName} wins!
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.dot, display: 'block' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                    {store.winnerColor} quadrant
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Total Turns', value: store.sequenceNumber },
                  { label: 'Players', value: activePlayers.length },
                ].map(stat => (
                  <div key={stat.label} className="stat-card">
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                      {stat.label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)' }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <button
                  onClick={handleReset}
                  className="btn-primary"
                  style={{ flex: 1, padding: '14px', fontSize: 15 }}
                >
                  🎮 Play Again
                </button>
                <Link
                  to="/"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '14px', fontSize: 14, textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ← Dashboard
                </Link>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
