import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import KeyLine from '../components/ui/KeyLine';
import { useAuth } from '../context/AuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { brand } from '../theme/brand';

export function AuthShell({ title, subtitle, children }) {
  return (
    <div>
      <Header />
      <main className="mx-auto grid min-h-[80vh] max-w-prime items-center gap-12 px-5 py-24 sm:px-8 md:py-28 lg:grid-cols-2 lg:gap-16">
        <div className="hidden lg:block">
          <img src={brand.logo} alt={brand.name} className="h-16 w-auto object-contain brightness-0 dark:brightness-0 dark:invert" />
          <h1 className="mt-10 font-display text-display-lg text-prime-ink">{title}</h1>
          <KeyLine className="mt-6 max-w-[5.5rem]" />
          <p className="mt-5 max-w-md text-sm font-medium leading-relaxed text-prime-muted md:text-base">
            {subtitle}
          </p>
        </div>
        <div className="border border-prime-line bg-white p-6 sm:p-8">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

export default function SignInPage() {
  const { signIn, user } = useAuth();
  const { login: adminLogin, isAdmin, loading: adminLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!adminLoading && isAdmin) return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/account" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      // Admin credentials open the CMS; otherwise treat as guest sign-in.
      try {
        await adminLogin({ email, password });
        navigate('/admin', { replace: true });
        return;
      } catch {
        /* not admin — fall through to guest */
      }
      await signIn({ email, password });
      navigate('/account', { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage bookings and your wishlist.">
      <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-prime-ink lg:hidden">
        Sign in
      </h2>
      <form onSubmit={onSubmit} className="mt-5 space-y-4 lg:mt-0">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prime-muted">
            Email
          </span>
          <input
            required
            type="email"
            autoComplete="email"
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
            autoComplete="current-password"
            className="prime-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy} className="prime-btn w-full disabled:opacity-60">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-5 text-sm text-prime-muted">
        <Link to="/forgot-password" className="underline-offset-4 hover:underline">
          Forgot password?
        </Link>
      </p>
      <p className="mt-2 text-sm text-prime-muted">
        New here?{' '}
        <Link to="/sign-up" className="font-medium text-prime-ink underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
