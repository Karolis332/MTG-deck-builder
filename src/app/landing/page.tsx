'use client';

import { useState } from 'react';

/* ── Feature data ─────────────────────────────────────────────────────── */

const FEATURES = [
  {
    title: 'AI Deck Building',
    description: 'Claude & GPT-4o construct decks from your collection with synergy scoring and archetype awareness.',
    icon: AiIcon,
    accent: 'text-purple-400',
    accentBg: 'bg-purple-500/15',
  },
  {
    title: 'Live Overlay',
    description: 'Transparent in-game tracker with draw probabilities, zone tracking, and real-time game state.',
    icon: OverlayIcon,
    accent: 'text-blue-400',
    accentBg: 'bg-blue-500/15',
  },
  {
    title: 'Match Analytics',
    description: 'Win rates by deck, matchup, and card. Play-by-play game logs with damage and zone tracking.',
    icon: AnalyticsIcon,
    accent: 'text-green-400',
    accentBg: 'bg-green-500/15',
  },
  {
    title: 'ML Predictions',
    description: 'Gradient Boosting model with 26 features predicts card performance across personal and community data.',
    icon: MlIcon,
    accent: 'text-amber-400',
    accentBg: 'bg-amber-500/15',
  },
  {
    title: 'Commander Synergy',
    description: '12 trigger categories parsed from oracle text. Archetype templates and EDHREC data merged into one engine.',
    icon: SynergyIcon,
    accent: 'text-red-400',
    accentBg: 'bg-red-500/15',
  },
  {
    title: 'Collection Manager',
    description: 'Import from Arena, track every card you own, and build decks exclusively from your collection.',
    icon: CollectionIcon,
    accent: 'text-cyan-400',
    accentBg: 'bg-cyan-500/15',
  },
] as const;

/* ── Pricing data ─────────────────────────────────────────────────────── */

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to start',
    features: [
      'Deck building & editing',
      'Collection import from Arena',
      'Basic match tracking',
      'Card database (35K+ cards)',
      'Format validation',
      'Deck export (Arena/MTGO)',
    ],
    cta: 'Download Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$4.99',
    period: '/month',
    description: 'Competitive edge for ranked play',
    features: [
      'Everything in Free',
      'Live in-game overlay',
      'Draw probability tracker',
      'ML win predictions',
      'Advanced match analytics',
      'Mulligan advisor',
      'AI sideboard guide',
    ],
    cta: 'Start Pro Trial',
    highlighted: true,
  },
  {
    name: 'Commander',
    price: '$14.99',
    period: '/month',
    description: 'Full arsenal for deck masters',
    features: [
      'Everything in Pro',
      'AI deck construction (Claude/GPT-4o)',
      'Commander synergy engine',
      'Collaborative filtering recs',
      'EDHREC data integration',
      'Tournament meta analysis',
      'Priority support',
    ],
    cta: 'Unlock Commander',
    highlighted: false,
  },
] as const;

/* ── Testimonials ─────────────────────────────────────────────────────── */

const TESTIMONIALS = [
  {
    quote: 'The AI built me a Brawl deck from my collection that went 7-2 in ranked. Nothing else does this.',
    author: 'Mythic Rank Player',
    context: 'Historic Brawl',
  },
  {
    quote: 'The overlay draw probabilities changed how I sequence my plays. Went from Diamond to Mythic in a week.',
    author: 'Arena Competitive',
    context: 'Standard Ranked',
  },
  {
    quote: 'Finally, a deck builder that knows what cards I actually own. No more exporting to check legality.',
    author: 'Collection-First Builder',
    context: 'Multiple Formats',
  },
] as const;

/* ── Page component ───────────────────────────────────────────────────── */

