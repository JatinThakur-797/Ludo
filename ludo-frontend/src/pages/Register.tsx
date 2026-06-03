import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export const Register: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await signup(email, password, displayName);
      navigate('/');
    } catch (err: unknown) {
      setError((err as Error).message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {};

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
      <div className="glow-orb" style={{ width: 500, height: 500, background: 'rgba(99,102,241,0.08)', top: '-120px', right: '-100px' }} />
      <div className="glow-orb" style={{ width: 300, height: 300, background: 'rgba(245,200,66,0.05)', bottom: '10%', left: '-50px' }} />

      <div
        className="glass-card animate-fade-in-scale"
        style={{ width: '100%', maxWidth: 440, padding: '40px 36px', position: 'relative', zIndex: 10 }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 64, height: 64,
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 32px rgba(139,92,246,0.35)',
              marginBottom: 18,
            }}
          >
            <span className="font-game" style={{ fontSize: 30, fontWeight: 700, color: '#fff' }}>L</span>
          </div>
          <h1 className="font-game" style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
            <span className="text-shimmer">JOIN LUDO ARENA</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Create your account and start competing</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10, color: '#f87171', fontSize: 13,
          }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { id: 'reg-name',     label: 'Display Name',    type: 'text',     val: displayName,     set: setDisplayName,     ph: 'e.g. LudoKing' },
            { id: 'reg-email',    label: 'Email Address',   type: 'email',    val: email,           set: setEmail,           ph: 'name@example.com' },
            { id: 'reg-pass',     label: 'Password',        type: 'password', val: password,        set: setPassword,        ph: '•••••••• (min 6 chars)' },
            { id: 'reg-confirm',  label: 'Confirm Password',type: 'password', val: confirmPassword, set: setConfirmPassword,  ph: '••••••••' },
          ].map(({ id, label, type, val, set, ph }) => (
            <div key={id} style={inputStyle}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 7 }}>{label}</label>
              <input
                id={id}
                type={type}
                value={val}
                onChange={(e) => set(e.target.value)}
                required
                placeholder={ph}
                className="input-field"
              />
            </div>
          ))}

          <button
            id="register-submit"
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 15, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            {loading ? (
              <>
                <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" />
                Creating account...
              </>
            ) : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent-violet)', fontWeight: 600, textDecoration: 'none' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
