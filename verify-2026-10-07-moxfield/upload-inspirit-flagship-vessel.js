async (page) => {
  const NAME = "Inspirit, Flagship Vessel (paper)", CMDR = "Inspirit, Flagship Vessel", LIST = "1 Abrade\n1 Adarkar Wastes\n1 Alibou, Ancient Witness\n1 All That Glitters\n1 Ancient Den\n1 Arcane Signet\n1 Archway of Innovation\n1 Battlefield Forge\n1 Blade Historian\n1 Boros Charm\n1 Bygone Colossus\n1 Cascade Bluffs\n1 Chandra, Spark Hunter\n1 Chaos Warp\n1 Clifftop Retreat\n1 Command Tower\n1 Counterspell\n1 Craterclaw Colossus\n1 Cyberdrive Awakener\n1 Cyclonic Rift\n1 Deepglow Skate\n1 Depthshaker Titan\n1 Dispatch\n1 Empowered Autogenerator\n1 Enthusiastic Mechanaut\n1 Etherium Sculptor\n1 Everflowing Chalice\n1 Exotic Orchard\n1 Fabled Passage\n1 Fact or Fiction\n1 Fellwar Stone\n1 Final Showdown\n1 Gavel of the Righteous\n1 Generous Gift\n1 Glacial Fortress\n1 Great Furnace\n1 Improvised Arsenal\n1 Insight Engine\n1 Inspiring Vantage\n1 Inventors' Fair\n1 Iron Spider, Stark Upgrade\n1 Irrigated Farmland\n4 Island\n1 Jhoira, Weatherlight Captain\n1 Karn's Bastion\n1 Kilo, Apogee Mind\n1 Lasting Tarfire\n1 Lost Jitte\n1 Lux Artillery\n1 Lux Cannon\n2 Mountain\n1 Mystic Monastery\n1 Nyx Lotus\n1 One Last Job\n1 Ornithopter of Paradise\n1 Panharmonicon\n1 Path of Ancestry\n1 Pentad Prism\n1 Phyrexian Metamorph\n1 Plains\n1 Radiant Summit\n1 Rapid Hybridization\n1 Razortide Bridge\n1 Repurposing Bay\n1 Ripples of Potential\n1 Rugged Prairie\n1 Rustvale Bridge\n1 Sacred Foundry\n1 Seat of the Synod\n1 Shivan Reef\n1 Silverbluff Bridge\n1 Skycloud Expanse\n1 Sol Ring\n1 Spire of Industry\n1 Steel Overseer\n1 Steelswarm Operator\n1 Sulfur Falls\n1 Surge Conductor\n1 Swan Song\n1 Swords to Plowshares\n1 Tekuthal, Inquiry Dominus\n1 Temple of Enlightenment\n1 Temple of Epiphany\n1 Tezzeret, Cruel Captain\n1 Thirst for Knowledge\n1 Thought Monitor\n1 Three Steps Ahead\n1 Threefold Thunderhulk\n1 Traxos, Scourge of Kroog\n1 Universal Surveillance\n1 Emry, Lurker of the Loch\n1 Uthros Research Craft\n1 Uthros, Titanic Godcore\n1 Voyage Home\n1 Zookeeper Mechan";
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
