import { autoBuildDeck, buildScoredCandidatePool, applyDeadCardPass } from "@/lib/deck-builder-ai";
import { getDb } from "@/lib/db";
import { isTribeCreature } from "@/lib/card-relevance";
import { deriveCondition, planReport } from "@/lib/deck-gate-plan";
import * as oldPlan from "./old-deck-gate-plan";
import { classifyBracket, bracketOffenseCategory } from "@/lib/bracket";
import { classifyCard, getPrimaryCategory } from "@/lib/card-classifier";
import type { DbCard } from "@/lib/types";
const db = getDb();
const mode = process.argv[2];
const isLand = (c: DbCard) => (c.type_line || "").includes("Land");
const BASICS = new Set(["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"]);
const owned1 = new Set((db.prepare("SELECT DISTINCT c.name FROM collection col JOIN cards c ON c.id=col.card_id WHERE col.user_id=1").all() as any[]).map((r) => r.name));
const sum = (cs: any[], f: (c: any) => boolean) => cs.filter(f).reduce((s, c) => s + c.quantity, 0);
function summary(tag: string, r: any, tribe?: string) {
  const main = r.cards.filter((c: any) => c.board === "main");
  const t = tribe ? main.filter((c: any) => isTribeCreature(c.card, tribe)) : [];
  console.log(`## ${tag}: main=${sum(main, () => true)} lands=${sum(main, (c) => isLand(c.card))} basics=${sum(main, (c) => BASICS.has(c.card.name))} strategy=${r.strategy} tribe=${t.length} dead=${JSON.stringify(r.deadCardsReplaced)}`);
  const roles: Record<string, number> = {};
  for (const c of main) if (!isLand(c.card)) { const k = getPrimaryCategory(classifyCard(c.card.name, c.card.oracle_text || "", c.card.type_line || "", c.card.cmc || 0)); roles[k] = (roles[k] || 0) + 1; }
  console.log("  roles", JSON.stringify(roles));
  return { main, t };
}
async function main() {
  if (mode === "build") {
    const k = await autoBuildDeck({ format: "commander", colors: [], commanderName: "Krenko, Mob Boss", useCollection: true, userId: 1 } as any);
    const { main: km } = summary("krenko-coll-u1", k, "goblin");
    const leak = km.filter((c: any) => !BASICS.has(c.card.name) && !owned1.has(c.card.name)).map((c: any) => c.card.name + (isLand(c.card) ? "[L]" : ""));
    console.log("  NOT owned by user1:", leak.length, leak.join("; "));
    const a = await autoBuildDeck({ format: "commander", colors: [], commanderName: "Ayula, Queen Among Bears" } as any);
    const { t } = summary("ayula-nocoll", a, "bear");
    console.log("  bears:", t.map((c: any) => `${c.card.name}(${c.card.edhrec_rank ?? "NULL"})`).join("; "));
  } else if (mode === "gate") {
    for (const name of ["Talrand, Sky Summoner", "Ezuri, Claw of Progress", "Korvold, Fae-Cursed King", "Meren of Clan Nel Toth", "Teysa Karlov", "Edgar Markov", "Aeve, Progenitor Ooze", "Sram, Senior Edificer", "Goreclaw, Terror of Qal Sisma"]) {
      const cmd = db.prepare("SELECT * FROM cards WHERE name=?").get(name) as DbCard;
      const ci = JSON.parse(cmd.color_identity || "[]");
      const nc = deriveCondition(cmd.oracle_text || "", cmd.type_line || "", ci, cmd.mana_cost);
      const oc = oldPlan.deriveCondition(cmd.oracle_text || "", cmd.type_line || "", ci, cmd.mana_cost);
      const r = await autoBuildDeck({ format: "commander", colors: [], commanderName: name } as any);
      const pc = r.cards.filter((c: any) => c.board === "main").map((c: any) => ({ name: c.card.name, cmc: c.card.cmc || 0, typeLine: c.card.type_line || "", oracleText: c.card.oracle_text || "", quantity: c.quantity }));
      const np = planReport(pc, nc); const op = oldPlan.planReport(pc as any, oc);
      const eg = nc.threshold !== null || !!nc.requires;
      const ns = np.ratio < .4 || (eg && np.enablerRatio < .35) ? "fail" : np.ratio < .55 || (eg && np.enablerRatio < .5) ? "warn" : "pass";
      const os = op.ratio < .4 || op.enablerRatio < .35 ? "fail" : op.ratio < .55 || op.enablerRatio < .5 ? "warn" : "pass";
      console.log(`${name}: tribal=${nc.tribalType} req=${nc.requires} thr=${nc.threshold} | new ratio ${np.ratio.toFixed(2)} en ${np.enablerRatio.toFixed(2)} -> ${ns} | old ratio ${op.ratio.toFixed(2)} en ${op.enablerRatio.toFixed(2)} -> ${os}`);
    }
    const leg = db.prepare("SELECT name, oracle_text, type_line, color_identity, mana_cost FROM cards WHERE type_line LIKE ? AND oracle_text LIKE ?").all("Legendary Creature%", "%for each%you control%") as any[];
    const hits: Record<string, string[]> = {};
    for (const c of leg) { const t = deriveCondition(c.oracle_text, c.type_line, JSON.parse(c.color_identity || "[]"), c.mana_cost).tribalType; if (t) (hits[t] ||= []).push(c.name); }
    console.log("tribalType values:", Object.entries(hits).map(([k, v]) => `${k}=${v.length}(${v.slice(0, 2).join("/")})`).join(", "));
  } else if (mode === "dead") {
    const opts = { format: "commander", colors: [], commanderName: "Krenko, Mob Boss", bracket: 3 } as any;
    const r = await autoBuildDeck(opts);
    const pool = (await buildScoredCandidatePool(opts)).pool as any[];
    const get = (n: string) => db.prepare("SELECT * FROM cards WHERE name=?").get(n) as DbCard;
    const deck = r.cards.map((c: any) => ({ ...c }));
    const nonland = deck.map((c: any, i: number) => [c, i] as const).filter(([c]) => c.board === "main" && !isLand(c.card));
    const inject = ["Kozilek\u0027s Command", "Chromatic Lantern", "Courier of Comestibles", "Diabolic Tutor", "Gamble"].map(get).filter(Boolean);
    inject.forEach((card, j) => { deck[nonland[j][1]] = { card, quantity: 1, board: "main" }; });
    const cnt = (cs: any[]) => [sum(cs.filter((c) => c.board === "main"), () => true), sum(cs.filter((c) => c.board === "main"), (c) => isLand(c.card))];
    const cmdOracle = r.cards.find((c: any) => c.board === "commander")?.card.oracle_text;
    const o1 = applyDeadCardPass(deck, pool, ["R"], cmdOracle ?? undefined);
    const o3 = applyDeadCardPass(deck, pool, ["R"], cmdOracle ?? undefined);
    console.log("before [main,lands]", cnt(deck), "after", cnt(o1.cards), "deterministic", JSON.stringify(o1) === JSON.stringify(o3));
    console.log("swaps", JSON.stringify(o1.replacedAsDead));
    console.log("offense category of swaps-in:", o1.replacedAsDead.map((s) => `${s.in}:${bracketOffenseCategory(get(s.in) as any)}`).join(", "));
    const cls = (cs: any[]) => classifyBracket(cs.filter((c) => c.board === "main").map((c) => c.card), { commanderNames: ["Krenko, Mob Boss"] }).bracket;
    console.log("reported bracket", JSON.stringify({ t: r.bracket?.target, res: r.bracket?.result }), "recomputed final", cls(r.cards), "injected deck", cls(deck), "after pass", cls(o1.cards));
    const oc = applyDeadCardPass(deck, pool, ["R"], cmdOracle ?? undefined, (c) => owned1.has(c.name) || BASICS.has(c.name));
    console.log("canPick owned-only: swaps-in all owned:", oc.replacedAsDead.every((s) => owned1.has(s.in)), JSON.stringify(oc.replacedAsDead.map((s) => s.in)));
  }
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
