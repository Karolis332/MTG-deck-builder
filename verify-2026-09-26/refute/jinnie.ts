import { autoBuildDeck } from "@/lib/deck-builder-ai";
import { isTribeCreature } from "@/lib/card-relevance";
import { classifyCard, getPrimaryCategory } from "@/lib/card-classifier";
async function run(name: string, tribe: string) {
  const r = await autoBuildDeck({ format: "commander", colors: [], commanderName: name } as any);
  const main = r.cards.filter((c: any) => c.board === "main");
  const land = (c: any) => (c.card.type_line || "").includes("Land");
  const t = main.filter((c: any) => isTribeCreature(c.card, tribe));
  const roles: Record<string, number> = {};
  for (const c of main) if (!land(c)) { const k = getPrimaryCategory(classifyCard(c.card.name, c.card.oracle_text || "", c.card.type_line || "", c.card.cmc || 0)); roles[k] = (roles[k] || 0) + 1; }
  console.log(`## ${name}: size ${main.reduce((s: number, c: any) => s + c.quantity, 0)} lands ${main.filter(land).reduce((s: number, c: any) => s + c.quantity, 0)} strategy ${r.strategy} ${tribe} ${t.length} roles ${JSON.stringify(roles)}`);
  console.log("   weakest:", t.map((c: any) => [c.card.name, c.card.edhrec_rank ?? 99999] as const).sort((a, b) => b[1] - a[1]).slice(0, 10).map((x) => x.join("#")).join("; "));
}
(async () => { await run("Jinnie Fay, Jetmir\u0027s Second", "cat"); await run("Darien, King of Kjeldor", "soldier"); process.exit(0); })();
