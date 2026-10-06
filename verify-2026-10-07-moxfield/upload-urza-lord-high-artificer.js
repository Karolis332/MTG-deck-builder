async (page) => {
  const NAME = "Urza, Lord High Artificer (paper draft)", CMDR = "Urza, Lord High Artificer", LIST = "1 Traxos, Scourge of Kroog\n1 River's Rebuke\n1 Deduce\n1 Bane's Contingency\n1 Sai, Master Thopterist\n1 Efficient Construction\n1 Chrome Host Seedshark\n1 Worldwalker Helm\n1 Kappa Cannoneer\n1 Filigree Attendant\n1 Whirler Rogue\n1 Glaring Fleshraker\n1 Hangarback Walker\n1 Flesh Duplicate\n1 Bident of Thassa\n1 Unstoppable Plan\n1 Waterbending Scroll\n1 Planetarium of Wan Shi Tong\n1 Golem Foundry\n1 Super State\n1 Rite of Replication\n1 Sun Quan, Lord of Wu\n1 Soul of New Phyrexia\n1 Arcane Signet\n1 Sky Diamond\n1 Sapphire Medallion\n1 Noble's Purse\n1 Commander's Sphere\n1 Palladium Myr\n1 Thran Dynamo\n1 Cloud Key\n1 Solemn Simulacrum\n1 Worn Powerstone\n1 Bender's Waterskin\n1 The Echoverse Fulcrum\n1 Padeem, Consul of Innovation\n1 April O'Neil, Hacktivist\n1 Cryogen Relic\n1 Soul-Guide Lantern\n1 Cerebral Download\n1 Pull from Tomorrow\n1 Wan Shi Tong, Librarian\n1 Thought Monitor\n1 Pensive Professor\n1 The Legend of Kuruk\n1 Counterspell\n1 Negate\n1 Flare of Denial\n1 Strix Serenade\n1 Katara's Reversal\n1 You Find the Villains' Lair\n1 Resculpt\n1 Volatile Stormdrake\n1 Sink into Stupor\n1 Stock Up\n1 Curse of the Swine\n1 Zuko's Exile\n1 Meteor Golem\n1 Tractor Beam\n1 Ember Island Production\n1 Ghostly Flicker\n1 Scour for Scrap\n1 Geist of Saint Thalia\n1 Karn, the Great Creator\n1 Seat of the Synod\n1 Agna Qel'a\n1 Buried Ruin\n1 The Mycosynth Gardens\n1 Secluded Starforge\n30 Island";
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
