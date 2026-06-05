import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../services/api';
import { Board } from '../components/game/Board';
import { Dice } from '../components/game/Dice';
import { gameAudio } from '../utils/audio';
import type { PlayerColor, GameStatus, GameState, PlayerState } from '../engine/types';

/* ─── Types ─── */
export interface RoomSlot {
  userId: string; displayName: string; color: PlayerColor;
  ready?: boolean; isReady?: boolean; online?: boolean; isOnline?: boolean;
}
export interface RoomSettings { maxPlayers: number; turnTimerSeconds: number; killRequiredToEnterHome: boolean; }
export interface LudoRoom {
  roomCode: string; status: GameStatus; hostId: string;
  settings: RoomSettings; slots: RoomSlot[];
  gameState: GameState | null;
  disconnectedTimestampMap: Record<string, number>;
  consecutiveTimeoutsMap: Record<string, number>;
}

/* ─── Color config ─── */
const CC: Record<PlayerColor, { dot: string; bg: string; text: string; border: string; glow: string }> = {
  RED:    { dot: '#e53e3e', bg: 'rgba(229,62,62,0.1)',   text: '#fc8181', border: 'rgba(229,62,62,0.3)',   glow: 'rgba(229,62,62,0.2)'  },
  GREEN:  { dot: '#38a169', bg: 'rgba(56,161,105,0.1)',  text: '#68d391', border: 'rgba(56,161,105,0.3)',  glow: 'rgba(56,161,105,0.2)' },
  YELLOW: { dot: '#d69e2e', bg: 'rgba(214,158,46,0.1)',  text: '#f6e05e', border: 'rgba(214,158,46,0.3)',  glow: 'rgba(214,158,46,0.2)' },
  BLUE:   { dot: '#3182ce', bg: 'rgba(49,130,206,0.1)',  text: '#63b3ed', border: 'rgba(49,130,206,0.3)',  glow: 'rgba(49,130,206,0.2)' },
};

/* ─── Helper getters ─── */
const getReady  = (s: RoomSlot) => !!(s as any).ready || !!(s as any).isReady;
const getOnline = (s: RoomSlot) => !!(s as any).online || !!(s as any).isOnline;
const getAi     = (p: PlayerState) => !!(p as any).ai || !!(p as any).isAi;
const getPOnline= (p: PlayerState) => !!(p as any).online || !!(p as any).isOnline;

/* ─── Player card ─── */
const PlayerCard: React.FC<{
  color: PlayerColor; name: string; isAi: boolean; isOnline: boolean;
  isActive: boolean; tokensHome: number;
}> = ({ color, name, isAi, isOnline, isActive, tokensHome }) => {
  const c = CC[color];
  return (
    <div className={`player-hud-card${isActive ? ' active' : ''}`} style={{
      background: isActive ? c.bg : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isActive ? c.border : 'rgba(255,255,255,0.06)'}`,
      boxShadow: isActive ? `0 0 18px ${c.glow}` : 'none',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: isActive ? c.bg : 'rgba(255,255,255,0.04)',
        border: `2px solid ${isActive ? c.border : 'rgba(255,255,255,0.08)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, position: 'relative',
      }}>
        <span style={{ width: 13, height: 13, borderRadius: '50%', background: c.dot, display: 'block' }} />
        {isActive && <span style={{
          position: 'absolute', top: -4, right: -4,
          width: 10, height: 10, borderRadius: '50%',
          background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.9)',
          animation: 'pulseDot 1.2s ease-in-out infinite',
        }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: isActive ? c.text : 'var(--text-secondary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
          {isAi ? '🤖 Bot' : isOnline ? '👤 Online' : '⚠️ Offline'} · {tokensHome}/4 home
        </div>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {[0,1,2,3].map(i => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: i < tokensHome ? c.dot : 'rgba(255,255,255,0.08)',
            boxShadow: i < tokensHome ? `0 0 4px ${c.dot}` : 'none',
          }} />
        ))}
      </div>
    </div>
  );
};

