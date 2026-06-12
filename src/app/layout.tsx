import type { Metadata } from 'next';
import { Cinzel, Crimson_Text } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import { UpdateBanner } from '@/components/update-banner';

// Self-hosted via next/font: fonts are bundled at build time so the packaged
// Electron app renders the grimoire theme with no network dependency.
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});
const crimsonText = Crimson_Text({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Black Grimoire',
  description: 'Build, analyze, and optimize your Magic: The Gathering decks with AI-powered suggestions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${cinzel.variable} ${crimsonText.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-body antialiased grimoire-page">
        <AuthProvider>
          <ThemeProvider>
            <div className="flex min-h-screen flex-col">
              <UpdateBanner />
              <Navbar />
              <main className="flex-1 animate-page-turn">{children}</main>
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
