/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../services/api';

interface UserStats {
  ratingMmr: number;
  rankTier: string;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
  totalKills: number;
  totalDeaths: number;
}

interface MatchHistoryPlayer {
  displayName: string;
  playerColor: string;
  rankPosition: number;
}

interface MatchHistoryItem {
  matchId: string;
  roomCode: string;
  startTime: string;
  endTime: string;
  winnerName: string;
  userColor: string;
  userRank: number;
  kills: number;
  deaths: number;
  mmrChange: number;
  players: MatchHistoryPlayer[];
}

interface LeaderboardUser {
  id: string;
  email: string;
  displayName: string;
  ratingMmr: number;
}

interface PaginatedLeaderboard {
  content: LeaderboardUser[];
  totalPages: number;
  totalElements: number;
  number: number;
}

const COLOR_DOT: Record<string, string> = {
  RED: '#ef4444', GREEN: '#22c55e', YELLOW: '#eab308', BLUE: '#3b82f6',
};

const TIER_INFO = (mmr: number): { label: string; cls: string } => {
  if (mmr >= 2600) return { label: 'Master', cls: 'rank-master' };
  if (mmr >= 2200) return { label: mmr < 2300 ? 'Diamond IV' : mmr < 2400 ? 'Diamond III' : mmr < 2500 ? 'Diamond II' : 'Diamond I', cls: 'rank-diamond' };
  if (mmr >= 1800) return { label: mmr < 1900 ? 'Platinum IV' : mmr < 2000 ? 'Platinum III' : mmr < 2100 ? 'Platinum II' : 'Platinum I', cls: 'rank-platinum' };
  if (mmr >= 1400) return { label: mmr < 1500 ? 'Gold IV' : mmr < 1600 ? 'Gold III' : mmr < 1700 ? 'Gold II' : 'Gold I', cls: 'rank-gold' };
  if (mmr >= 1000) return { label: mmr < 1100 ? 'Silver IV' : mmr < 1200 ? 'Silver III' : mmr < 1300 ? 'Silver II' : 'Silver I', cls: 'rank-silver' };
  return { label: mmr < 250 ? 'Bronze IV' : mmr < 500 ? 'Bronze III' : mmr < 750 ? 'Bronze II' : 'Bronze I', cls: 'rank-bronze' };
};

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { isConnected, connect, disconnect } = useWebSocket();

  const [activeTab, setActiveTab] = useState<'play' | 'leaderboard' | 'history' | 'stats'>('play');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [leaderboardPage, setLeaderboardPage] = useState(0);
  const [leaderboardTotalPages, setLeaderboardTotalPages] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const [showOnlineOptions, setShowOnlineOptions] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [settingsMaxPlayers, setSettingsMaxPlayers] = useState(4);
  const [creatingRoom, setCreatingRoom] = useState(false);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const r = await api.get('/users/me/stats');
      setStats(r.data);
    } catch { /* silent */ } finally { setLoadingStats(false); }
  };

  const fetchMatches = async () => {
    setLoadingMatches(true);
    try {
      const r = await api.get('/users/me/matches');
      setMatches(r.data);
    } catch { /* silent */ } finally { setLoadingMatches(false); }
  };

  const fetchLeaderboard = async (page: number) => {
    setLoadingLeaderboard(true);
    try {
      const r = await api.get(`/leaderboard?page=${page}&size=10`);
      const d: PaginatedLeaderboard = r.data;
      setLeaderboard(d.content);
      setLeaderboardTotalPages(d.totalPages);
      setLeaderboardPage(d.number);
    } catch { /* silent */ } finally { setLoadingLeaderboard(false); }
  };

  useEffect(() => { connect(); return () => { disconnect(); }; }, [connect, disconnect]);
  useEffect(() => { fetchStats(); }, []);
  useEffect(() => {
    if (activeTab === 'history') fetchMatches();
    else if (activeTab === 'leaderboard') fetchLeaderboard(leaderboardPage);
    else if (activeTab === 'stats') fetchStats();
  }, [activeTab, leaderboardPage]);

  const handleCreateRoom = async () => {
    setCreatingRoom(true); setJoinError('');
    try {
      const r = await api.post('/rooms', {
        maxPlayers: settingsMaxPlayers,
        turnTimerSeconds: 15,
        killRequiredToEnterHome: true,
      });
      navigate(`/game/online/${r.data.roomCode}`);
    } catch { setJoinError('Failed to create room.'); } finally { setCreatingRoom(false); }
  };

  const handleJoinRoom = async () => {
    if (joinCode.length !== 6) { setJoinError('Code must be exactly 6 characters.'); return; }
    setJoinError('');
    try {
      await api.get(`/rooms/${joinCode.toUpperCase()}`);
      navigate(`/game/online/${joinCode.toUpperCase()}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setJoinError('Room not found. Check your code.');
      } else {
        setJoinError('Failed to join room.');
      }
    }
  };

  const mmr = stats?.ratingMmr ?? user?.ratingMmr ?? 1200;
  const tier = TIER_INFO(mmr);

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'play', label: '🎮 Play' },
    { key: 'leaderboard', label: '🏆 Leaderboard' },
    { key: 'history', label: '📜 History' },
    { key: 'stats', label: '📊 Stats' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs */}
      <div className="glow-orb" style={{ width: 600, height: 600, background: 'rgba(99,102,241,0.06)', top: -100, left: '10%' }} />
      <div className="glow-orb" style={{ width: 500, height: 500, background: 'rgba(139,92,246,0.05)', bottom: -100, right: '5%' }} />
      <div className="glow-orb" style={{ width: 300, height: 300, background: 'rgba(245,200,66,0.03)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />

      {/* ── TOP NAV ── */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(7,8,13,0.85)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38,
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(139,92,246,0.3)',
            }}>
              <span className="font-game" style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>L</span>
            </div>
            <span className="font-game text-shimmer" style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>LUDO ARENA</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.displayName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
            <button
              onClick={async () => { await logout(); navigate('/login'); }}
              className="btn-secondary"
              style={{ padding: '7px 16px', fontSize: 12 }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', position: 'relative', zIndex: 10 }}>

        {/* ── PROFILE CARD ── */}
        <section style={{ marginBottom: 32 }}>
          <div className="glass-card" style={{ padding: '28px 32px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                width: 68, height: 68,
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                borderRadius: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, fontWeight: 900, color: '#fff',
                boxShadow: '0 0 30px rgba(139,92,246,0.3)',
                flexShrink: 0,
              }}>
                {user?.displayName?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Welcome back, <span style={{ color: 'var(--accent-violet)' }}>{user?.displayName}</span>!
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Ready to dominate the board? Your next match awaits.
                </p>
              </div>
            </div>

            {/* MMR + Rank + Connection */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{
                background: 'rgba(245,200,66,0.08)',
                border: '1px solid rgba(245,200,66,0.2)',
                borderRadius: 14, padding: '12px 20px', textAlign: 'center', minWidth: 100,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(245,200,66,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>MMR</div>
                <div className="text-gold" style={{ fontSize: 24, fontWeight: 900 }}>{loadingStats ? '···' : mmr}</div>
              </div>
              <div style={{
                background: 'rgba(139,92,246,0.08)',
                border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: 14, padding: '12px 20px', textAlign: 'center', minWidth: 120,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(139,92,246,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Rank</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-violet)' }}>{loadingStats ? '···' : (stats?.rankTier ?? tier.label)}</div>
              </div>
              {/* WebSocket status */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: isConnected ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${isConnected ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: 12, padding: '8px 14px',
              }}>
                <div
                  className={isConnected ? 'animate-pulse-dot' : ''}
                  style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#22c55e' : '#ef4444' }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: isConnected ? '#4ade80' : '#f87171', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── TABS ── */}
        <div className="tab-bar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── PLAY TAB ── */}
        {activeTab === 'play' && (
          <div className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: 24 }}>

              {/* Local Game Card */}
              <div className="glass-card" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'rgba(139,92,246,0.12)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                }}>🎲</div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Local Pass & Play</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Play offline with friends or against AI bots. No internet required. Perfect for 2–4 players sharing a screen.
                  </p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['2–4 Players', 'AI Bots', 'No Login Needed'].map(f => (
                    <span key={f} style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa' }}>{f}</span>
                  ))}
                </div>
                <Link
                  to="/game"
                  className="btn-primary"
                  style={{ textDecoration: 'none', textAlign: 'center', padding: '14px' }}
                >
                  Start Local Game
                </Link>
              </div>

              {/* Online Multiplayer Card */}
              <div className="glass-card" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {!showOnlineOptions ? (
                  <>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: 'rgba(245,200,66,0.1)',
                      border: '1px solid rgba(245,200,66,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                    }}>🌐</div>
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Online Multiplayer</h2>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        Compete in real-time matches with players worldwide. Earn MMR, climb the leaderboard, and track your match history.
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {['Real-Time', 'MMR Ranked', 'Global Leaderboard'].map(f => (
                        <span key={f} style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)', color: '#f5c842' }}>{f}</span>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowOnlineOptions(true)}
                      style={{
                        background: 'linear-gradient(135deg, rgba(245,200,66,0.15), rgba(245,200,66,0.08))',
                        border: '1px solid rgba(245,200,66,0.3)',
                        color: '#f5c842',
                        fontWeight: 700, fontSize: 14, padding: '14px',
                        borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = 'rgba(245,200,66,0.2)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,200,66,0.15), rgba(245,200,66,0.08))')}
                    >
                      Enter Online Arena
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Online Arena Setup</h2>
                      <button onClick={() => setShowOnlineOptions(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>← Back</button>
                    </div>

                    {/* Create Room */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Host Private Match</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Max Players:</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[2, 3, 4].map(n => (
                            <button
                              key={n}
                              onClick={() => setSettingsMaxPlayers(n)}
                              style={{
                                width: 36, height: 36, borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                                background: settingsMaxPlayers === n ? 'var(--accent-violet)' : 'rgba(255,255,255,0.04)',
                                color: settingsMaxPlayers === n ? '#fff' : 'var(--text-muted)',
                                boxShadow: settingsMaxPlayers === n ? '0 0 15px rgba(139,92,246,0.4)' : 'none',
                              }}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={handleCreateRoom}
                        disabled={creatingRoom}
                        className="btn-primary"
                        style={{ width: '100%', padding: '12px' }}
                      >
                        {creatingRoom ? 'Creating Room...' : '🚀 Host Room'}
                      </button>
                    </div>

                    {/* Join Room */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Join with Invite Code</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          maxLength={6}
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          placeholder="XXXXXX"
                          className="input-field"
                          style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 18, fontWeight: 800, letterSpacing: 6, flex: 1 }}
                        />
                        <button
                          onClick={handleJoinRoom}
                          className="btn-secondary"
                          style={{ padding: '0 20px', fontWeight: 700, whiteSpace: 'nowrap' }}
                        >
                          Join
                        </button>
                      </div>
                    </div>

                    {joinError && (
                      <div style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#f87171', textAlign: 'center',
                      }}>
                        ⚠️ {joinError}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="glass-card" style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 16, alignItems: 'center' }}>
              {[
                { label: 'Matches', value: loadingStats ? null : String(stats?.matchesPlayed ?? 0), icon: '🎮' },
                { label: 'Victories', value: loadingStats ? null : String(stats?.matchesWon ?? 0), icon: '🏆' },
                { label: 'Win Rate', value: loadingStats ? null : `${(stats?.winRate ?? 0).toFixed(1)}%`, icon: '📈' },
                { label: 'Token Kills', value: loadingStats ? null : String(stats?.totalKills ?? 0), icon: '💥' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '8px 0' }}>
                  {s.value === null ? (
                    <>
                      <div className="skeleton" style={{ width: 48, height: 28, margin: '0 auto 6px' }} />
                      <div className="skeleton" style={{ width: 60, height: 11, margin: '0 auto' }} />
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{s.label}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {activeTab === 'leaderboard' && (
          <section className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Global Leaderboard</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Top-ranked competitors by MMR worldwide</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 14px' }}>
                Page {leaderboardPage + 1} / {Math.max(1, leaderboardTotalPages)}
              </span>
            </div>

            {loadingLeaderboard ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(139,92,246,0.2)', borderTopColor: 'var(--accent-violet)', borderRadius: '50%' }} className="animate-spin" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="glass-card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                No rankings available yet. Play some online matches!
              </div>
            ) : (
              <div className="glass-card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Rank', 'Player', 'MMR', 'Division'].map(h => (
                        <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, textAlign: h === 'Player' ? 'left' : 'center', background: 'rgba(255,255,255,0.02)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((item, index) => {
                      const rank = leaderboardPage * 10 + index + 1;
                      const isMe = item.id === user?.id;
                      const t = TIER_INFO(item.ratingMmr);
                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: isMe ? 'rgba(139,92,246,0.06)' : index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                            transition: 'background 0.15s',
                          }}
                        >
                          <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 30, height: 30, borderRadius: 8, fontWeight: 900, fontSize: 13,
                              background: rank === 1 ? 'rgba(245,200,66,0.15)' : rank === 2 ? 'rgba(192,192,192,0.1)' : rank === 3 ? 'rgba(180,100,50,0.12)' : 'rgba(255,255,255,0.04)',
                              color: rank === 1 ? '#f5c842' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : 'var(--text-muted)',
                              border: `1px solid ${rank === 1 ? 'rgba(245,200,66,0.3)' : rank === 2 ? 'rgba(192,192,192,0.2)' : rank === 3 ? 'rgba(180,100,50,0.25)' : 'var(--border)'}`,
                            }}>{rank}</span>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: 10,
                                background: isMe ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: 12, color: isMe ? '#a78bfa' : 'var(--text-secondary)',
                              }}>
                                {item.displayName.slice(0, 2).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: isMe ? 800 : 500, color: isMe ? '#a78bfa' : 'var(--text-primary)', fontSize: 14 }}>
                                {item.displayName}
                              </span>
                              {isMe && <span style={{ fontSize: 10, fontWeight: 800, color: '#a78bfa', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 6, padding: '2px 7px', letterSpacing: 1, textTransform: 'uppercase' }}>YOU</span>}
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, fontSize: 15, color: 'var(--text-primary)' }}>{item.ratingMmr}</td>
                          <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                            <span className={t.cls} style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid' }}>
                              {t.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {leaderboardTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
                    <button
                      onClick={() => setLeaderboardPage(p => Math.max(0, p - 1))}
                      disabled={leaderboardPage === 0}
                      className="btn-secondary"
                      style={{ fontSize: 12, padding: '8px 16px' }}
                    >← Previous</button>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {leaderboardPage + 1} of {leaderboardTotalPages}</span>
                    <button
                      onClick={() => setLeaderboardPage(p => Math.min(leaderboardTotalPages - 1, p + 1))}
                      disabled={leaderboardPage === leaderboardTotalPages - 1}
                      className="btn-secondary"
                      style={{ fontSize: 12, padding: '8px 16px' }}
                    >Next →</button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <section className="animate-fade-in">
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Match History</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your completed online matches</p>
            </div>

            {loadingMatches ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(139,92,246,0.2)', borderTopColor: 'var(--accent-violet)', borderRadius: '50%' }} className="animate-spin" />
              </div>
            ) : matches.length === 0 ? (
              <div className="glass-card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                No matches recorded yet. Create or join an online room to start!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {matches.map((match) => {
                  const isWin = match.userRank === 1;
                  const dateStr = new Date(match.endTime || match.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                  const dotColor = COLOR_DOT[match.userColor] ?? '#8892b0';
                  return (
                    <div
                      key={match.matchId}
                      className="glass-card"
                      style={{
                        padding: '20px 24px',
                        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16,
                        borderLeft: `3px solid ${isWin ? '#22c55e' : '#ef4444'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 240 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12, fontWeight: 900, fontSize: 11,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', textTransform: 'uppercase',
                          background: isWin ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                          color: isWin ? '#4ade80' : '#f87171',
                          border: `1px solid ${isWin ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}`,
                          flexShrink: 0,
                        }}>{isWin ? '🏆' : `#${match.userRank}`}</div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: isWin ? '#4ade80' : 'var(--text-primary)', marginBottom: 2 }}>
                            {isWin ? 'Victory' : `Defeat — Rank #${match.userRank}`}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span>{dateStr}</span>
                            <span style={{ padding: '1px 7px', background: 'rgba(255,255,255,0.04)', borderRadius: 5, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-secondary)' }}>#{match.roomCode}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
                              {match.userColor}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                          fontWeight: 900, fontSize: 14, fontFamily: 'monospace', padding: '6px 14px', borderRadius: 10,
                          background: (match.mmrChange ?? 0) >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          color: (match.mmrChange ?? 0) >= 0 ? '#4ade80' : '#f87171',
                          border: `1px solid ${(match.mmrChange ?? 0) >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        }}>
                          {(match.mmrChange ?? 0) >= 0 ? '+' : ''}{match.mmrChange ?? 0} MMR
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {match.players?.map((p, i) => (
                            <span key={i} style={{
                              fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              background: p.displayName === user?.displayName ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${p.displayName === user?.displayName ? 'rgba(139,92,246,0.25)' : 'var(--border)'}`,
                              color: p.displayName === user?.displayName ? '#a78bfa' : 'var(--text-muted)',
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLOR_DOT[p.playerColor] ?? '#8892b0', display: 'inline-block' }} />
                              {p.displayName} <span style={{ opacity: 0.6 }}>#{p.rankPosition}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── STATS TAB ── */}
        {activeTab === 'stats' && (
          <section className="animate-fade-in">
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Career Statistics</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your all-time performance breakdown</p>
            </div>
            {loadingStats ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(139,92,246,0.2)', borderTopColor: 'var(--accent-violet)', borderRadius: '50%' }} className="animate-spin" />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Rating MMR', value: String(stats?.ratingMmr ?? mmr), color: '#f5c842', icon: '⚡' },
                  { label: 'Rank Division', value: stats?.rankTier ?? tier.label, color: '#a78bfa', icon: '🏅' },
                  { label: 'Matches Played', value: String(stats?.matchesPlayed ?? 0), color: '#60a5fa', icon: '🎮' },
                  { label: 'Victories', value: String(stats?.matchesWon ?? 0), color: '#4ade80', icon: '🏆' },
                  { label: 'Win Rate', value: `${(stats?.winRate ?? 0).toFixed(1)}%`, color: '#34d399', icon: '📈' },
                  { label: 'Token Kills', value: String(stats?.totalKills ?? 0), color: '#f87171', icon: '💥' },
                  { label: 'Deaths', value: String(stats?.totalDeaths ?? 0), color: '#94a3b8', icon: '💀' },
                ].map(s => (
                  <div
                    key={s.label}
                    className="glass-card"
                    style={{ padding: '24px 20px', textAlign: 'center', borderTop: `2px solid ${s.color}33` }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: s.color, marginBottom: 6 }}>{s.value}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};
