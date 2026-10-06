async (page) => {
  const NAME = "Meren of Clan Nel Toth (paper)", CMDR = "Meren of Clan Nel Toth", LIST = "1 Accursed Marauder\n1 Arcane Signet\n1 Assassin's Trophy\n1 Basking Broodscale\n1 Blood Artist\n1 Bloodghast\n1 Blooming Marsh\n1 Bojuka Bog\n1 Braids, Arisen Nightmare\n1 Braids, Cabal Minion\n1 Buried Alive\n1 Butcher of Malakir\n1 Carrion Feeder\n1 Cauldron of Essence\n1 Chthonian Nightmare\n1 Command Tower\n1 Creakwood Liege\n1 Culling Ritual\n1 Deadly Dispute\n1 Elvish Mystic\n1 Emeritus of Woe\n1 Eternal Witness\n1 Exotic Orchard\n1 Fabled Passage\n1 Festering Thicket\n6 Forest\n1 Golgari Charm\n1 Grave Researcher\n1 Gray Merchant of Asphodel\n1 Grim Backwoods\n1 Grim Haruspex\n1 Grim Servant\n1 Haywire Mite\n1 High Market\n1 Infernal Grasp\n1 Jadar, Ghoulcaller of Nephalia\n1 Jarad, Golgari Lich Lord\n1 Junji, the Midnight Sky\n1 Lightning Greaves\n1 Liliana, Dreadhorde General\n1 Llanowar Elves\n1 Llanowar Wastes\n1 Long Feng, Grand Secretariat\n1 Massacre Wurm\n1 Mazirek, Kraul Death Priest\n1 Midnight Reaper\n1 Mikaeus, the Unhallowed\n1 Moldervine Reclamation\n1 Morbid Opportunist\n1 Myriad Landscape\n1 Necroblossom Snarl\n1 Ophiomancer\n1 Path of Ancestry\n1 Plaguecrafter\n1 Priest of Forgotten Gods\n1 Ramunap Excavator\n1 Ravenous Chupacabra\n1 Reanimate\n1 Revitalizing Repast\n1 Rune-Scarred Demon\n1 Sakura-Tribe Elder\n1 Saw in Half\n1 Sol Ring\n1 Solemn Simulacrum\n1 Springbloom Druid\n11 Swamp\n1 Syr Konrad, the Grim\n1 Talisman of Resilience\n1 Temple of Malady\n1 The Gitrog, Ravenous Ride\n1 Toxic Deluge\n1 Turbulent Fen\n1 Twilight Mire\n1 Veil of Summer\n1 Vernal Fen\n1 Victimize\n1 Village Rites\n1 Viridescent Bog\n1 Viscera Seer\n1 Wight of the Reliquary\n1 Woe Strider\n1 Woodland Cemetery\n1 Yahenni, Undying Partisan\n1 Zulaport Cutthroat";
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
