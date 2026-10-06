async (page) => {
  const NAME = "Imotekh the Stormlord (paper)", CMDR = "Imotekh the Stormlord", LIST = "1 Anrakyr the Traveller\n1 Arcane Signet\n1 Archenemy's Charm\n1 Ashnod's Altar\n1 Biotransference\n1 Bitter Triumph\n1 Black Sun's Twilight\n1 Buried Alive\n1 Canoptek Wraith\n1 Chronomancer\n1 Crypt Ghast\n1 Crypt of Agadeem\n1 Cryptek\n1 Culling the Weak\n1 Dark Ritual\n1 Deadly Dispute\n1 Decorum Dissertation\n1 Dismember\n1 Dread Return\n1 Feed the Swarm\n1 Flayed One\n1 Foundry Inspector\n1 Ghost Ark\n1 Gilded Lotus\n1 Illuminor Szeras\n1 Imp's Mischief\n1 Insatiable Avarice\n1 Liliana the Repentant\n1 Lively Dirge\n1 Lokhust Heavy Destroyer\n1 Lychguard\n1 Marionette Apprentice\n1 Marionette Master\n1 Metalwork Colossus\n1 Mirkwood Bats\n1 Mortuary Mire\n1 Myr Retriever\n1 Myriad Landscape\n1 Necron Deathmark\n1 Necron Overlord\n1 Ominous Harvest\n1 Phyrexian Arena\n1 Phyrexian Scriptures\n1 Pitiless Carnage\n1 Plasmancer\n1 Portal to Phyrexia\n1 Psychomancer\n1 Reanimate\n1 Ripples of Undeath\n1 Royal Warden\n1 Skorpekh Lord\n1 Sol Ring\n1 Solemn Simulacrum\n32 Swamp\n1 Syr Konrad, the Grim\n1 Szarekh, the Silent King\n1 Technomancer\n1 The Darkness Crystal\n1 The Soul Stone\n1 The War in Heaven\n1 Their Name Is Death\n1 Their Number Is Legion\n1 Thought Vessel\n1 Trazyn the Infinite\n1 Triarch Praetorian\n1 Umbral Collar Zealot\n1 Wayfarer's Bauble\n1 Wishclaw Talisman";
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
