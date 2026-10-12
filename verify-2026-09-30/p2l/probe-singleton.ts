export {};
async function main() {
  const { buildOptimalLandBase } = await import('../../src/lib/land-intelligence');
  const r = buildOptimalLandBase({ colors: ['U', 'B'], format: 'commander', targetLandCount: 34, isCommander: true, singletonBasics: true });
  console.log(JSON.stringify(r.basicDistribution), 'nonbasic', r.totalNonBasic, r.lands.map((l) => l.card.name).join(', '));
}
main();
