async (page) => {
  const NAME = "Tam, the Possibility (paper)", CMDR = "Tam, the Possibility", LIST = "1 Ajani Resolute\n1 Ajani Unrelenting\n1 Anguished Unmaking\n1 Arcane Signet\n1 Archangel of Tithes\n1 Assassin's Trophy\n1 Atomize\n1 Avatar of Burgeoning Echoes\n1 Bleachbone Verge\n1 Bloom Tender\n1 Breeding Pool\n1 Caves of Koilos\n1 Chandra, Awakened Inferno\n1 Chandra, Torch of Defiance\n1 Chimil, the Inner Sun\n1 Cinder Glade\n1 Clifftop Retreat\n1 Command Tower\n1 Counterspell\n1 Dedicated Commons\n1 Deserted Beach\n1 Dovin's Veto\n1 Dragonskull Summit\n1 Elspeth, Sun's Champion\n1 Entrust the Spark\n1 Erode\n1 Esika, God of the Tree\n1 Evolution Sage\n1 Exotic Orchard\n1 Faeburrow Elder\n1 Fatehold Annex\n1 Final Act\n1 Flux Channeler\n1 Fumigate\n1 Geist of Saint Thalia\n1 Great Divide Guide\n1 Great Hall of the Citadel\n1 Innovative Commons\n1 Interplanar Beacon\n2 Island\n1 Jace, Memory Adept\n1 Jace, Reality Sculptor\n1 Kaito, Dancing Shadow\n1 Kaya, Intangible Slayer\n1 Kaya's Ghostform\n1 Kiora of Salt and Sand\n1 Liliana the Faultless\n1 Mana Confluence\n1 Mountain\n1 Nexus Mentality\n1 Nissa, Steward of Elements\n1 Nomad Outpost\n1 Ob Nixilis of the Black Oath\n1 Ob Nixilis, the Hate-Twisted\n1 Oko, Thief of Crowns\n1 Opulent Palace\n1 Overgrown Farmland\n1 Path to Exile\n1 Pia, Aether Ascetic\n1 Professor Dellian Fel\n1 Quintorius Kand\n1 Ral Zarek\n1 Rootbound Crag\n1 Saheeli, Sublime Artificer\n1 Sandsteppe Citadel\n1 Sarkhan the Masterless\n1 Savage Lands\n1 Seachrome Coast\n1 Seaside Citadel\n1 Settle the Wreckage\n1 Shipwreck Marsh\n1 Shivan Reef\n1 Sol Ring\n1 Sorin, Vengeful Bloodlord\n1 Stingerquill Annex\n1 Sylvan Library\n1 Talisman of Conviction\n1 Talisman of Dominance\n1 Talisman of Progress\n1 Tezzeret, Master of the Bridge\n1 Theorix Annex\n1 Thrummingbird\n1 Timeless Lotus\n1 Toxic Deluge\n1 Turbulent Moor\n1 Turbulent Wilderness\n1 Uro, Titan of Nature's Wrath\n1 Vigorbloom Annex\n1 Vigorbloom Charm\n1 Vraska, Betrayal's Sting\n1 Way of the Healer\n1 Way of the Mentor\n1 Way of the Mind Sculptor\n1 Way of the Paradox\n1 Way of the Pyromancer\n1 Way of the Warlord\n1 Way of the Wildspeaker\n1 Yavimaya Coast";
  await page.goto('https://moxfield.com/decks/personal');
  await page.getByText('New Deck', { exact: true }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('textbox', { name: 'Name' }).fill(NAME);
  const cb = dlg.getByRole('combobox', { name: 'Commander' });
  await cb.click();
  await cb.pressSequentially(CMDR, { delay: 20 });
  const opt = page.getByRole('option', { name: CMDR, exact: true }).first();
  await opt.waitFor({ timeout: 15000 });
  await opt.click({ timeout: 5000 }).catch(() => opt.evaluate(o => o.click()));
  const priv = dlg.getByRole('radio', { name: 'Private' });
  for (let i = 0; i < 4 && !(await priv.isVisible()); i++) { await dlg.locator('summary').click(); await page.waitForTimeout(800); }
  await priv.check();
  await dlg.getByRole('radio', { name: 'Paste in List' }).check();
  await dlg.locator('textarea').fill(LIST);
  await dlg.getByRole('button', { name: 'Create' }).evaluate(b => b.click());
  await page.waitForURL(u => /\/decks\/[A-Za-z0-9_-]{10,}/.test(u.toString()), { timeout: 45000 });
  await page.waitForTimeout(4000);
  const body = await page.locator('body').innerText();
  const main = body.match(/(\d+)\s+main deck/i);
  return { url: page.url(), name: NAME, main: main ? main[1] : null, noCommanderWarning: /without a Commander/i.test(body), private: /PRIVATE/.test(body) };
}
