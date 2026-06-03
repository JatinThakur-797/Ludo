import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError((err as Error).message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="noise"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        padding: '16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background orbs */}
      <div className="glow-orb" style={{ width: 500, height: 500, background: 'rgba(99,102,241,0.08)', top: '-100px', left: '-100px' }} />
      <div className="glow-orb" style={{ width: 400, height: 400, background: 'rgba(139,92,246,0.06)', bottom: '-80px', right: '-80px' }} />
      <div className="glow-orb" style={{ width: 200, height: 200, background: 'rgba(245,200,66,0.04)', top: '40%', right: '20%' }} />

      <div
        className="glass-card animate-fade-in-scale"
        style={{ width: '100%', maxWidth: 420, padding: '40px 36px', position: 'relative', zIndex: 10 }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
          <div
            className="animate-float"
            style={{
              width: 72, height: 72,
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              borderRadius: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(139,92,246,0.4), 0 0 80px rgba(139,92,246,0.15)',
              marginBottom: 20,
            }}
          >
            <span className="font-game" style={{ fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1 }}>L</span>
          </div>
          <h1 className="font-game" style={{ fontSize: 32, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
            <span className="text-shimmer">LUDO ARENA</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
            Sign in to your account to play and compete
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#f87171',
              fontSize: 13,
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="input-field"
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 15, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            {loading ? (
              <>
                <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" />
                Signing in...
              </>
            ) : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              style={{ color: 'var(--accent-violet)', fontWeight: 600, textDecoration: 'none' }}
            >
              Create one
            </Link>
          </p>

          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <Link
            to="/game"
            className="btn-secondary"
            style={{ fontSize: 12, textDecoration: 'none', textAlign: 'center', width: '100%' }}
          >
            🎲 Play Offline — No Account Required
          </Link>
        </div>
      </div>
    </div>
  );
};
