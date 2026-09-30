// Unit C (2026-09-30, B-D5 / A-D4): the builder's honest read behind
// `ClassifyOpts.strict`. Every case also pins the DEFAULT answer — Deck Score
// (deck-score-features.ts) passes no opts.
import { describe, it, expect } from 'vitest';
import { classifyCard, isBoardWipe, isHonestRamp, isSymmetricCreatureWipe } from '../card-classifier';

const STRICT = { strict: true };
const cats = (name: string, oracle: string, type: string, cmc: number, opts?: { strict?: boolean }) =>
  classifyCard(name, oracle, type, cmc, undefined, opts);

describe('strict ramp (B-D5) — own abilities only, no reminder text', () => {
  const OFFER = 'Counter target noncreature spell. Its controller creates two Treasure tokens. (They\'re artifacts with "{T}, Sacrifice this token: Add one mana of any color.")';
  const DISPUTE = 'As an additional cost to cast this spell, sacrifice an artifact or creature.\nDraw two cards and create a Treasure token. (It\'s an artifact with "{T}, Sacrifice this token: Add one mana of any color.")';
  const TITHE = 'Whenever an opponent draws a card, that player may pay {2}. If the player doesn\'t, you create a Treasure token. (It\'s an artifact with "{T}, Sacrifice this token: Add one mana of any color.")';
  const KILN = 'This creature gets +1/+0 for each artifact you control.\nMagecraft — Whenever you cast or copy an instant or sorcery spell, create a Treasure token. (It\'s an artifact with "{T}, Sacrifice this token: Add one mana of any color.")';
  const DOCKSIDE = 'When this creature enters, create X Treasure tokens, where X is the number of artifacts and enchantments your opponents control. (They\'re artifacts with "{T}, Sacrifice this token: Add one mana of any color.")';

  it("An Offer You Can't Refuse: default ramp (pinned), strict not ramp", () => {
    expect(cats("An Offer You Can't Refuse", OFFER, 'Instant', 1)).toContain('ramp');
    expect(cats("An Offer You Can't Refuse", OFFER, 'Instant', 1, STRICT)).not.toContain('ramp');
    expect(isHonestRamp("An Offer You Can't Refuse", OFFER, 'Instant')).toBe(false);
  });

  it('one-shot Treasure rider (Deadly Dispute) is not strict ramp', () => {
    expect(cats('Deadly Dispute', DISPUTE, 'Instant', 2)).toContain('ramp');
    expect(cats('Deadly Dispute', DISPUTE, 'Instant', 2, STRICT)).not.toContain('ramp');
  });

  it('repeatable own Treasure (Smothering Tithe, Storm-Kiln Artist) and X Treasure (Dockside) stay ramp', () => {
    expect(isHonestRamp('Smothering Tithe', TITHE, 'Enchantment')).toBe(true);
    expect(isHonestRamp('Storm-Kiln Artist', KILN, 'Creature — Dwarf Shaman')).toBe(true);
    expect(isHonestRamp('Dockside Extortionist', DOCKSIDE, 'Creature — Goblin Pirate')).toBe(true);
  });

  it('rocks, dorks, land ramp, rituals are ramp under strict', () => {
    expect(isHonestRamp('Sol Ring', '{T}: Add {C}{C}.', 'Artifact')).toBe(true);
    expect(isHonestRamp('Llanowar Elves', '{T}: Add {G}.', 'Creature — Elf Druid')).toBe(true);
    expect(isHonestRamp('Cultivate', 'Search your library for up to two basic land cards, reveal those cards, and put one onto the battlefield tapped and the other into your hand. Then shuffle.', 'Sorcery')).toBe(true);
    expect(isHonestRamp('Dark Ritual', 'Add {B}{B}{B}.', 'Instant')).toBe(true);
    expect(isHonestRamp('Kami of Whispered Hopes', 'If one or more +1/+1 counters would be put on a permanent you control, that many plus one +1/+1 counters are put on that permanent instead.\n{T}: Add X mana of any one color, where X is this creature\'s power.', 'Creature — Spirit')).toBe(true);
  });
});

