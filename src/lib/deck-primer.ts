/**
 * Authored deck primer: the hand-verified counterpart of the generated PilotGuide (pilot-guide.ts).
 * One JSON file per paper deck (decks/paper/primers/<slug>.json), rendered today by the deck-check page
 * and later by the app. Text fields may contain [[Card Name]] (rendered as a card chip) and **bold**.
 * Card fields hold exact DB card names (front face for double-faced cards).
 */
import { z } from 'zod';

const CardName = z.string().min(1);
/** A left-to-right diagram: each step a short phrase, optionally one [[Card]]. */
const Flow = z.array(z.string().min(1)).min(2).max(7);

export const PrimerSchema = z.object({
  version: z.literal(1),
  deck: z.object({
    name: z.string().min(1),
    commanders: z.array(CardName).min(1).max(2),
    colours: z.string().min(1),
    format: z.enum(['commander', 'brawl', 'standard']),
    /** repo path of the list the primer describes */
    list: z.string().min(1),
    status: z.enum(['sleeved', 'proposed']),
  }),
  /** the plan in 2–4 sentences */
  summary: z.string().min(1),
  phases: z.array(z.object({ turns: z.string(), goal: z.string(), cards: z.array(CardName).max(8) })).min(2).max(4),
  engine: z.array(z.object({ title: z.string(), flow: Flow, note: z.string().optional() })).max(6),
  winConditions: z
    .array(z.object({ name: z.string(), pieces: z.array(CardName).min(1).max(5), flow: Flow, damage: z.string(), turn: z.string().optional() }))
    .min(1)
    .max(5),
  /** e.g. columns ["Metric", "Sleeved", "Proposed"]; values align with columns[1..] */
  metrics: z
    .object({ columns: z.array(z.string()).min(2), rows: z.array(z.object({ label: z.string(), values: z.array(z.string()) })), note: z.string().optional() })
    .optional(),
  /** proposed changes vs the sleeved list; out or in may be null for pure adds/cuts (e.g. a land count change) */
  swaps: z
    .array(
      z.object({
        out: CardName.nullable(),
        in: CardName.nullable(),
        role: z.string(),
        reason: z.string(),
        quoteOut: z.string().optional(),
        quoteIn: z.string().optional(),
        evidence: z.string().optional(),
        verdict: z.enum(['recommended', 'optional', 'operator']).default('recommended'),
      }),
    )
    .default([]),
  /** cards someone might cut, and why they stay */
  keepers: z.array(z.object({ card: CardName, why: z.string() })).max(12).default([]),
  nearTies: z.array(z.object({ kept: CardName, alt: CardName, note: z.string() })).default([]),
  mulligan: z.object({ keep: z.array(z.string()).min(1), mulligan: z.array(z.string()).min(1) }),
  pilotRules: z.array(z.string()).max(10).default([]),
  sources: z.array(z.string()).default([]),
});

export type Primer = z.infer<typeof PrimerSchema>;

/** Validate untrusted primer JSON; throws a ZodError naming the bad field. */
export function parsePrimer(json: unknown): Primer {
  return PrimerSchema.parse(json);
}

/** Every card name a primer references (commanders, pieces, swaps, keepers, near-ties, and [[chips]] in text). */
export function primerCardNames(p: Primer): string[] {
  const out = new Set<string>([...p.deck.commanders]);
  const chips = (s: string) => [...s.matchAll(/\[\[(.+?)\]\]/g)].forEach((m) => out.add(m[1]));
  const text: string[] = [p.summary, ...p.pilotRules, ...p.mulligan.keep, ...p.mulligan.mulligan];
  p.phases.forEach((ph) => { ph.cards.forEach((c) => out.add(c)); text.push(ph.goal); });
  p.engine.forEach((e) => text.push(...e.flow, e.note ?? ''));
  p.winConditions.forEach((w) => { w.pieces.forEach((c) => out.add(c)); text.push(...w.flow, w.damage); });
  p.swaps.forEach((s) => { if (s.out) out.add(s.out); if (s.in) out.add(s.in); text.push(s.reason); });
  p.keepers.forEach((k) => { out.add(k.card); text.push(k.why); });
  p.nearTies.forEach((n) => { out.add(n.kept); out.add(n.alt); text.push(n.note); });
  text.forEach(chips);
  return [...out];
}