export default function LandingPage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  return (
    <div className="relative overflow-hidden">
      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-4 py-20 text-center">
        {/* Background arcane circles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/5 md:h-[800px] md:w-[800px]" />
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/8 md:h-[550px] md:w-[550px]" />
          <div className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 md:h-[300px] md:w-[300px]" />
          {/* Floating mana sparks */}
          <div className="absolute left-[15%] top-[20%] h-2 w-2 animate-pulse rounded-full bg-amber-500/40" />
          <div className="absolute right-[20%] top-[30%] h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500/40" style={{ animationDelay: '1s' }} />
          <div className="absolute left-[25%] bottom-[25%] h-2 w-2 animate-pulse rounded-full bg-red-500/30" style={{ animationDelay: '2s' }} />
          <div className="absolute right-[15%] bottom-[20%] h-1.5 w-1.5 animate-pulse rounded-full bg-green-500/30" style={{ animationDelay: '0.5s' }} />
          <div className="absolute left-[45%] top-[15%] h-1 w-1 animate-pulse rounded-full bg-purple-500/30" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Grimoire book — CSS art */}
        <div className="relative mb-8 animate-fade-in" aria-hidden="true">
          <GrimoireBookArt />
        </div>

        {/* Tagline */}
        <h1 className="mb-4 max-w-3xl font-heading text-4xl font-bold tracking-wide sm:text-5xl md:text-6xl">
          <span className="text-grimoire">Master Your Deck.</span>
          <br />
          <span className="text-foreground">Dominate Your Matches.</span>
        </h1>

        <p className="mb-8 max-w-xl text-lg text-muted-foreground sm:text-xl">
          AI-powered deck building, live match overlay, and ML predictions
          for MTG Arena. All from one grimoire.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <a href="#pricing" className="btn-grimoire inline-flex items-center gap-2 !px-8 !py-3 !text-base">
            <DownloadIcon className="h-5 w-5" />
            Download Free
          </a>
          <a href="#features" className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-heading text-sm tracking-wide text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary">
            Explore Features
            <ChevronDownIcon className="h-4 w-4" />
          </a>
        </div>

        {/* Social proof */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground sm:gap-8">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>35,000+ cards indexed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>26-feature ML model</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span>Real-time Arena overlay</span>
          </div>
        </div>
      </section>

      {/* ── Gold divider ──────────────────────────────────────────────── */}
      <div className="grimoire-divider mx-auto max-w-4xl" />

      {/* ── Features Grid ─────────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-3 font-heading text-3xl font-bold tracking-wide text-grimoire sm:text-4xl">
            Arcane Arsenal
          </h2>
          <p className="mx-auto max-w-lg text-muted-foreground">
            Six pillars of power, forged from machine learning, AI reasoning,
            and thousands of tournament matches.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="card-hover grimoire-border group bg-card/60 p-6 transition-all"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${feature.accentBg} transition-transform group-hover:scale-110`}>
                <feature.icon className={`h-6 w-6 ${feature.accent}`} />
              </div>
              <h3 className="mb-2 font-heading text-lg font-semibold tracking-wide">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gold divider ──────────────────────────────────────────────── */}
      <div className="grimoire-divider mx-auto max-w-4xl" />

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-3 font-heading text-3xl font-bold tracking-wide text-grimoire sm:text-4xl">
            Three Steps to Mastery
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              step: 'I',
              title: 'Import Your Collection',
              desc: 'Connect MTG Arena. Your cards, your collection, synced automatically.',
            },
            {
              step: 'II',
              title: 'Build With AI',
              desc: 'Tell the AI your commander or strategy. It builds from cards you own.',
            },
            {
              step: 'III',
              title: 'Track & Improve',
              desc: 'Live overlay during matches. ML predictions after. Get better every game.',
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 font-heading text-xl font-bold text-primary">
                {item.step}
              </div>
              <h3 className="mb-2 font-heading text-base font-semibold tracking-wide">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gold divider ──────────────────────────────────────────────── */}
      <div className="grimoire-divider mx-auto max-w-4xl" />

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-20">
        <div className="mb-8 text-center">
          <h2 className="mb-3 font-heading text-3xl font-bold tracking-wide text-grimoire sm:text-4xl">
            From the Battlefield
          </h2>
        </div>

        <div className="grimoire-border bg-card/60 p-8 text-center">
          <div className="grimoire-corners">
            <p className="mb-4 text-lg italic leading-relaxed text-foreground">
              &ldquo;{TESTIMONIALS[activeTestimonial].quote}&rdquo;
            </p>
            <div className="text-sm text-primary">
              {TESTIMONIALS[activeTestimonial].author}
            </div>
            <div className="text-xs text-muted-foreground">
              {TESTIMONIALS[activeTestimonial].context}
            </div>
          </div>

          {/* Dots */}
          <div className="mt-6 flex items-center justify-center gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`h-2 w-2 rounded-full transition-all ${
                  i === activeTestimonial
                    ? 'w-6 bg-primary'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Gold divider ──────────────────────────────────────────────── */}
      <div className="grimoire-divider mx-auto max-w-4xl" />

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section id="pricing" className="mx-auto max-w-5xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-3 font-heading text-3xl font-bold tracking-wide text-grimoire sm:text-4xl">
            Choose Your Tome
          </h2>
          <p className="mx-auto max-w-lg text-muted-foreground">
            Start free. Upgrade when the grimoire&apos;s deeper secrets call to you.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`grimoire-border relative flex flex-col p-6 transition-all ${
                plan.highlighted
                  ? 'bg-card/80 arcane-glow ring-1 ring-primary/30'
                  : 'bg-card/40'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
                  Most Popular
                </div>
              )}

              <h3 className="mb-1 font-heading text-xl font-bold tracking-wide">
                {plan.name}
              </h3>
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-primary">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="mb-6 text-sm text-muted-foreground">{plan.description}</p>

              <ul className="mb-8 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full rounded-lg py-2.5 font-heading text-sm font-semibold tracking-wide transition-all ${
                  plan.highlighted
                    ? 'btn-grimoire'
                    : 'border border-border bg-card/80 text-foreground hover:border-primary/30 hover:text-primary'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gold divider ──────────────────────────────────────────────── */}
      <div className="grimoire-divider mx-auto max-w-4xl" />

      {/* ── Comparison Strip ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 py-20">
        <div className="mb-8 text-center">
          <h2 className="mb-3 font-heading text-2xl font-bold tracking-wide text-grimoire sm:text-3xl">
            Why The Black Grimoire?
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-left font-heading text-xs uppercase tracking-widest text-muted-foreground">Feature</th>
                <th className="pb-3 text-center font-heading text-xs uppercase tracking-widest text-primary">Grimoire</th>
                <th className="pb-3 text-center font-heading text-xs uppercase tracking-widest text-muted-foreground">Untapped</th>
                <th className="pb-3 text-center font-heading text-xs uppercase tracking-widest text-muted-foreground">Arena Tutor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[
                ['AI Deck Building', true, false, false],
                ['Live Game Overlay', true, true, true],
                ['ML Win Predictions', true, false, false],
                ['Commander Synergy', true, false, false],
                ['Collection-Aware AI', true, false, false],
                ['Offline-First', true, false, false],
                ['Draft Assistance', false, true, true],
                ['Free Tier', true, true, true],
              ].map(([feature, grimoire, untapped, tutor]) => (
                <tr key={feature as string} className="hover:bg-card/40">
                  <td className="py-2.5 text-foreground">{feature as string}</td>
                  <td className="py-2.5 text-center">
                    {grimoire ? (
                      <CheckIcon className="mx-auto h-4 w-4 text-primary" />
                    ) : (
                      <XIcon className="mx-auto h-4 w-4 text-muted-foreground/30" />
                    )}
                  </td>
                  <td className="py-2.5 text-center">
                    {untapped ? (
                      <CheckIcon className="mx-auto h-4 w-4 text-muted-foreground/60" />
                    ) : (
                      <XIcon className="mx-auto h-4 w-4 text-muted-foreground/30" />
                    )}
                  </td>
                  <td className="py-2.5 text-center">
                    {tutor ? (
                      <CheckIcon className="mx-auto h-4 w-4 text-muted-foreground/60" />
                    ) : (
                      <XIcon className="mx-auto h-4 w-4 text-muted-foreground/30" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Gold divider ──────────────────────────────────────────────── */}
      <div className="grimoire-divider mx-auto max-w-4xl" />

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="px-4 py-24 text-center">
        <h2 className="mb-4 font-heading text-3xl font-bold tracking-wide sm:text-4xl">
          Open the <span className="text-grimoire">Grimoire</span>
        </h2>
        <p className="mx-auto mb-8 max-w-md text-muted-foreground">
          Join the planeswalkers who build smarter, play sharper, and win more.
        </p>
        <a href="#pricing" className="btn-grimoire inline-flex items-center gap-2 !px-10 !py-3.5 !text-base">
          <DownloadIcon className="h-5 w-5" />
          Download Free
        </a>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card/40 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <GrimoireBookSmall className="h-5 w-5" />
            <span className="font-heading tracking-wide">The Black Grimoire</span>
          </div>
          <div className="flex gap-6">
            <span>Windows</span>
            <span>Overwolf</span>
            <span>Standalone</span>
          </div>
          <div>
            MTG Arena is a trademark of Wizards of the Coast. Not affiliated.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Grimoire Book CSS Art ────────────────────────────────────────────── */

function GrimoireBookArt() {
  return (
    <div className="relative h-40 w-32 sm:h-48 sm:w-40">
      {/* Book shadow */}
      <div className="absolute inset-x-2 bottom-0 h-4 rounded-full bg-black/40 blur-xl" />

      {/* Book back cover */}
      <div
        className="absolute inset-0 rounded-r-md"
        style={{
          background: 'linear-gradient(135deg, #1a120a 0%, #0a0806 100%)',
          border: '1px solid hsl(30 24% 16%)',
          transform: 'translateX(4px) translateY(4px)',
        }}
      />

      {/* Book spine */}
      <div
        className="absolute left-0 top-0 h-full w-5 rounded-l-md sm:w-6"
        style={{
          background: 'linear-gradient(90deg, #2a1a0a, #1a100a)',
          borderLeft: '1px solid hsl(36 30% 22%)',
          borderTop: '1px solid hsl(36 30% 22%)',
          borderBottom: '1px solid hsl(36 30% 22%)',
        }}
      />

      {/* Book front cover */}
      <div
        className="absolute inset-0 rounded-r-md"
        style={{
          background: 'linear-gradient(160deg, #12100a 0%, #0a0806 60%, #08060d 100%)',
          border: '1px solid hsl(43 40% 28% / 0.4)',
        }}
      >
        {/* Inner border */}
        <div
          className="absolute inset-2 rounded-sm sm:inset-3"
          style={{ border: '1px solid hsl(43 40% 28% / 0.2)' }}
        />

        {/* Pentagram circle */}
        <div className="absolute left-1/2 top-[45%] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-20 sm:w-20"
          style={{ border: '1px solid hsl(43 60% 45% / 0.4)' }}
        />

        {/* Star (simplified with rotation) */}
        <div
          className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: '14px solid transparent',
            borderRight: '14px solid transparent',
            borderBottom: '24px solid hsl(43 60% 45% / 0.35)',
          }}
        />
        <div
          className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: '14px solid transparent',
            borderRight: '14px solid transparent',
            borderTop: '24px solid hsl(43 60% 45% / 0.35)',
            marginTop: '6px',
          }}
        />

        {/* Center eye */}
        <div
          className="absolute left-1/2 top-[45%] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse-glow"
          style={{ background: '#c9a84c' }}
        />

        {/* Title text on cover */}
        <div
          className="absolute bottom-3 left-0 right-0 text-center font-heading text-[8px] uppercase tracking-[0.2em] sm:bottom-4 sm:text-[9px]"
          style={{ color: 'hsl(43 60% 45% / 0.6)' }}
        >
          Grimoire
        </div>
      </div>
    </div>
  );
}

/* ── Small book icon for footer ───────────────────────────────────────── */

function GrimoireBookSmall({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M12 7l1.5 2.5L12 12l-1.5-2.5z" stroke="hsl(43 60% 45%)" strokeWidth="1" />
    </svg>
  );
}

/* ── Inline SVG Icons ─────────────────────────────────────────────────── */

function AiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function OverlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <path d="M7 8h4M7 11h2" />
    </svg>
  );
}

function AnalyticsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function MlIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function SynergyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );
}

function CollectionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