describe('strict win_condition (A-D4) — never MV alone', () => {
  const TITAN = 'Deathtouch\nWhenever this creature enters or attacks, create two 2/2 black Zombie creature tokens.';
  it('a 6-drop without evasion: default wincon (pinned), strict not', () => {
    expect(cats('Grave Titan', TITAN, 'Creature — Giant', 6)).toContain('win_condition');
    expect(cats('Grave Titan', TITAN, 'Creature — Giant', 6, STRICT)).not.toContain('win_condition');
  });
  it('evasive big creature, anthem, drain, alt-win are wincons under strict', () => {
    expect(cats('Dragon', 'Flying, trample', 'Creature — Dragon', 6, STRICT)).toContain('win_condition');
    expect(cats('Craterhoof Behemoth', 'Haste\nWhen this creature enters, creatures you control gain trample and get +X/+X until end of turn, where X is the number of creatures you control.', 'Creature — Beast', 8, STRICT)).toContain('win_condition');
    expect(cats('Overrun', 'Creatures you control get +3/+3 and gain trample until end of turn.', 'Sorcery', 5, STRICT)).toContain('win_condition');
    expect(cats('Exsanguinate', 'Each opponent loses X life. You gain life equal to the life lost this way.', 'Sorcery', 2, STRICT)).toContain('win_condition');
    expect(cats("Thassa's Oracle", 'When this creature enters, look at the top X cards of your library, where X is your devotion to blue. If X is greater than or equal to the number of cards in your library, you win the game.', 'Creature — Merfolk Wizard', 2, STRICT)).toContain('win_condition');
  });
  it('a +1/+1 lord anthem and a non-creature trample trick are not strict wincons', () => {
    expect(cats('Glorious Anthem', 'Creatures you control get +1/+1.', 'Enchantment', 3, STRICT)).not.toContain('win_condition');
    expect(cats('Trick', 'Target creature gets +4/+4 and gains trample until end of turn.', 'Instant', 4)).toContain('win_condition');
    expect(cats('Trick', 'Target creature gets +4/+4 and gains trample until end of turn.', 'Instant', 4, STRICT)).not.toContain('win_condition');
  });
});

describe('strict board_wipe (A-D4)', () => {
  const NIGHT = "When this enchantment enters, create a Food token. (It's an artifact with \"{2}, {T}, Sacrifice this token: You gain 3 life.\")\nFoods you control have \"{T}: Add {G}.\"\n{5}{G}{G}, Sacrifice this enchantment: Creatures you control get +X/+X until end of turn, where X is the number of Foods you control. Activate only as a sorcery.";
  const AETHERIZE = "Return all attacking creatures to their owner's hand.";
  const VAULT = '{5}, {T}, Exile this artifact: Exile all nonland permanents.';
  const RAKDOS = 'Choose one —\n• Exile target player\'s graveyard.\n• Destroy target artifact.\n• Each creature deals 1 damage to its controller.';
  const GOLGARI = 'Choose one —\n• All creatures get -1/-1 until end of turn.\n• Destroy target enchantment.\n• Regenerate each creature you control.';
  const REBUKE = "Return all nonland permanents target player controls to their owner's hand.";

  it("Night of the Sweets' Revenge: name-listed for the default (pinned), not a strict wipe", () => {
    expect(isBoardWipe("Night of the Sweets' Revenge", NIGHT)).toBe(true);
    expect(isBoardWipe("Night of the Sweets' Revenge", NIGHT, STRICT)).toBe(false);
  });
  it('Aetherize, Perilous Vault, River\'s Rebuke: default wipes (pinned), strict not', () => {
    for (const [n, o] of [['Aetherize', AETHERIZE], ['Perilous Vault', VAULT], ["River's Rebuke", REBUKE]] as const) {
      expect(isBoardWipe(n, o)).toBe(true);
      expect(isBoardWipe(n, o, STRICT)).toBe(false);
    }
  });
  it('charms are removal, not wipes, under strict', () => {
    expect(cats('Rakdos Charm', RAKDOS, 'Instant', 2)).toContain('board_wipe');
    expect(cats('Rakdos Charm', RAKDOS, 'Instant', 2, STRICT)).toEqual(expect.arrayContaining(['removal']));
    expect(cats('Rakdos Charm', RAKDOS, 'Instant', 2, STRICT)).not.toContain('board_wipe');
    expect(cats('Golgari Charm', GOLGARI, 'Instant', 2, STRICT)).toContain('removal');
    expect(cats('Golgari Charm', GOLGARI, 'Instant', 2, STRICT)).not.toContain('board_wipe');
  });
  it('real wipes survive strict: named, destroy-all, damage-each, -2/-2, cheap Disk', () => {
    expect(isBoardWipe('Wrath of God', "Destroy all creatures. They can't be regenerated.", STRICT)).toBe(true);
    expect(isBoardWipe('Toxic Deluge', 'As an additional cost to cast this spell, pay X life.\nAll creatures get -X/-X until end of turn.', STRICT)).toBe(true);
    expect(isBoardWipe('Blasphemous Act', 'This spell costs {1} less to cast for each creature on the battlefield.\nThis spell deals 13 damage to each creature.', STRICT)).toBe(true);
    expect(isBoardWipe('Cower in Fear', 'All creatures get -2/-2 until end of turn.', STRICT)).toBe(true);
    expect(isBoardWipe("Nevinyrral's Disk", "This artifact enters tapped.\n{1}, {T}: Destroy all artifacts, creatures, and enchantments.", STRICT)).toBe(true);
    expect(isBoardWipe('Farewell', 'Choose one or more —\n• Exile all artifacts.\n• Exile all creatures.\n• Exile all enchantments.\n• Exile all graveyards.', STRICT)).toBe(true);
  });
  it('isSymmetricCreatureWipe: symmetric sweepers true, one-sided/non-creature false', () => {
    expect(isSymmetricCreatureWipe('Wrath of God', "Destroy all creatures. They can't be regenerated.")).toBe(true);
    expect(isSymmetricCreatureWipe('Toxic Deluge', 'As an additional cost to cast this spell, pay X life.\nAll creatures get -X/-X until end of turn.')).toBe(true);
    expect(isSymmetricCreatureWipe('Hour of Revelation', 'This spell costs {3} less to cast if there are ten or more nonland permanents on the battlefield.\nDestroy all nonland permanents.')).toBe(true);
    expect(isSymmetricCreatureWipe("In Garruk's Wake", "Destroy all creatures you don't control and all planeswalkers you don't control.")).toBe(false);
    expect(isSymmetricCreatureWipe('Cyclonic Rift', "Return target nonland permanent you don't control to its owner's hand.\nOverload {6}{U}")).toBe(false);
    expect(isSymmetricCreatureWipe('Perilous Vault', VAULT)).toBe(false);
  });
});

