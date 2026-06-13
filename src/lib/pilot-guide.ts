/**
 * Per-deck piloting guide — a deterministic, no-LLM gameplan generated from the
 * deck's own composition and the commander's detected mechanics. Tells the user
 * how to mulligan, what to do turn by turn, which cards are load-bearing, the
 * signature lines for the commander, and the common pitfalls.
 */

import { classifyCard, getPrimaryCategory, isDrawEngine } from './card-classifier';
import { analyzeCommander } from './commander-synergy';
import type { CommanderSynergyProfile } from './commander-synergy';

export interface PilotCard {
  name: string;
  type_line?: string | null;
  oracle_text?: string | null;
  mana_cost?: string | null;
  cmc?: number | null;
  board: string;
}

export interface PilotGuide {
  archetype: string;
  gameplan: string;
  mulligan: string[];
  turns: Array<{ phase: string; advice: string }>;
  keyCards: Array<{ name: string; why: string }>;
  signatureLines: string[];
  pitfalls: string[];
}

const ARCHETYPE_PLAN: Record<string, string> = {
  aggro: 'Apply early pressure and close before opponents stabilize. Curve out, attack every turn, save burn/removal for blockers.',
  midrange: 'Trade efficiently, grind card advantage, and win with bigger threats once the board stalls.',
  control: 'Survive the early game, answer every threat, and win late with an inevitable engine or finisher.',
  combo: 'Assemble your combo while protecting the pieces; use the rest of the deck to dig and stall.',
  voltron: 'Land the commander, suit it up, and protect it — one big evasive threat does the work.',
  aristocrats: 'Build a sacrifice loop: tokens/fodder in, value and drain out. Death is your resource.',
  spellslinger: 'Chain cheap spells, trigger your payoffs repeatedly, and burst the table with a big turn.',
  tribal: 'Flood the board with your creature type, then leverage lords and anthems to overwhelm.',
  tokens: 'Go wide with tokens, then finish with an overrun/anthem or sacrifice payoff.',
  stax: 'Slow the game with taxes and denial while you advance an asymmetric win.',
  reanimator: 'Fill the graveyard, cheat big threats into play, and overwhelm before opponents catch up.',
};

