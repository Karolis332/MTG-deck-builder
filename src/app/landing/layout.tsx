import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Black Grimoire — MTG Arena Deck Builder & Match Tracker',
  description:
    'AI-powered deck building, live in-game overlay, ML win predictions, and commander synergy engine for Magic: The Gathering Arena. Build decks from your collection with Claude and GPT-4o. Free download.',
  keywords: [
    'MTG Arena deck builder',
    'MTG Arena tracker',
    'MTG Arena overlay',
    'Magic The Gathering deck builder',
    'MTG AI deck builder',
    'MTG Arena collection manager',
    'MTG Arena win rate tracker',
    'commander synergy engine',
    'MTG Arena match analytics',
    'MTGA deck tracker',
    'Magic Arena tools',
    'MTG Arena mulligan advisor',
    'MTG Arena sideboard guide',
  ],
  openGraph: {
    title: 'The Black Grimoire — MTG Arena Deck Builder & Match Tracker',
    description:
      'AI-powered deck building, live match overlay, and ML predictions for MTG Arena. Build from your collection. Track every match. Dominate ranked.',
    type: 'website',
    locale: 'en_US',
    siteName: 'The Black Grimoire',
    url: 'https://blackgrimoire.gg',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Black Grimoire — MTG Arena Deck Builder',
    description:
      'AI deck building + live overlay + ML predictions for MTG Arena. Free download.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://blackgrimoire.gg',
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