/* ─── Confetti ─── */
function spawnConfetti() {
  const colors = ['#f5c842','#8b5cf6','#ef4444','#22c55e','#3b82f6','#f97316'];
  for (let i = 0; i < 80; i++) {
    const el  = document.createElement('div');
    el.className = 'confetti-particle';
    const size = 6 + Math.random() * 8;
    Object.assign(el.style, {
      left: `${Math.random() * 100}vw`, top: '-20px',
      width: `${size}px`, height: `${size}px`,
      background: colors[Math.floor(Math.random() * colors.length)],
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      animationDuration: `${1.8 + Math.random() * 2.4}s`,
      animationDelay: `${Math.random() * 0.8}s`,
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }
}

/* ─── Main Component ─── */
export const OnlineGameRoom: React.FC = () => {
  const { roomCode }   = useParams<{ roomCode: string }>();
  const code           = roomCode?.toUpperCase();
  const navigate       = useNavigate();
  const { user }       = useAuthStore();
  const { isConnected, connect, subscribe, sendMessage } = useWebSocket();

  const [room, setRoom]             = useState<LudoRoom | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; content: string }>>([]);
  const [chatInput, setChatInput]   = useState('');
  const [logs, setLogs]             = useState<string[]>(['Connecting to room...']);
  const [turnTime, setTurnTime]     = useState(15);
  const [isRolling, setIsRolling]   = useState(false);
  const [copied, setCopied]         = useState(false);
  const [activePanel, setActivePanel] = useState<'log' | 'chat'>('log');
  const hasConfetti                 = useRef(false);

  const logEndRef  = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastSeqRef = useRef<number>(-1);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  useEffect(() => { connect(); }, [connect]);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await api.get(`/rooms/${code}`);
        setRoom(response.data as LudoRoom);
        setLogs(p => [...p, `Lobby loaded — Code: ${code}`]);
      } catch (error: any) {
        if (error.response?.status === 404) {
          setLogs(p => [...p, 'Room not found. Returning...']);
        } else {
          setLogs(p => [...p, 'Failed to connect.']);
        }
        setTimeout(() => navigate('/'), 2000);
      }
    };
    if (code) fetchRoom();
  }, [code, navigate]);

  /* WebSocket */
  useEffect(() => {
    if (!isConnected || !code) return;
    sendMessage(`/app/room/${code}/join`, {});

    const roomSub = subscribe(`/topic/room/${code}`, (message: unknown) => {
      const env       = message as Record<string, unknown>;
      const eventType = (env.type || env.eventType) as string;
      const data      = env.data || env.payload;

      if (eventType === 'ROOM_STATE_UPDATE') {
        setRoom(data as LudoRoom);
      } else if (eventType === 'GAME_STARTED') {
        setRoom(data as LudoRoom);
        setLogs(p => [...p, '🔥 Match started!']);
        gameAudio.playRoll();
      } else if (eventType === 'GAME_STATE_UPDATE') {
        const su = data as { gameState: GameState; effects?: Array<{ type: string }> };
        const gs = su.gameState;
        setRoom(prev => prev ? { ...prev, status: gs.status, gameState: gs } : prev);

        (su.effects || []).forEach(eff => {
          if (eff.type === 'PLAY_SOUND_ROLL')    { setIsRolling(true); setTimeout(() => setIsRolling(false), 600); gameAudio.playRoll(); }
          else if (eff.type === 'PLAY_SOUND_MOVE')    gameAudio.playMove();
          else if (eff.type === 'PLAY_SOUND_CAPTURE') gameAudio.playCapture();
          else if (eff.type === 'PLAY_SOUND_GOAL')    gameAudio.playGoal();
          else if (eff.type === 'PLAYER_WON' || eff.type === 'GAME_OVER') gameAudio.playVictory();
        });

        const activeName = gs.activeColor ? gs.players[gs.activeColor]?.displayName : '';
        if (gs.turnPhase === 'WAITING_FOR_MOVE' && gs.lastRoll !== null)
          setLogs(p => [...p, `🎲 ${activeName} rolled a ${gs.lastRoll}!`]);
        else if (gs.turnPhase === 'WAITING_FOR_ROLL')
          setLogs(p => [...p, `⏩ ${activeName}'s turn.`]);
        if (gs.winnerColor) {
          const winnerName = gs.players[gs.winnerColor]?.displayName || '';
          setLogs(p => [...p, `🏆 ${winnerName} wins!`]);
        }
      } else if (eventType === 'CHAT_MESSAGE') {
        const cd = data as { sender?: string; content?: string };
        setChatMessages(p => [...p, { sender: cd.sender || 'Anonymous', content: cd.content || '' }]);
        setActivePanel('chat');
      }
    });

    const errSub = subscribe('/user/queue/errors', (msg: unknown) => {
      const e = msg as { error?: string; message?: string };
      setLogs(p => [...p, `⚠️ ${e.error || e.message || 'Error occurred'}`]);
    });

    return () => { roomSub?.unsubscribe(); errSub?.unsubscribe(); };
  }, [isConnected, code, subscribe, sendMessage]);

  /* Timer */
  useEffect(() => {
    if (!room?.gameState) return;
    const seq = room.gameState.sequenceNumber;
    if (seq !== lastSeqRef.current) {
      lastSeqRef.current = seq;
      setTurnTime(room.settings?.turnTimerSeconds ?? 15);
    }
  }, [room?.gameState]);

  useEffect(() => {
    if (room?.status !== 'ACTIVE' || !room?.gameState) return;
    const t = setInterval(() => setTurnTime(p => (p <= 1 ? 0 : p - 1)), 1000);
    return () => clearInterval(t);
  }, [room?.status, room?.gameState?.sequenceNumber]);

  /* Confetti on win */
  useEffect(() => {
    if (room?.status === 'COMPLETED' && !hasConfetti.current) {
      hasConfetti.current = true;
      spawnConfetti();
    }
  }, [room?.status]);

  const mySlot   = room?.slots?.find(s => s.userId === user?.id);
  const myColor  = mySlot?.color;
  const isHost   = room?.hostId === user?.id;
  const isMyTurn = room?.gameState?.activeColor === myColor;

  const handleToggleReady = useCallback(() => {
    if (!mySlot) return;
    sendMessage(`/app/room/${code}/ready`, { ready: !getReady(mySlot) });
  }, [mySlot, code, sendMessage]);

  const handleLaunchGame = () => sendMessage(`/app/room/${code}/start`, {});
  const handleDiceRoll   = () => {
    if (isMyTurn && room?.gameState?.turnPhase === 'WAITING_FOR_ROLL')
      sendMessage(`/app/game/${code}/roll`, {});
  };
  const handleTokenClick = (idx: number) => {
    if (isMyTurn && room?.gameState?.turnPhase === 'WAITING_FOR_MOVE')
      sendMessage(`/app/game/${code}/move`, { tokenIndex: idx });
  };
  const handleSendChat = () => {
    if (!chatInput.trim() || !code) return;
    sendMessage(`/app/room/${code}/chat`, { content: chatInput });
    setChatInput('');
  };
  const handleCopyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const colorList: PlayerColor[] = ['RED', 'GREEN', 'YELLOW', 'BLUE'];

  const tokensAtHome = (color: PlayerColor) =>
    room?.gameState?.players[color]?.tokens?.filter(t => t.position === 57).length ?? 0;

  /* ─── Loading ─── */
  if (!room) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-base)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
      }}>
        <div className="glow-orb" style={{ width: 400, height: 400, background: 'rgba(139,92,246,0.08)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        <div style={{ width: 48, height: 48, border: '3px solid rgba(139,92,246,0.2)', borderTopColor: 'var(--accent-violet)', borderRadius: '50%' }} className="animate-spin" />
        <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>Connecting to match server...</div>
      </div>
    );
  }

  /* ─── RENDER ─── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', position: 'relative', overflow: 'hidden' }}>
      <div className="glow-orb" style={{ width: 500, height: 500, background: 'rgba(99,102,241,0.05)', top: -100, left: -100 }} />
      <div className="glow-orb" style={{ width: 400, height: 400, background: 'rgba(139,92,246,0.04)', bottom: -100, right: -100 }} />

      {/* ── HEADER ── */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(7,8,13,0.92)',
        backdropFilter: 'blur(20px)',
        padding: '0 20px',
        height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="font-game text-shimmer" style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>
            LUDO ARENA
          </span>
          <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
          {/* Room code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Room</span>
            <button
              onClick={handleCopyCode}
              style={{
                background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: 8, padding: '4px 12px', cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: 'monospace', fontWeight: 900, fontSize: 15, color: '#a78bfa', letterSpacing: 3,
              }}
              title="Click to copy"
            >
              {code}
            </button>
            {copied && <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>✓ Copied!</span>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`live-badge ${isConnected ? 'online' : 'offline'}`}>
            <span className={isConnected ? 'animate-pulse-dot' : ''} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isConnected ? '#22c55e' : '#ef4444', display: 'inline-block',
            }} />
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
          <button onClick={() => navigate('/')} className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>
            Leave
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '20px', position: 'relative', zIndex: 10 }}>

        {/* ══ LOBBY VIEW ══ */}
        {room.status === 'LOBBY' && (
          <div className="lobby-layout animate-fade-in">

            {/* Slots panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Lobby</h2>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {room.slots.length} / {room.settings.maxPlayers} joined
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {colorList.map(color => {
                  const isAvail = colorList.indexOf(color) < room.settings.maxPlayers;
                  const slot    = room.slots.find(s => s.color === color);
                  const cfg     = CC[color];

                  if (!isAvail) return (
                    <div key={color} style={{
                      background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.04)',
                      borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 100, opacity: 0.3,
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Disabled</span>
                    </div>
                  );

                  if (slot) {
                    const isMe   = slot.userId === user?.id;
                    const ready  = getReady(slot);
                    const online = getOnline(slot);
                    return (
                      <div key={color} style={{
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        borderRadius: 16, padding: '16px 18px',
                        boxShadow: isMe ? `0 0 20px ${cfg.glow}` : 'none',
                        transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 100,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 11,
                            background: `${cfg.dot}20`, border: `2px solid ${cfg.dot}50`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 900, fontSize: 13, color: cfg.text, flexShrink: 0,
                          }}>
                            {slot.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {slot.displayName}
                              </span>
                              {isMe && <span style={{ fontSize: 9, fontWeight: 800, color: cfg.text, background: `${cfg.dot}20`, border: `1px solid ${cfg.border}`, borderRadius: 5, padding: '2px 6px', textTransform: 'uppercase', flexShrink: 0 }}>You</span>}
                              {slot.userId === room.hostId && <span style={{ fontSize: 9, fontWeight: 800, color: '#f5c842', background: 'rgba(245,200,66,0.12)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>👑</span>}
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 600, color: cfg.text, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>{color}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: `1px solid ${cfg.dot}20` }}>
                          <span style={{ fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, color: online ? '#4ade80' : '#f87171' }}>
                            <span className={online ? 'animate-pulse-dot' : ''} style={{ width: 6, height: 6, borderRadius: '50%', background: online ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
                            {online ? 'Online' : 'Offline'}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5,
                            padding: '3px 9px', borderRadius: 6,
                            background: ready ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                            color: ready ? '#4ade80' : 'var(--text-muted)',
                            border: `1px solid ${ready ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
                          }}>
                            {ready ? '✓ Ready' : 'Not Ready'}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={color} style={{
                      background: 'rgba(255,255,255,0.015)', border: '1px dashed var(--border)',
                      borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 100,
                    }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: cfg.dot, opacity: 0.35, display: 'block', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Waiting for player...</span>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', gap: 12 }}>
                {mySlot && (
                  <button
                    onClick={handleToggleReady}
                    style={{
                      flex: 1, padding: '12px', fontWeight: 700, fontSize: 14, borderRadius: 14, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                      background: getReady(mySlot) ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.15)',
                      color: getReady(mySlot) ? '#f87171' : '#4ade80',
                      borderWidth: 1, borderStyle: 'solid',
                      borderColor: getReady(mySlot) ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)',
                    }}
                  >
                    {getReady(mySlot) ? '✗ Cancel Ready' : '✓ Mark Ready'}
                  </button>
                )}
                {isHost && (
                  <button
                    onClick={handleLaunchGame}
                    disabled={room.slots.length < 2 || !room.slots.every(s => getReady(s))}
                    className="btn-primary"
                    style={{ flex: 1, padding: 12 }}
                  >
                    🚀 Launch Match
                  </button>
                )}
              </div>
            </div>

            {/* Lobby Chat */}
            <div className="glass-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', height: 500 }}>
              <div className="section-label">Lobby Chat</div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                {chatMessages.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 50, fontStyle: 'italic' }}>
                    Say hello to your opponents! 👋
                  </p>
                )}
                {chatMessages.map((msg, i) => {
                  const isMe = msg.sender === user?.displayName;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', animation: 'slideInUp 0.2s ease-out' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, fontWeight: 600 }}>
                        {isMe ? 'You' : msg.sender}
                      </span>
                      <div className={isMe ? 'chat-bubble-mine' : 'chat-bubble-other'}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text" value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                  placeholder="Type a message..."
                  className="input-field"
                  style={{ fontSize: 13 }}
                />
                <button onClick={handleSendChat} className="btn-primary" style={{ padding: '10px 16px', fontSize: 13, borderRadius: 12 }}>
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ ACTIVE GAME ══ */}
        {(room.status === 'ACTIVE' || room.status === 'COMPLETED') && room.gameState && (
          <div className="game-layout animate-fade-in">

            {/* ── BOARD ── */}
            <div className="game-board-col">
              <Board
                players={room.gameState.players}
                activeColor={room.gameState.activeColor}
                availableMoves={room.gameState.availableMoves || []}
                turnPhase={room.gameState.turnPhase}
                onTokenClick={handleTokenClick}
              />
            </div>

            {/* ── HUD ── */}
            <div className="game-hud-col">

              {/* Active turn card */}
              {room.gameState.activeColor && (() => {
                const ac  = room.gameState!.activeColor!;
                const cfg = CC[ac];
                const ap  = room.gameState!.players[ac];
                const isWaitingForMove = room.gameState!.turnPhase === 'WAITING_FOR_MOVE';
                return (
                  <div style={{
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    borderRadius: 18, padding: '15px 17px',
                    boxShadow: `0 0 24px ${cfg.glow}`,
                    transition: 'all 0.4s ease',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 13,
                        background: `${cfg.dot}20`, border: `2px solid ${cfg.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        boxShadow: `0 0 12px ${cfg.glow}`,
                      }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: cfg.dot, display: 'block' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: cfg.text }}>{ap?.displayName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {getAi(ap) ? '🤖 Bot playing' : getPOnline(ap) ? '👤 Live player' : '⚠️ Offline'}
                        </div>
                      </div>
                      {myColor && (
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '5px 10px', borderRadius: 9,
                          background: isMyTurn
                            ? isWaitingForMove ? 'rgba(74,222,128,0.12)' : 'rgba(250,204,21,0.12)'
                            : 'rgba(255,255,255,0.04)',
                          color: isMyTurn
                            ? isWaitingForMove ? '#4ade80' : '#facc15'
                            : 'var(--text-muted)',
                          border: `1px solid ${isMyTurn
                            ? isWaitingForMove ? 'rgba(74,222,128,0.25)' : 'rgba(250,204,21,0.25)'
                            : 'rgba(255,255,255,0.06)'}`,
                          flexShrink: 0,
                        }}>
                          {isMyTurn
                            ? (isWaitingForMove ? '👆 MOVE' : '🎲 ROLL')
                            : '⌛ WAIT'}
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${(turnTime / (room.settings.turnTimerSeconds ?? 15)) * 100}%`,
                          background: turnTime <= 4 ? 'linear-gradient(90deg,#ef4444,#f97316)' : `linear-gradient(90deg,${cfg.dot},${cfg.text})`,
                          transition: 'width 1s linear',
                        }} />
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 10, color: turnTime <= 4 ? '#f87171' : 'var(--text-muted)', marginTop: 4, fontWeight: 700 }}>
                        {turnTime}s remaining
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Dice */}
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 18, padding: '18px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexWrap: 'wrap',
              }}>
                <Dice
                  value={room.gameState.lastRoll}
                  activeColor={room.gameState.activeColor}
                  isRollable={isMyTurn && room.gameState.turnPhase === 'WAITING_FOR_ROLL'}
                  isRolling={isRolling}
                  onRoll={handleDiceRoll}
                />
                {room.gameState.lastRoll !== null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Rolled</div>
                    <div style={{
                      fontSize: 52, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1,
                      textShadow: room.gameState.lastRoll === 6 ? '0 0 20px rgba(250,204,21,0.6)' : 'none',
                    }}>
                      {room.gameState.lastRoll}
                    </div>
                    {room.gameState.lastRoll === 6 && (
                      <div style={{ fontSize: 11, color: '#facc15', fontWeight: 800, marginTop: 3 }}>🎉 Bonus!</div>
                    )}
                  </div>
                )}
              </div>

              {/* Players list */}
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 18, padding: '14px 16px',
              }}>
                <div className="section-label">Players</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(Object.values(room.gameState.players) as PlayerState[]).map(p => p && (
                    <PlayerCard
                      key={p.color}
                      color={p.color}
                      name={p.displayName}
                      isAi={getAi(p)}
                      isOnline={getPOnline(p)}
                      isActive={room.gameState!.activeColor === p.color}
                      tokensHome={tokensAtHome(p.color)}
                    />
                  ))}
                </div>
              </div>

              {/* Chat / Log tabs */}
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 18, padding: '12px 16px',
                display: 'flex', flexDirection: 'column',
                minHeight: 220,
              }}>
                {/* Tab switcher */}
                <div style={{ display: 'flex', gap: 2, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                  {(['log', 'chat'] as const).map(panel => (
                    <button
                      key={panel}
                      onClick={() => setActivePanel(panel)}
                      style={{
                        padding: '4px 12px', fontSize: 11, fontWeight: 700, border: 'none',
                        borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', textTransform: 'uppercase', letterSpacing: 0.5,
                        background: activePanel === panel ? 'rgba(139,92,246,0.15)' : 'transparent',
                        color: activePanel === panel ? '#a78bfa' : 'var(--text-muted)',
                      }}
                    >
                      {panel === 'log' ? '📋 Log' : '💬 Chat'}
                      {panel === 'chat' && chatMessages.length > 0 && (
                        <span style={{
                          marginLeft: 5, background: 'var(--accent-violet)', color: '#fff',
                          borderRadius: 10, padding: '1px 5px', fontSize: 9, fontWeight: 900,
                        }}>
                          {chatMessages.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Log panel */}
                {activePanel === 'log' && (
                  <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
                    {logs.map((log, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, paddingBottom: 4, paddingTop: 3, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ opacity: 0.3, flexShrink: 0, fontSize: 10 }}>[{i + 1}]</span>
                        <span style={{ color: log.startsWith('🏆') ? '#facc15' : log.startsWith('🎲') ? '#a78bfa' : 'var(--text-muted)' }}>{log}</span>
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                )}

                {/* Chat panel */}
                {activePanel === 'chat' && (
                  <>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                      {chatMessages.length === 0 && (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, marginTop: 30, fontStyle: 'italic' }}>
                          No messages yet
                        </p>
                      )}
                      {chatMessages.map((msg, i) => {
                        const isMe = msg.sender === user?.displayName;
                        return (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                            <span style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2, fontWeight: 600 }}>{isMe ? 'You' : msg.sender}</span>
                            <div className={isMe ? 'chat-bubble-mine' : 'chat-bubble-other'} style={{ fontSize: 12, padding: '6px 12px' }}>
                              {msg.content}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>
                    <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                      <input
                        type="text" value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                        placeholder="Message..."
                        className="input-field"
                        style={{ fontSize: 13, padding: '8px 12px' }}
                      />
                      <button onClick={handleSendChat} className="btn-primary" style={{ padding: '8px 14px', fontSize: 13, borderRadius: 11, flexShrink: 0 }}>
                        →
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ VICTORY MODAL ══ */}
      {room.status === 'COMPLETED' && room.gameState?.winnerColor && (() => {
        const wColor = room.gameState!.winnerColor!;
        const cfg    = CC[wColor];
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(7,8,13,0.9)', backdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }} className="animate-fade-in-scale">
            <div className="glass-card" style={{
              maxWidth: 460, width: '100%',
              padding: '48px 40px',
              textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
              borderTop: `3px solid ${cfg.dot}`,
              boxShadow: `0 0 80px ${cfg.glow}, 0 0 0 1px ${cfg.border}, 0 30px 60px rgba(0,0,0,0.7)`,
            }}>
              <div style={{
                width: 92, height: 92, borderRadius: '50%', background: cfg.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44,
                border: `3px solid ${cfg.border}`, boxShadow: `0 0 60px ${cfg.glow}`,
              }} className="animate-float">🏆</div>

              <div>
                <h2 className="font-game text-gold" style={{ fontSize: 44, fontWeight: 700, letterSpacing: 3, marginBottom: 10 }}>
                  VICTORY!
                </h2>
                <p style={{ fontSize: 20, color: cfg.text, fontWeight: 700 }}>
                  {room.gameState!.players[wColor]?.displayName} wins!
                </p>
              </div>

              {/* MMR changes */}
              <div style={{
                width: '100%', background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px',
              }}>
                <div className="section-label">MMR Changes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {room.slots.map(s => {
                    const won = s.color === room.gameState?.winnerColor;
                    return (
                      <div key={s.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: CC[s.color].dot, display: 'block' }} />
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.displayName}</span>
                        </div>
                        <span style={{ fontWeight: 900, fontSize: 13, fontFamily: 'monospace', color: won ? '#4ade80' : '#f87171' }}>
                          {won ? '+32' : '-16'} MMR
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <button onClick={() => navigate('/')} className="btn-secondary" style={{ flex: 1, padding: 14, fontSize: 14 }}>
                  ← Dashboard
                </button>
                <button onClick={() => window.location.reload()} className="btn-primary" style={{ flex: 1, padding: 14, fontSize: 14 }}>
                  🔄 New Game
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
