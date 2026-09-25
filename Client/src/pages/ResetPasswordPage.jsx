import { Link } from 'react-router-dom';
import { useState } from 'react';
import { AuthShell } from './SignInPage';

export default function ResetPasswordPage() {
  const [done, setDone] = useState(false);

  function onSubmit(e) {
    e.preventDefault();
    setDone(true);
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Shell page — connect to auth API later.">
      {done ? (
        <div>
          <p className="text-sm font-medium text-prime-ink">Password updated (mock).</p>
          <Link to="/sign-in" className="prime-btn mt-6 inline-flex">
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prime-muted">
              New password
            </span>
            <input required type="password" minLength={6} className="prime-input" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prime-muted">
              Confirm
            </span>
            <input required type="password" minLength={6} className="prime-input" />
          </label>
          <button type="submit" className="prime-btn w-full">
            Update password
          </button>
        </form>
      )}
    </AuthShell>
  );
}
