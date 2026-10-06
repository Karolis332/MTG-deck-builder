async (page) => {
  const NAME = "The Cabbage Merchant (paper)", CMDR = "The Cabbage Merchant", LIST = "1 Academy Manufactor\n1 Arachnogenesis\n1 Archdruid's Charm\n1 Ash Barrens\n1 Autumn's Veil\n1 Ba Sing Se\n1 Brawn\n1 Bridgeworks Battle\n1 Bumi's Feast Lecture\n1 Chord of Calling\n1 Cultivate\n1 Disciple of Freyalise\n1 Displaced Dinosaurs\n1 Elvish Mystic\n1 Emerald Medallion\n1 Emil, Vastlands Roamer\n1 Endurance\n1 Escape Tunnel\n1 Eternal Witness\n1 Feasting Hobbit\n1 Feasting Troll King\n1 Force of Vigor\n27 Forest\n1 Garruk's Uprising\n1 Ghalta the Unstoppable\n1 Giant Opportunity\n1 Gilded Goose\n1 Ginger, Queen of Sweets\n1 Gingerbread Cabin\n1 Greenhouse Propagator\n1 Halsin, Emerald Archdruid\n1 Hornet Queen\n1 Hungering Puppetbeast\n1 Idol of Oblivion\n1 Invasion of Ikoria\n1 Jaheira, Friend of the Forest\n1 Jiang Yanggu, Never Alone\n1 Kenrith's Transformation\n1 Kodama's Reach\n1 Llanowar Elves\n1 Many Partings\n1 Mosswort Bridge\n1 Nesting Grounds\n1 Night of the Sweets' Revenge\n1 Ohran Frostfang\n1 Peregrin Took\n1 Pest Infestation\n1 Return of the Wildspeaker\n1 Ribtruss Roaster\n1 Sarinth Steelseeker\n1 Second Harvest\n1 Seedborn Muse\n1 Snakeskin Veil\n1 Spider-Ham, Peter Porker\n1 Spore Frog\n1 Spry and Mighty\n1 Syr Ginger, the Meal Ender\n1 Teething Wurmlet\n1 The Earth King\n1 The Ooze\n1 Tireless Provisioner\n1 Titanbones, Towering Heart\n1 Toski, Bearer of Secrets\n1 Tough Cookie\n1 Trail of Crumbs\n1 Transmutation Font\n1 Trudge Garden\n1 Unlucky Cabbage Merchant\n1 Verdant Kraken\n1 Walking Ballista\n1 Wicked Wolf\n1 Wild Growth";
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
