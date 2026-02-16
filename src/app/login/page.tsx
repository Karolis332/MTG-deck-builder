'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const err = await login(username, password);
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
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary text-2xl arcane-glow">
                &#128214;
              </div>
              <h1 className="mt-4 font-heading text-2xl font-bold tracking-wide text-grimoire">Open the Grimoire</h1>
              <p className="mt-2 text-sm text-muted-foreground italic">
                Speak the words of power to enter
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
                  placeholder="Enter your username"
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
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-grimoire w-full !py-2.5 disabled:opacity-50"
              >
                {loading ? 'Opening...' : 'Enter the Grimoire'}
              </button>
            </form>

            <div className="grimoire-divider mt-6" />

            <p className="mt-4 text-center text-sm text-muted-foreground">
              New to the craft?{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Create your sigil
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
