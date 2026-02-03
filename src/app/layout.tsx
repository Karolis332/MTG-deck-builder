import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import { ArenaWatcherPanel } from '@/components/arena-watcher-panel';

export const metadata: Metadata = {
  title: 'MTG Deck Builder',
  description: 'Build, analyze, and optimize your Magic: The Gathering decks with AI-powered suggestions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <ThemeProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
            </div>
            <ArenaWatcherPanel />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
