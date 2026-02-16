'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const err = await register(username, email, password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="grimoire-border bg-card/90 p-8">
          <div className="grimoire-corners">
            <div className="text-center mb-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary text-xl font-heading font-bold arcane-glow">
                &#x2726;
              </div>
              <h1 className="mt-4 font-heading text-2xl font-bold tracking-wide text-grimoire">Forge Your Sigil</h1>
              <p className="mt-2 text-sm text-muted-foreground italic">
                Create your identity within the grimoire
              </p>
            </div>

            <div className="grimoire-divider mb-6" />

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="username" className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-lg border border-border bg-background/80 px-3 py-2.5 text-sm outline-none transition-all focus:border-primary/60 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(180,140,50,0.1)]"
                  placeholder="Choose a username"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-background/80 px-3 py-2.5 text-sm outline-none transition-all focus:border-primary/60 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(180,140,50,0.1)]"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-background/80 px-3 py-2.5 text-sm outline-none transition-all focus:border-primary/60 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(180,140,50,0.1)]"
                  placeholder="At least 8 characters"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-background/80 px-3 py-2.5 text-sm outline-none transition-all focus:border-primary/60 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(180,140,50,0.1)]"
                  placeholder="Repeat your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-grimoire w-full !py-2.5 disabled:opacity-50"
              >
                {loading ? 'Inscribing...' : 'Forge Your Sigil'}
              </button>
            </form>

            <div className="grimoire-divider mt-6" />

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have a sigil?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
