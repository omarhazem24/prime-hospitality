import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AuthShell } from './SignInPage';
import { useAuth } from '../context/AuthContext';

export default function SignUpPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await signUp({ name, email, password });
      navigate('/account');
    } catch (err) {
      setError(err.message || 'Sign up failed');
    }
  }

  return (
    <AuthShell title="Join Prime" subtitle="Save stays, track requests, and book faster next time.">
      <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-prime-ink lg:hidden">
        Sign up
      </h2>
      <form onSubmit={onSubmit} className="mt-5 space-y-4 lg:mt-0">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prime-muted">
            Name
          </span>
          <input required className="prime-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prime-muted">
            Email
          </span>
          <input
            required
            type="email"
            className="prime-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prime-muted">
            Password
          </span>
          <input
            required
            type="password"
            minLength={6}
            className="prime-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className="prime-btn w-full">
          Create account
        </button>
      </form>
      <p className="mt-5 text-sm text-prime-muted">
        Already have an account?{' '}
        <Link to="/sign-in" className="font-medium text-prime-ink underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
