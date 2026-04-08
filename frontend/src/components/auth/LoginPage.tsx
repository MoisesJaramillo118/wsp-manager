import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Credenciales incorrectas';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #2d0a1e 0%, #4a1942 40%, #831843 100%)',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 420, width: '100%', padding: '0 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', margin: 0,
            fontFamily: "'Poppins', sans-serif",
          }}>
            Clemencia Brand
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(249,168,212,0.6)', marginTop: 4 }}>
            WhatsApp Manager
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.15)',
              borderRadius: 8, padding: '12px 14px', fontSize: 14, color: '#fff',
              outline: 'none', fontFamily: "'Poppins', sans-serif",
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#f472b6')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
          />
          <input
            type="password"
            placeholder="Contrasena"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.15)',
              borderRadius: 8, padding: '12px 14px', fontSize: 14, color: '#fff',
              outline: 'none', fontFamily: "'Poppins', sans-serif",
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#f472b6')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
          />

          {error && (
            <p style={{ fontSize: 13, color: '#fca5a5', margin: 0, textAlign: 'left' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #ec4899, #db2777)',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '12px 0', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontFamily: "'Poppins', sans-serif",
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p style={{ fontSize: 11, color: 'rgba(249,168,212,0.3)', marginTop: 24 }}>
          Clemencia Brand &copy; 2026 &middot; Gamarra, Lima
        </p>
      </div>
    </div>
  );
};
