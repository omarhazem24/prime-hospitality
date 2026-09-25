import { Link } from 'react-router-dom';
import { useState } from 'react';
import { AuthShell } from './SignInPage';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');

  function onSubmit(e) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <AuthShell title="Reset password" subtitle="We'll email you a reset link when auth is wired to the PMS.">
      {sent ? (
        <div>
          <p className="text-sm font-medium leading-relaxed text-prime-ink">
            If an account exists for {email}, a reset link will be sent.
          </p>
          <Link to="/sign-in" className="prime-btn mt-6 inline-flex">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
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
          <button type="submit" className="prime-btn w-full">
            Send reset link
          </button>
        </form>
      )}
    </AuthShell>
  );
}
