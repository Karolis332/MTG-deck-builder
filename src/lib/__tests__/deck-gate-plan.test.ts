import { describe, it, expect } from 'vitest';
import { deriveCondition, satisfiesCondition, interacts, planReport, type PlanCard } from '../deck-gate-plan';

/** Aeve, Progenitor Ooze — "for each other Ooze you control" tribal-count clause. */
const AEVE_TEXT =
  "Aeve, Progenitor Ooze enters the battlefield with a +1/+1 counter on it for each other Ooze you control.\n" +
  'Storm (When you cast this spell, copy it for each spell cast before it this turn. You may choose new targets for the copies.)\n' +
  'Whenever Aeve, Progenitor Ooze enters the battlefield or attacks, create a 1/1 green Ooze creature token.';

describe('deriveCondition — creature-type-count commanders', () => {
  const condition = deriveCondition(AEVE_TEXT, 'Legendary Creature — Ooze', ['G']);

  it('extracts the tribal type instead of falling back to "general value"', () => {
    expect(condition.tribalType).toBe('Ooze');
    expect(condition.description).toBe('commander wants: Ooze creatures');
  });

  it('does not mistake a generic collective noun for a creature type', () => {
    const c = deriveCondition('Whenever a creature you control dies, draw a card.', 'Legendary Creature — Human', ['B']);
    expect(c.tribalType).toBeNull();
  });

  const oozeCard: PlanCard = { name: 'Slime Molds', cmc: 2, typeLine: 'Creature — Ooze', oracleText: '', quantity: 1 };
  const changelingCard: PlanCard = {
    name: 'Mistform Ultimus',
    cmc: 5,
    typeLine: 'Creature — Shapeshifter',
    oracleText: 'Changeling (This card is every creature type.)',
    quantity: 1,
  };
  const tokenMaker: PlanCard = {
    name: 'Slime Against Humanity',
    cmc: 3,
    typeLine: 'Sorcery',
    oracleText: 'Create three 1/1 green Ooze creature tokens.',
    quantity: 1,
  };
  const irrelevant: PlanCard = { name: 'Lightning Bolt', cmc: 1, typeLine: 'Instant', oracleText: 'Deal 3 damage.', quantity: 1 };

  it('an Ooze creature satisfies the condition', () => {
    expect(satisfiesCondition(oozeCard, condition)).toBe(true);
  });

  it('a changeling counts as every creature type', () => {
    expect(satisfiesCondition(changelingCard, condition)).toBe(true);
  });

  it('a card that creates Ooze tokens interacts', () => {
    expect(interacts(tokenMaker, condition)).toBe(true);
  });

  it('an unrelated card does not interact', () => {
    expect(interacts(irrelevant, condition)).toBe(false);
  });

  it('planReport scores a real Ooze-tribal list high and a generic-value list low', () => {
    const tribalList = [oozeCard, changelingCard, tokenMaker, oozeCard];
    const genericList = [irrelevant, irrelevant, irrelevant];
    expect(planReport(tribalList, condition).ratio).toBe(1);
    expect(planReport(genericList, condition).ratio).toBe(0);
  });
});
