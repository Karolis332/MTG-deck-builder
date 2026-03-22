/**
 * End-to-end test: deck builder → CF API integration.
 * Simulates what ai-suggest/route.ts does when called for a Commander deck.
 */

const CF_API_URL = 'http://localhost:8000';

async function main() {
  console.log('=== CF API Integration Test ===\n');

  // 1. Health check
  console.log('[1/4] Health check...');
  const healthResp = await fetch(`${CF_API_URL}/health`);
  const health = await healthResp.json();
  console.log(`  Status: ${health.status}`);
  console.log(`  Model: ${health.model_version}`);
  console.log(`  Decks: ${health.deck_count}`);

  if (health.model_version === 'untrained') {
    console.log('\nFAIL: Models not loaded!');
    process.exit(1);
  }

  // 2. Test /recommend (mimics getCFRecommendations)
  console.log('\n[2/4] POST /recommend (Muldrotha deck)...');
  const recResp = await fetch(`${CF_API_URL}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cards: [
        'Sol Ring', 'Arcane Signet', 'Command Tower', 'Counterspell',
        'Cyclonic Rift', 'Demonic Tutor', 'Beast Within', 'Cultivate',
        'Rampant Growth', 'Mulldrifter', 'Eternal Witness',
        'Sakura-Tribe Elder', 'Birds of Paradise', 'Spore Frog',
        'Seal of Primordium',
      ],
      commander: 'Muldrotha, the Gravetide',
      limit: 10,
    }),
  });
  const recData = await recResp.json();
  console.log(`  Color identity: ${recData.color_identity}`);
  console.log(`  Recommendations: ${recData.recommendations.length}`);
  for (const r of recData.recommendations.slice(0, 5)) {
    console.log(`    ${r.card_name}: score=${r.cf_score}, decks=${r.similar_deck_count}`);
  }

  // 3. Test /recommend with Zur (WUB)
  console.log('\n[3/4] POST /recommend (Zur deck)...');
  const zurResp = await fetch(`${CF_API_URL}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cards: [
        'Sol Ring', 'Arcane Signet', 'Command Tower', 'Swords to Plowshares',
        'Counterspell', 'Rhystic Study', 'Demonic Tutor', 'Necropotence',
        'All That Glitters', 'Vanishing',
      ],
      commander: 'Zur the Enchanter',
      limit: 10,
    }),
  });
  const zurData = await zurResp.json();
  console.log(`  Color identity: ${zurData.color_identity}`);
  console.log(`  Recommendations: ${zurData.recommendations.length}`);
  for (const r of zurData.recommendations.slice(0, 5)) {
    console.log(`    ${r.card_name}: score=${r.cf_score}, decks=${r.similar_deck_count}`);
  }

  // 4. Test /similar-decks
  console.log('\n[4/4] POST /similar-decks (Korvold deck)...');
  const simResp = await fetch(`${CF_API_URL}/similar-decks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cards: [
        'Sol Ring', 'Chaos Warp', 'Blasphemous Act', 'Demonic Tutor',
        'Beast Within', 'Cultivate', 'Tireless Tracker', 'Awakening Zone',
      ],
      commander: 'Korvold, Fae-Cursed King',
      limit: 5,
    }),
  });
  const simData = await simResp.json();
  console.log(`  Similar decks: ${simData.similar_decks.length}`);
  for (const d of simData.similar_decks) {
    console.log(`    ${d.deck_name}: similarity=${d.similarity}`);
  }

  // Verdict
  console.log('\n=== Results ===');
  const pass1 = recData.recommendations.length > 0;
  const pass2 = zurData.recommendations.length > 0;
  const pass3 = simData.similar_decks.length > 0;
  console.log(`  Muldrotha recs: ${pass1 ? 'PASS' : 'FAIL'} (${recData.recommendations.length})`);
  console.log(`  Zur recs:       ${pass2 ? 'PASS' : 'FAIL'} (${zurData.recommendations.length})`);
  console.log(`  Similar decks:  ${pass3 ? 'PASS' : 'FAIL'} (${simData.similar_decks.length})`);

  if (pass1 && pass2 && pass3) {
    console.log('\n  ALL TESTS PASSED — CF engine is functional!');
  } else {
    console.log('\n  SOME TESTS FAILED');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
