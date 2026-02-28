'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type Mode = 'signin' | 'signup' | 'magic';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        setMessage('Check your email for the magic link!');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check your email to confirm your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: 80 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24, fontSize: 28, fontWeight: 700 }}>Poli</h1>
      <div className="card">
        <div className="tab-bar" style={{ marginBottom: 20 }}>
          <div className={`tab ${mode === 'signin' ? 'active' : ''}`} onClick={() => setMode('signin')}>
            Sign In
          </div>
          <div className={`tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')}>
            Sign Up
          </div>
          <div className={`tab ${mode === 'magic' ? 'active' : ''}`} onClick={() => setMode('magic')}>
            Magic Link
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {mode !== 'magic' && (
            <>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </>
          )}

          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
          {message && <p style={{ color: 'var(--success)', fontSize: 14, marginBottom: 12 }}>{message}</p>}

          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? 'Loading...' : mode === 'signup' ? 'Create Account' : mode === 'magic' ? 'Send Magic Link' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p className="muted" style={{ fontSize: 14, marginBottom: 12 }}>Or continue with</p>
          <div className="flex gap-2 justify-center">
            <button className="btn btn-outline btn-sm" onClick={() => handleOAuth('google')}>
              Google
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => handleOAuth('apple')}>
              Apple
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