describe('strict protection (A-D4) — needs a target object', () => {
  const TOSKI = "This spell can't be countered.\nIndestructible\nToski attacks each combat if able.\nWhenever a creature you control deals combat damage to a player, draw a card.";
  it('Toski: default protection (pinned), strict not', () => {
    expect(cats('Toski, Bearer of Secrets', TOSKI, 'Legendary Creature — Squirrel', 4)).toContain('protection');
    expect(cats('Toski, Bearer of Secrets', TOSKI, 'Legendary Creature — Squirrel', 4, STRICT)).not.toContain('protection');
  });
  it('targeted / you-control protection and counterspells stay protection', () => {
    expect(cats('Tamiyo\'s Safekeeping', 'Target permanent you control gains hexproof and indestructible until end of turn. You gain 2 life.', 'Instant', 1, STRICT)).toContain('protection');
    expect(cats('Wrap in Vigor', 'Creatures you control gain indestructible until end of turn.', 'Instant', 2, STRICT)).toContain('protection');
    expect(cats('Negate', 'Counter target noncreature spell.', 'Instant', 2, STRICT)).toContain('protection');
    expect(cats('Heroic Intervention', 'Permanents you control gain hexproof and indestructible until end of turn.', 'Instant', 2, STRICT)).toContain('protection');
  });
});

describe('strict tutor (A-D4) — general tutors only', () => {
  const FONT = '{T}: Create your choice of a Blood token, a Clue token, or a Food token.\n{3}, {T}, Sacrifice three artifact tokens with different names: Search your library for an artifact card, put it onto the battlefield, then shuffle. Activate only as a sorcery.';
  const REUNION = 'As an additional cost to cast this spell, you may choose a creature type and behold two creatures of that type.\nSearch your library for a creature card with mana value X or less, reveal it, put it into your hand, then shuffle. If this spell\'s additional cost was paid and the revealed card is the chosen type, put that card onto the battlefield instead of putting it into your hand.';
  const RUDE = '(Gain the next level as a sorcery to add its ability.)\nWhenever you attack, you may discard a card. If you do, draw a card.\n{1}{R}: Level 2\nWhenever you discard a card, this Class deals 2 damage to each opponent.\n{1}{R}: Level 3\nWhen this Class becomes level 3, search your library for a card, put it into your hand, shuffle, then discard a card at random.';
  it('Transmutation Font, Celestial Reunion, Cool but Rude: default tutors (pinned), strict not', () => {
    expect(cats('Transmutation Font', FONT, 'Artifact', 5)).toContain('tutor');
    expect(cats('Transmutation Font', FONT, 'Artifact', 5, STRICT)).not.toContain('tutor');
    expect(cats('Celestial Reunion', REUNION, 'Sorcery', 1)).toContain('tutor');
    expect(cats('Celestial Reunion', REUNION, 'Sorcery', 1, STRICT)).not.toContain('tutor');
    expect(cats('Cool but Rude', RUDE, 'Enchantment — Class', 2)).toContain('tutor');
    expect(cats('Cool but Rude', RUDE, 'Enchantment — Class', 2, STRICT)).not.toContain('tutor');
  });
  it('Demonic Tutor, Fauna Shaman, Chord of Calling, Rune-Scarred Demon stay tutors', () => {
    expect(cats('Demonic Tutor', 'Search your library for a card, put that card into your hand, then shuffle.', 'Sorcery', 2, STRICT)).toContain('tutor');
    expect(cats('Fauna Shaman', '{G}, {T}, Discard a creature card: Search your library for a creature card, reveal it, put it into your hand, then shuffle.', 'Creature — Elf Shaman', 2, STRICT)).toContain('tutor');
    expect(cats('Chord of Calling', 'Convoke\nSearch your library for a creature card with mana value X or less, put it onto the battlefield, then shuffle.', 'Instant', 3, STRICT)).toContain('tutor');
    expect(cats('Rune-Scarred Demon', 'Flying\nWhen this creature enters, search your library for a card, put it into your hand, then shuffle.', 'Creature — Demon', 7, STRICT)).toContain('tutor');
  });
});