export function buildPilotGuide(opts: {
  commander: string;
  partner?: string;
  format: string;
  archetype: string;
  cards: PilotCard[];
  commanderCard?: { oracle_text?: string | null; type_line?: string | null; color_identity?: string | null; mana_cost?: string | null };
  profile?: CommanderSynergyProfile | null;
}): PilotGuide {
  const main = opts.cards.filter((c) => c.board === 'main');
  const nonLands = main.filter((c) => !(c.type_line || '').split('//')[0].includes('Land'));

  const roleOf = (c: PilotCard) =>
    getPrimaryCategory(classifyCard(c.name, c.oracle_text || '', c.type_line || '', c.cmc ?? 0, opts.commanderCard?.oracle_text || undefined));

  const ramp = nonLands.filter((c) => roleOf(c) === 'ramp');
  const draw = nonLands.filter((c) => roleOf(c) === 'draw');
  const engines = nonLands.filter((c) => isDrawEngine(c.name, c.oracle_text || '', c.type_line || ''));
  const removal = nonLands.filter((c) => roleOf(c) === 'removal');
  const wipes = nonLands.filter((c) => roleOf(c) === 'board_wipe');
  const wincons = nonLands.filter((c) => roleOf(c) === 'win_condition');
  const cheapRamp = ramp.filter((c) => (c.cmc ?? 9) <= 2);

  // Profile: prefer the passed one, else derive from the commander card.
  const profile = opts.profile
    ?? (opts.commanderCard
      ? analyzeCommander(
          opts.commanderCard.oracle_text || '',
          opts.commanderCard.type_line || '',
          (() => { try { return JSON.parse(opts.commanderCard!.color_identity || '[]'); } catch { return []; } })(),
          opts.commanderCard.mana_cost || undefined,
        )
      : null);
  const cats = new Set(profile?.triggerCategories ?? []);

  const archetype = opts.archetype || profile?.detectedArchetype || 'midrange';
  const gameplan = ARCHETYPE_PLAN[archetype] || ARCHETYPE_PLAN.midrange;

  // ── Mulligan ─────────────────────────────────────────────────────────────
  const mulligan: string[] = [];
  const colorCount = (() => { try { return JSON.parse(opts.commanderCard?.color_identity || '[]').length; } catch { return 1; } })();
  const landFloor = archetype === 'aggro' ? 2 : 3;
  mulligan.push(`Keep hands with ${landFloor}-5 lands${colorCount >= 3 ? ' that cover at least two of your colors (you are ' + colorCount + '-color — fixing matters)' : ''}.`);
  if (cheapRamp.length >= 4) mulligan.push('A turn-1/2 mana rock or dork is worth keeping a slightly land-light hand for — it accelerates the commander.');
  if (archetype === 'aggro' || archetype === 'tribal') mulligan.push('Prioritize early plays and cheap threats over expensive bombs; a slow hand loses the race.');
  if (cats.has('spell_cast') || cats.has('storm') || cats.has('x_spells')) mulligan.push('Want a couple of cheap spells and a payoff — a hand of all lands and no spells does nothing for you.');
  mulligan.push('Mulligan hands with no early play before turn 3, or that cannot cast your commander on curve.');

  // ── Turn plan ──────────────────────────────────────────────────────────
  const turns: PilotGuide['turns'] = [];
  turns.push({ phase: 'Turns 1-3 (develop)', advice: `Hit land drops, deploy ${cheapRamp.length ? 'ramp/rocks' : 'cheap plays'}, and aim to cast ${opts.commander}${opts.partner ? ' / ' + opts.partner : ''} on curve. Hold interaction unless you must answer something lethal.` });
  turns.push({ phase: 'Turns 4-6 (establish)', advice: `Land your commander and a draw engine${engines.length ? ' (e.g. ' + engines.slice(0, 2).map((c) => c.name.split(' // ')[0]).join(', ') + ')' : ''}. Start trading removal for the scariest board, not the first threat you see.` });
  turns.push({ phase: 'Turns 7+ (win)', advice: `Convert your advantage: ${wincons.length ? 'deploy a finisher (' + wincons.slice(0, 2).map((c) => c.name.split(' // ')[0]).join(', ') + ')' : 'leverage your engine lead'}${wipes.length ? '; hold a board wipe as a reset if you fall behind' : ''}.` });

  // ── Key cards ────────────────────────────────────────────────────────────
  const keyCards: PilotGuide['keyCards'] = [];
  for (const c of engines.slice(0, 3)) keyCards.push({ name: c.name.split(' // ')[0], why: 'card-advantage engine — resolve early and protect it; it keeps your hand full' });
  for (const c of wincons.slice(0, 2)) keyCards.push({ name: c.name.split(' // ')[0], why: 'primary win condition — bait removal before committing it' });
  if (cheapRamp[0]) keyCards.push({ name: cheapRamp[0].name.split(' // ')[0], why: 'best accelerant — leads to a turn-ahead commander' });

  // ── Signature lines (commander-mechanic aware) ─────────────────────────────
  const signatureLines: string[] = [];
  const cmdShort = opts.commander.split(',')[0];
  if (cats.has('five_colors')) signatureLines.push(`${cmdShort} rewards casting multicolor spells — sequence your gold cards and rainbow fixing to bank value/counters every turn.`);
  if (cats.has('x_spells')) signatureLines.push(`Save big mana for your X-spells; ${cmdShort} turns excess mana into a blowout. Don't cast them small unless you must.`);
  if (cats.has('counters')) signatureLines.push('Use proliferate/+1/+1 enablers in response to removal to bank value, and attack once your team outsizes blockers.');
  if (cats.has('spell_cast') || cats.has('storm')) signatureLines.push('Hold cheap spells to chain in one turn for maximum trigger value rather than dribbling them out.');
  if (cats.has('token_generation')) signatureLines.push('Develop tokens before deploying anthems/overrun so the payoff hits the whole board at once.');
  if (cats.has('creature_dies') || archetype === 'aristocrats') signatureLines.push('Keep a sacrifice outlet open so you can respond to exile/bounce by cashing creatures for value.');
  if (cats.has('graveyard') || archetype === 'reanimator') signatureLines.push('Fill the graveyard early (self-mill/cheap creatures) so your reanimation has the best targets available.');
  if (signatureLines.length === 0) signatureLines.push(`Build your board around ${cmdShort} and use your removal to clear the path for your threats.`);

  // ── Pitfalls ──────────────────────────────────────────────────────────────
  const pitfalls: string[] = [];
  if (engines.length < 4) pitfalls.push('Card advantage is thin — avoid emptying your hand early or you will run out of gas.');
  if (removal.length < 6) pitfalls.push('Limited interaction — be selective about what you answer; save removal for must-kill threats.');
  if (wipes.length === 0) pitfalls.push('No board wipe — you cannot reset a board that gets ahead of you, so don\'t fall behind on development.');
  pitfalls.push(`Don\'t overcommit into open mana — ${archetype === 'aggro' ? 'play around blockers and combat tricks' : 'play around the board wipe and respect counterspells'}.`);

  return { archetype, gameplan, mulligan, turns, keyCards, signatureLines, pitfalls };
}
