import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { supabase } from '../lib/supabaseClient';

export function Login() {
  const signIn = useGameStore((s) => s.signIn);
  const authError = useGameStore((s) => s.authError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [signup, setSignup] = useState(false);
  const [player, setPlayer] = useState<'mohanad' | 'hasabo'>('hasabo');
  const [signupError, setSignupError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSignupError(null);
    if (signup) {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { player } },
      });
      if (error) setSignupError(error.message);
    } else {
      await signIn(email.trim(), password);
    }
    setSubmitting(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) return;
    await supabase.auth.resetPasswordForEmail(email.trim());
    setResetSent(true);
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 p-6">
      <div>
        <h1 className="glow-text text-center text-3xl font-black text-neon">QUEST DUO</h1>
        <p className="mt-1 text-center text-sm text-neutral-500">Enter the realm</p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <div className="glow rounded-2xl border border-panel-border bg-panel p-4">
          <label className="mb-1 block text-xs text-neutral-400">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-panel-border bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-neon"
            placeholder="you@questduo.app"
          />
        </div>

        <div className="glow rounded-2xl border border-panel-border bg-panel p-4">
          <label className="mb-1 block text-xs text-neutral-400">Password</label>
          <input
            type="password"
            required
            autoComplete={signup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-panel-border bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-neon"
            placeholder="••••••••"
          />
        </div>

        {signup && (
          <div className="glow rounded-2xl border border-panel-border bg-panel p-4">
            <label className="mb-1 block text-xs text-neutral-400">Player</label>
            <div className="flex gap-2">
              {(['mohanad', 'hasabo'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlayer(p)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-bold uppercase ${player === p ? 'border-neon text-neon' : 'border-panel-border text-neutral-500'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {(authError || signupError) && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {signup ? signupError : authError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="glow rounded-2xl border border-neon bg-neon/10 py-3 text-center font-bold text-neon transition active:scale-95 disabled:opacity-50"
        >
          {submitting ? 'Entering…' : signup ? 'Create Account' : 'Enter the Realm'}
        </button>

        <button
          type="button"
          onClick={() => setSignup((v) => !v)}
          className="text-center text-xs text-neutral-400 underline underline-offset-2"
        >
          {signup ? 'Have an account? Sign in' : 'New here? Create account'}
        </button>

        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-center text-xs text-neutral-500 underline underline-offset-2"
        >
          {resetSent ? 'Reset email sent — check your inbox' : 'Forgot password?'}
        </button>
      </form>
    </div>
  );
}
